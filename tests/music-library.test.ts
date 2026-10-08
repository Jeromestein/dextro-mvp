import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import entries from "../resources/music-library/catalog.json";
import { catalogRecordSchema } from "../src/modules/media/catalog/model";
import { fetchMusicCatalog, loadCatalogTrack } from "../src/modules/media/catalog/catalog";
import { GET } from "../src/app/api/media/music/route";
import { enrichStoryMedia } from "../src/modules/media/generation/enrich";
import { sampleStory } from "./helpers/sample-story";
const record = catalogRecordSchema.parse(entries[0].record);
const url = `https://test.supabase.co/storage/v1/object/public/music-library/${record.objectPath}`;

test("music SQL isolates public catalog files from private story assets", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      insert into storage.buckets(id,name,public) values ('user-media','user-media',false);`);
    const sql = await readFile(new URL('../supabase/migrations/202610070001_music_library.sql', import.meta.url), 'utf8');
    await db.exec(sql); await db.exec(sql);
    await db.exec('set role service_role');
    await db.query('insert into music_library_tracks(id,role,record) values ($1,$2,$3)', [record.id, record.role, JSON.stringify(record)]);
    assert.equal((await db.query('select * from music_library_tracks')).rows.length, 1);
    for (const role of ['anon','authenticated']) {
      await db.exec(`reset role; set role ${role}`);
      await assert.rejects(db.query('select * from music_library_tracks'), /permission denied/);
    }
    await db.exec('reset role');
    assert.deepEqual((await db.query('select id,public from storage.buckets order by id')).rows, [{id:'music-library',public:true},{id:'user-media',public:false}]);
    assert.equal((await db.query<{relrowsecurity:boolean}>("select relrowsecurity from pg_class where relname='music_library_tracks'")).rows[0].relrowsecurity, true);
  } finally { await db.close(); }
});

test("catalog API returns active music with derived URLs and safe errors", async t => {
  const original = globalThis.fetch, saved = {...process.env};
  t.after(() => { globalThis.fetch = original; for (const key of ['SUPABASE_URL','SUPABASE_SECRET_KEY']) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } });
  process.env.SUPABASE_URL = 'https://test.supabase.co'; process.env.SUPABASE_SECRET_KEY = 'test-key';
  globalThis.fetch = async input => {
    const requestUrl = new URL(String(input));
    assert.equal(requestUrl.searchParams.get('active'), 'eq.true');
    assert.equal(requestUrl.searchParams.get('role'), 'eq.music');
    return Response.json([{record}]);
  };
  const response = await GET(); assert.equal(response.status,200);
  assert.deepEqual(await response.json(), {tracks:[{record,url}]});
  globalThis.fetch = async () => Response.json([{record:{...record,objectPath:'../user-media/private.mp3'}}]);
  assert.equal((await GET()).status,503);
  delete process.env.SUPABASE_SECRET_KEY;
  const missing = await GET(); assert.equal(missing.status,503);
  assert.ok(!(await missing.text()).includes('test-key'));
});

test("catalog client detects corrupt bytes and aborted catalog requests", async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch=original; });
  globalThis.fetch = async () => Response.json({tracks:[{record,url}]});
  const signal = new AbortController();
  assert.equal((await fetchMusicCatalog(signal.signal)).length,1);
  signal.abort(); await assert.rejects(fetchMusicCatalog(signal.signal));
  const bytes = new Uint8Array([1,2,3]);
  const track = {...record,url,byteSize:3,sha256:createHash('sha256').update(bytes).digest('hex')};
  globalThis.fetch = async () => new Response(new Uint8Array([3,2,1]));
  await assert.rejects(loadCatalogTrack(track,new AbortController().signal),/integrity/);
  globalThis.fetch = async () => new Response(new Uint8Array([1,2,3,4]));
  await assert.rejects(loadCatalogTrack(track,new AbortController().signal),/integrity/);
});

test("catalog outages preserve story assignments and still allow image enrichment", async t => {
  const original=globalThis.fetch; t.after(()=>{globalThis.fetch=original;});
  const story=sampleStory(); story.mediaPlan={artBrief:'Seaside',scenes:[],cues:[{passageId:story.startId,mood:'calm'}]};
  const snapshot=JSON.stringify(story); let updates=0;
  globalThis.fetch=async()=>Response.json({error:'Unavailable'},{status:503});
  const warnings=await enrichStoryMedia(story,{music:true,images:true,style:'storybook',signal:new AbortController().signal,onUpdate:()=>updates++,onStatus:()=>{}});
  assert.equal(updates,0); assert.equal(JSON.stringify(story),snapshot); assert.equal(warnings.length,1);
});
