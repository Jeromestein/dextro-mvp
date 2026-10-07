import { owned,json } from '@/server/storage/http';
import { storageClient,storageError } from '@/server/storage/client';
export async function GET(request:Request) {return owned(request,async p=>{
  const url=new URL(request.url),offset=Math.max(0,Number(url.searchParams.get('offset'))||0);
  const r=await storageClient().from('stories').select('id,title,description,genre,status,revision,updated_at,passage_count,ending_count').eq('owner_id',p.ownerId).is('deleted_at',null).neq('status','archived').order('updated_at',{ascending:false}).order('id').range(offset,offset+49);storageError(r.error);
  return json({stories:(r.data||[]).map(r=>({id:r.id,title:r.title,description:r.description,genre:r.genre,status:r.status,revision:r.revision,updatedAt:r.updated_at,passageCount:r.passage_count,endingCount:r.ending_count})),nextOffset:r.data?.length===50?offset+50:null});
});}
