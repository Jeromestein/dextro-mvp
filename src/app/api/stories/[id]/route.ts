import { owned,json,body } from '@/server/storage/http';
import { readCloudStory,saveCloudStory } from '@/server/storage/stories';
import { storageClient,storageError } from '@/server/storage/client';
import { ServiceError } from '@/server/errors';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){return owned(request,async p=>{const {id}=await context.params;const revision=Number(new URL(request.url).searchParams.get('revision'))||undefined;return json(await readCloudStory(p,id,revision));});}
export async function PUT(request:Request,context:Context){return owned(request,async p=>{const {id}=await context.params;return json(await saveCloudStory(p,id,await body(request)));});}
export async function DELETE(request:Request,context:Context){return owned(request,async p=>{const {id}=await context.params;const expected=Number(new URL(request.url).searchParams.get('revision'));
 if(!Number.isSafeInteger(expected)||expected<1)throw new ServiceError('Reload the story before deleting it.',409);
 const r=await storageClient().from('stories').update({deleted_at:new Date().toISOString()}).eq('owner_id',p.ownerId).eq('id',id).eq('revision',expected).is('deleted_at',null).select('id');storageError(r.error);
 if(!r.data?.length)throw new ServiceError('The story changed or was already deleted. Refresh the library.',409);return json({deleted:true});});}
