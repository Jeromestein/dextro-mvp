import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { requirePrincipal } from '../src/server/auth/principal';
import { owned } from '../src/server/storage/http';
import type { StoredStory } from '../src/modules/storage/model';
const owner='8dc1ba9a-adf2-48ff-8dec-c0b4152e326a';
const example:StoredStory={title:'Saved story',description:'',genre:'Adventure',document:{startId:'start',passages:[{id:'start',title:'The beginning',text:'Hello',ending:true,choices:[],media:{imageId:'',audioId:''}}],assets:[]}};
async function database(){const db=new PGlite();await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);await db.exec(await readFile(new URL('../supabase/migrations/202610060001_cloud_storage.sql',import.meta.url),'utf8'));return db;}
test('cloud SQL preserves revisions, rejects conflicting saves and protects ownership',async()=>{
 const db=await database();try{
 const mutation=randomUUID();const save=(base:number,key=mutation,story=example)=>db.query<{result:{revision:number}}>('select public.dextro_save_story($1,$2,$3,$4,$5,$6::jsonb) as result',[owner,'story-1',base,key,JSON.stringify(story),JSON.stringify(story)]);
 assert.equal((await save(0)).rows[0].result.revision,1);
 assert.equal((await save(0)).rows[0].result.revision,1,'lost response can replay');
 await assert.rejects(save(0,randomUUID()),/REVISION_CONFLICT/);
 await assert.rejects(save(1,mutation,{...example,title:'Different'}),/IDEMPOTENCY_CONFLICT/);
 assert.equal((await save(1,randomUUID())).rows[0].result.revision,2);
 const other=randomUUID(),asset=randomUUID();await db.query("insert into app_users(id,kind) values($1,'internal')",[other]);
 await db.query("insert into media_assets(id,owner_id,kind,source,state,name,mime_type,byte_size,sha256,object_key) values($1,$2,'image','upload','ready','Private image','image/png',8,$3,'other/image')",[asset,other,'a'.repeat(64)]);
 const stolen={...example,document:{...example.document,assets:[{id:'image',assetId:asset,name:'Stolen',credit:''}]}};
 await assert.rejects(save(2,randomUUID(),stolen),/ASSET_NOT_OWNED_OR_READY/);
 assert.equal((await db.query<{count:number}>('select count(*)::int as count from story_versions')).rows[0].count,2);
 await db.exec('set role anon');await assert.rejects(db.query('select * from stories'),/permission denied/);
 await assert.rejects(db.query('select public.dextro_save_story($1,$2,0,$3,$4,$5::jsonb)',[owner,'forged',randomUUID(),'x',JSON.stringify(example)]),/permission denied/);
 await db.exec('reset role');
 const tables=await db.query<{relrowsecurity:boolean}>("select relrowsecurity from pg_class where relname in ('app_users','stories','media_assets','story_versions','story_asset_refs','generation_jobs','generation_attempts')");assert.equal(tables.rows.length,7);assert.ok(tables.rows.every(r=>r.relrowsecurity));
 }finally{await db.close();}
});
test('persistent provider claims never repeat a paid attempt, and enforce daily limits',async()=>{
 const db=await database();try{
 const id=randomUUID();await db.query("insert into generation_jobs(id,owner_id,kind,idempotency_key,request_hash,input) values($1,$2,'image',$3,'hash','{}')",[id,owner,randomUUID()]);
 const claim=()=>db.query<{result:{claimed:boolean;id:string}}>("select dextro_claim_attempt($1,$2,1,'test-model','{}',1,2) as result",[owner,id]);
 const first=(await claim()).rows[0].result;assert.equal(first.claimed,true);
 const replay=(await claim()).rows[0].result;assert.equal(replay.claimed,false);assert.equal(replay.id,first.id);
 const next=randomUUID();await db.query("insert into generation_jobs(id,owner_id,kind,idempotency_key,request_hash,input) values($1,$2,'image',$3,'hash','{}')",[next,owner,randomUUID()]);
 await assert.rejects(db.query("select dextro_claim_attempt($1,$2,1,'test-model','{}',1,2)",[owner,next]),/DAILY_LIMIT/);
 }finally{await db.close();}
});
test('shared cloud workspace supports deployed requests and retains server ownership and origin checks',async t=>{
 const saved={...process.env};t.after(()=>{for(const key of ['STORAGE_MODE','INTERNAL_TEST_OWNER_ID','NODE_ENV']){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}});
 Object.assign(process.env,{STORAGE_MODE:'supabase',INTERNAL_TEST_OWNER_ID:owner});
 for(const mode of ['development','production']){
  Object.assign(process.env,{NODE_ENV:mode});
  for(const origin of ['http://localhost:3100','http://127.0.0.1:3100','https://dextro-mvp.vercel.app','https://preview.example']){
   for(const method of ['GET','POST','PUT','DELETE']){
    const request=new Request(`${origin}/api/stories?ownerId=${randomUUID()}`,{method,headers:{Origin:origin,'x-owner-id':randomUUID()}});
    const response=await owned(request,async principal=>Response.json(principal));
    assert.equal(response.status,200,`${mode} ${method} ${origin}`);
    assert.deepEqual(await response.json(),{ownerId:owner});
   }
  }
 }
 let called=false;
 for(const origin of ['', 'https://other.example']){
  const denied=await owned(new Request('https://dextro-mvp.vercel.app/api/stories',{method:'PUT',headers:{Origin:origin}}),async()=>{called=true;return Response.json({});});
  assert.equal(denied.status,403);
 }
 assert.equal(called,false);
 delete process.env.INTERNAL_TEST_OWNER_ID;
 assert.throws(()=>requirePrincipal(),/Configure the internal workspace owner/);
 process.env.INTERNAL_TEST_OWNER_ID='invalid';
 assert.throws(()=>requirePrincipal(),/Configure the internal workspace owner/);
 process.env.INTERNAL_TEST_OWNER_ID=owner;process.env.STORAGE_MODE='local';
 assert.throws(()=>requirePrincipal(),/Cloud storage is not enabled/);
});
