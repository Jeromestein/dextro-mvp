import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { requestGeneration } from '../src/modules/media/generation/job-client';
test('a lost submission response retries the same intent, then polls its saved job without new billing',async t=>{
 const windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,'window'),storageDescriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const values=new Map<string,string>();
 Object.defineProperty(globalThis,'window',{value:{},configurable:true});
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)},configurable:true});
 t.after(()=>{for(const [key,descriptor] of [['window',windowDescriptor],['localStorage',storageDescriptor]] as const){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
 const jobId=randomUUID(),attempts:string[]=[];let submitted=0,polls=0;
 t.mock.method(globalThis,'fetch',async(url:string,init?:RequestInit)=>{
  if(init?.method==='POST'){const data=JSON.parse(String(init.body));attempts.push(data.requestId);submitted++;if(submitted===1)throw new Error('Lost response after the job was created');return Response.json({jobId},{status:202});}
  assert.equal(url,`/api/generation-jobs/${jobId}`);polls++;return Response.json({status:'succeeded',asset:{id:'retained'}});
 });
 const signal=new AbortController().signal,input={scene:'A quiet cabin in the woods'};
 await assert.rejects(requestGeneration('/api/media/image',input,signal,'project:owner'),/Lost response/);
 assert.equal(values.size,1);
 const result=await requestGeneration('/api/media/image',input,signal,'project:owner');
 assert.deepEqual(attempts,[attempts[0],attempts[0]]);assert.equal(polls,1);assert.equal(result.jobId,jobId);assert.equal(values.size,0);
});
