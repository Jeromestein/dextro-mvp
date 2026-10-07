import { owned,json } from '@/server/storage/http';
import { completeUpload } from '@/server/storage/assets';
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return owned(request,async p=>json(await completeUpload(p,(await context.params).id)));}
