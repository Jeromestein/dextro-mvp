import { owned,json } from '@/server/storage/http';
import { storageClient,storageError } from '@/server/storage/client';
import { recoverJob } from '@/server/generation/jobs/service';
export async function GET(request:Request){return owned(request,async p=>{
 const r=await storageClient().from('generation_jobs').select('*').eq('owner_id',p.ownerId).order('created_at',{ascending:false}).limit(30);storageError(r.error);
 for(const job of r.data||[])await recoverJob(p,job).catch(()=>{});
 return json({jobs:(r.data||[]).map(j=>({id:j.id,kind:j.kind,status:j.status,result:j.result,error:j.error,created_at:j.created_at}))});
});}
