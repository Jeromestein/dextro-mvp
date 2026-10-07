import test from 'node:test';
import assert from 'node:assert/strict';
import { runGenerationJob } from '../src/server/generation/jobs/worker';
import { randomUUID } from 'node:crypto';
import type { storageClient } from '../src/server/storage/client';
type Row=Record<string,unknown>;
function fixture(failAfterArchive=false){
 const owner=randomUUID(),id=randomUUID();
 const job:Row={id,owner_id:owner,kind:'image',status:'queued',input:{model:'test-image-model',title:'A preserved scene',scene:'A small cabin in the snow.',style:'storybook',artBrief:'Soft light'}};
 const tables:Record<string,Row[]>={generation_jobs:[job],generation_attempts:[],media_assets:[]};
 const objects=new Map<string,Blob>();let fail=failAfterArchive;
 const db={
  from(table:string){let operation='select',value:Row={};const filters:Array<[string,unknown]>=[],excluded:Array<[string,unknown]>=[];const query={
   select(){return query;},insert(row:Row){operation='insert';value=row;return query;},update(row:Row){operation='update';value=row;return query;},eq(column:string,expected:unknown){filters.push([column,expected]);return query;},
   neq(column:string,value:unknown){excluded.push([column,value]);return query;},
   async single(){const r=await query;return {...r,data:r.data[0]||null};},async maybeSingle(){return query.single();},
   then<T>(resolve:(result:{data:Row[];error:{message:string}|null})=>T){
     const rows=tables[table].filter(row=>filters.every(([key,v])=>row[key]===v)&&excluded.every(([key,v])=>row[key]!==v));
     if(operation==='update'&&table==='generation_attempts'&&value.status==='received'&&fail){fail=false;return Promise.resolve(resolve({data:[],error:{message:'Temporary database outage'}}));}
     if(operation==='insert')tables[table].push({...value});else if(operation==='update')rows.forEach(row=>Object.assign(row,value));
     return Promise.resolve(resolve({data:rows,error:null}));
   }
  };return query;},
  async rpc(name:string,input:Row){assert.equal(name,'dextro_claim_attempt');assert.equal(input.p_owner,owner);assert.equal(input.p_job,id);const previous=tables.generation_attempts.find(row=>row.sequence===input.p_sequence);if(previous)return {data:{...previous,claimed:false},error:null};const attempt={id:randomUUID(),owner_id:owner,job_id:id,sequence:input.p_sequence,status:'dispatched',created_at:new Date().toISOString()};tables.generation_attempts.push(attempt);job.status='running';return {data:{...attempt,claimed:true},error:null};},
  storage:{from(bucket:string){return {
   async upload(key:string,body:string|Buffer){const path=`${bucket}/${key}`;if(objects.has(path))return {error:{message:'Already exists'}};objects.set(path,new Blob([typeof body==='string'?body:new Uint8Array(body)]));return {error:null};},
   async download(key:string){const data=objects.get(`${bucket}/${key}`);return {data,error:data?null:{message:'Not found'}};}
  };}}
 };
 return {owner,id,job,tables,objects,db:db as unknown as ReturnType<typeof storageClient>};
}
test('a crash after paid output is archived recovers the same bytes without another provider call',async t=>{
 const f=fixture(true);let calls=0;
 const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='unit-test-only';t.after(()=>{if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;});
 t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({data:[{b64_json:Buffer.from('RIFF0000WEBPpreserved').toString('base64')}],usage:{image_tokens:1}});});
 await assert.rejects(runGenerationJob(f.owner,f.id,f.db),/Cloud storage could not/);
 assert.equal(f.objects.size,1);assert.equal(calls,1);
 await runGenerationJob(f.owner,f.id,f.db);
 assert.equal(f.job.status,'succeeded');assert.equal(calls,1);assert.equal(f.tables.media_assets.length,1);assert.equal(f.objects.size,2);
 await runGenerationJob(f.owner,f.id,f.db);assert.equal(calls,1);assert.equal(f.tables.media_assets.length,1);
});
test('a lost provider connection is recorded as uncertain and never silently regenerated',async t=>{
 const f=fixture();let calls=0;
 const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='unit-test-only';t.after(()=>{if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;});
 t.mock.method(globalThis,'fetch',async()=>{calls++;throw new Error('Connection lost after dispatch');});
 await runGenerationJob(f.owner,f.id,f.db);assert.equal(f.job.status,'outcome_unknown');
 await runGenerationJob(f.owner,f.id,f.db);assert.equal(calls,1);assert.equal(f.tables.generation_attempts.length,1);assert.equal(f.objects.size,0);
});
