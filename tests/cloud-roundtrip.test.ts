import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash,randomUUID } from 'node:crypto';
import { readCloudStory,prepareCloudStory,writePreparedStory,clearUploadCache } from '../src/storage/cloud-repository';
import { persistPending,pendingSaves,replacePending } from '../src/storage/cloud-outbox';
import { buildBackup,buildGame } from '../src/modules/export/standalone';
import { sampleStory } from '../src/modules/story/sample';
import { bindMediaPlan } from '../src/modules/media/generation/plan';
import type { StoredStory } from '../src/modules/storage/model';
class Reader { result='';onload:(()=>void)|null=null;onerror:(()=>void)|null=null;readAsDataURL(blob:Blob){blob.arrayBuffer().then(bytes=>{this.result=`data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`;this.onload?.();}).catch(()=>this.onerror?.());} }
Object.defineProperty(globalThis,'FileReader',{value:Reader,configurable:true});
test('cloud references round-trip graph, layout and shared media into a fully embedded offline export',async t=>{
 clearUploadCache();
 const id=randomUUID(),bytes=Buffer.from('RIFF0000WEBPpreserved'),sha=createHash('sha256').update(bytes).digest('hex');
 const story=sampleStory();story.appearance={theme:"midnight",recommendation:"starlight"};story.id=randomUUID();story.editor={positions:[{id:'arrival',x:81,y:42},{id:'keeper',x:640,y:260}],viewport:{x:12,y:34,zoom:0.9}};
 story.assets=[{id:'local-image',name:'Snow cabin',kind:'image',source:'generated',credit:'OpenAI',data:`data:image/webp;base64,${bytes.toString('base64')}`,provenance:{provider:'openai',model:'test-model',prompt:'Private creative prompt',createdAt:new Date().toISOString()}}];
 story.passages[0].media.imageId='local-image';story.passages[1].media.imageId='local-image';
 story.mediaPlan={artBrief:'Soft lighting',scenes:[{id:'shared',description:'A quiet room',passageIds:['arrival','letter']}],cues:[]};
 const planned=bindMediaPlan(story);
 const document={appearance:planned.appearance,startId:planned.startId,passages:planned.passages,editor:planned.editor,mediaPlan:planned.mediaPlan,assets:[{id:'local-image',assetId:id,name:'Snow cabin',credit:'OpenAI'}]};
 let saved:StoredStory|undefined,contentReads=0;
 t.mock.method(globalThis,'fetch',async(url:string,init?:RequestInit)=>{
   if(url===`/api/stories/${story.id}`&&init?.method==='PUT'){saved=JSON.parse(String(init.body)).story;return Response.json({revision:8,updatedAt:story.updatedAt});}
   if(url===`/api/stories/${story.id}`)return Response.json({...story,document,assets:undefined,revision:7,status:'ready'});
   if(url.startsWith('/api/assets?ids='))return Response.json({assets:[{...story.assets[0],byte_size:bytes.length,sha256:sha,mime_type:'image/webp',id}]});
   if(url===`/api/assets/${id}/content`){contentReads++;return new Response(bytes,{headers:{'Content-Type':'image/webp'}});}
   if(url.startsWith('data:'))return new Response(bytes,{headers:{'Content-Type':'image/webp'}});
   throw new Error(`Unexpected request ${url}`);
 });
 const loaded=await readCloudStory(story.id);assert.equal(loaded.revision,7);assert.equal(contentReads,1,'shared file downloaded once');
 assert.deepEqual(loaded.story.appearance,planned.appearance);assert.deepEqual(loaded.story.passages,planned.passages);assert.deepEqual(loaded.story.editor,planned.editor);assert.deepEqual(loaded.story.mediaPlan,planned.mediaPlan);assert.deepEqual(loaded.story.assets,planned.assets);
 await writePreparedStory(story.id,await prepareCloudStory(loaded.story),7,randomUUID());assert.deepEqual(saved?.document,document);
 const html=buildGame(loaded.story);assert.ok(html.includes(story.assets[0].data));assert.ok(!html.includes('Private creative prompt'));assert.ok(!html.includes('/api/assets'));assert.ok(!html.includes('.supabase.co'));
 assert.ok(buildBackup(loaded.story).includes('Private creative prompt'),'editable backup retains authoring metadata');
});
test('pending mutations survive reload, remain isolated by project and owner, and clear only on acknowledgement',async()=>{
 const first=`test:${randomUUID()}`,second=`test:${randomUUID()}`,story=sampleStory();
 const mutationId=randomUUID(),entry={key:mutationId,mutationId,story,baseRevision:7,createdAt:Date.now()};
 await persistPending(first,entry);assert.deepEqual(await pendingSaves(first),[entry]);assert.deepEqual(await pendingSaves(second),[]);
 const copy={...entry,key:randomUUID(),mutationId:randomUUID(),story:{...story,id:randomUUID()},baseRevision:0};
 await replacePending(first,[mutationId],copy);assert.deepEqual(await pendingSaves(first),[copy]);
 await persistPending(first,copy.key);assert.deepEqual(await pendingSaves(first),[]);
});
