import { owned,json } from '@/server/storage/http';
import { storageClient,storageError } from '@/server/storage/client';
import { openingImageId,type StoredStory } from '@/modules/storage/model';
export async function GET(request:Request) {return owned(request,async p=>{
  const url=new URL(request.url),offset=Math.max(0,Number(url.searchParams.get('offset'))||0);
  const r=await storageClient().from('stories').select('id,title,description,genre,status,revision,updated_at,passage_count,ending_count,document').eq('owner_id',p.ownerId).is('deleted_at',null).neq('status','archived').order('updated_at',{ascending:false}).order('id').range(offset,offset+49);storageError(r.error);
  return json({stories:(r.data||[]).map(r=>{
    const document=r.document as StoredStory['document'];
    const imageId=openingImageId(document);
    const image=document.assets.find(a=>a.id===imageId);
    // Return only a reference; the browser loads the opening image on demand.
    return {id:r.id,title:r.title,description:r.description,genre:r.genre,status:r.status,revision:r.revision,updatedAt:r.updated_at,passageCount:r.passage_count,endingCount:r.ending_count,
      coverSrc:image?`/api/assets/${encodeURIComponent(image.assetId)}/content`:undefined};
  }),nextOffset:r.data?.length===50?offset+50:null});
});}
