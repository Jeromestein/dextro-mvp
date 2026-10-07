import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { start } from 'workflow/api';
import { generationWorkflow } from './workflow';
import { storageClient,storageError } from '@/server/storage/client';
import { hash } from '@/server/storage/assets';
import { owned,json,body } from '@/server/storage/http';
import { generationInputSchema } from '@/modules/generation/story-schema';
import { imageRequestSchema } from '@/modules/media/generation/plan';
import { selectedModel,apiConfigured } from '@/server/models';
import { ServiceError } from '@/server/errors';
import type { Principal } from '@/server/auth/principal';
export async function dispatchJob(ownerId:string,id:string) {
 const run=await start(generationWorkflow,[ownerId,id]);
 const r=await storageClient().from('generation_jobs').update({workflow_id:run.runId,updated_at:new Date().toISOString()}).eq('owner_id',ownerId).eq('id',id);storageError(r.error);
}
export async function submitJob(request:Request,kind:'story'|'image') {
 return owned(request,async p=>{
   if(!apiConfigured())throw new ServiceError('Configure the server OpenAI API key before generating.',503);
   const raw=await body(request,25000);
   const parsed=(kind==='image'?imageRequestSchema:generationInputSchema.extend({requestId:z.uuid()})).safeParse(raw);
   if(!parsed.success)throw new ServiceError('Check the generation input and try again.',400);
   const {requestId,...input}=parsed.data;const digest=hash(JSON.stringify(input)),db=storageClient();
   const existing=await db.from('generation_jobs').select('*').eq('owner_id',p.ownerId).eq('kind',kind).eq('idempotency_key',requestId).maybeSingle();storageError(existing.error);
   let job=existing.data;
   if(!job){const created=await db.from('generation_jobs').insert({id:randomUUID(),owner_id:p.ownerId,kind,idempotency_key:requestId,request_hash:digest,input:{...input,model:selectedModel(kind,input.model),promptVersion:1}}).select('*').single();
     if(created.error?.code==='23505'){const raced=await db.from('generation_jobs').select('*').eq('owner_id',p.ownerId).eq('kind',kind).eq('idempotency_key',requestId).single();storageError(raced.error);job=raced.data;}else{storageError(created.error);job=created.data;}}
   if(job.request_hash!==digest)throw new ServiceError('This generation request ID belongs to different input.',409);
   if(job.status==='queued'&&!job.workflow_id){try{await dispatchJob(p.ownerId,job.id);}catch{/* The committed outbox is recovered by the next status/history request. */}}
   return json({jobId:job.id},202);
 });
}
export async function ownedJob(p:Principal,id:string) {
 if(!z.uuid().safeParse(id).success)throw new ServiceError('Generation not found.',404);
 const r=await storageClient().from('generation_jobs').select('*').eq('owner_id',p.ownerId).eq('id',id).maybeSingle();storageError(r.error);if(!r.data)throw new ServiceError('Generation not found.',404);return r.data;
}
export async function recoverJob(p:Principal,job:Awaited<ReturnType<typeof ownedJob>>){
 const stale=Date.now()-Date.parse(job.updated_at)>240000;
 if((job.status==='queued'&&!job.workflow_id)||(['queued','running','persisting','outcome_unknown'].includes(job.status)&&stale)){
   // Re-dispatch only resumes persisted results; the SQL attempt gate prevents
   // another paid call after an uncertain provider dispatch.
   await dispatchJob(p.ownerId,job.id);
 }
}
