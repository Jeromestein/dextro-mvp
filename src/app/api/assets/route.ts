import { owned,json,body } from '@/server/storage/http';
import { storageClient,storageError } from '@/server/storage/client';
import { prepareUpload } from '@/server/storage/assets';
import { z } from 'zod';
import { ServiceError } from '@/server/errors';
export async function GET(request:Request){return owned(request,async p=>{
 const url=new URL(request.url),ids=url.searchParams.get('ids');
 let q=storageClient().from('media_assets').select('id,kind,name,credit,source,state,mime_type,byte_size,sha256,provenance,created_at').eq('owner_id',p.ownerId).is('deleted_at',null).eq('state','ready');
 if(ids){const parsed=z.array(z.uuid()).max(300).safeParse(ids.split(','));if(!parsed.success)throw new ServiceError('Invalid media list.',400);q=q.in('id',parsed.data);}
 const kind=url.searchParams.get('kind');if(kind==='image'||kind==='audio')q=q.eq('kind',kind);
 const offset=Math.max(0,Number(url.searchParams.get('offset'))||0);
 const r=await q.order('created_at',{ascending:false}).order('id').range(offset,offset+(ids?299:23));storageError(r.error);return json({assets:r.data,nextOffset:!ids&&r.data?.length===24?offset+24:null});
});}
export async function POST(request:Request){return owned(request,async p=>json(await prepareUpload(p,await body(request,12000))));}
