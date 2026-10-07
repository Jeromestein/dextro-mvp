import { owned,json } from '@/server/storage/http';
import { storageClient,storageError } from '@/server/storage/client';
import { ownedJob,recoverJob } from '@/server/generation/jobs/service';
import { hydratedAsset } from '@/server/storage/assets';
import { readCloudStory } from '@/server/storage/stories';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){return owned(request,async p=>{
 const job=await ownedJob(p,(await context.params).id);await recoverJob(p,job).catch(()=>{});
 if(job.status==='succeeded'){
   if(job.kind==='image')return json({status:job.status,asset:await hydratedAsset(p,job.result.assetId)});
   const row=await readCloudStory(p,job.result.storyId,job.result.revision);
   return json({status:job.status,story:{...row.document,id:row.id,title:row.title,description:row.description,genre:row.genre,updatedAt:row.updatedAt,version:2,assets:[]},repaired:job.result.repaired,revision:job.result.revision});
 }
 return json({status:job.status,error:job.error});
});}
export async function DELETE(request:Request,context:{params:Promise<{id:string}>}){return owned(request,async p=>{
 const job=await ownedJob(p,(await context.params).id);const db=storageClient();const r=await db.from('generation_jobs').update({cancel_requested_at:new Date().toISOString()}).eq('owner_id',p.ownerId).eq('id',job.id);storageError(r.error);const stopped=await db.from('generation_jobs').update({status:'cancelled'}).eq('owner_id',p.ownerId).eq('id',job.id).eq('status','queued');storageError(stopped.error);return json({stopped:true});
});}
