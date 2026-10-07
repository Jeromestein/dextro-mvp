import { z } from 'zod';
import type { Principal } from '@/server/auth/principal';
import { ServiceError } from '@/server/errors';
import { storedStorySchema,type StoredStory } from '@/modules/storage/model';
import { storySchema } from '@/modules/story/model';
import { storageClient,storageError } from './client';
import { hash } from './assets';
export async function saveCloudStory(principal:Principal,id:string,raw:unknown) {
  const parsed=z.object({baseRevision:z.number().int().min(0),mutationId:z.uuid(),story:storedStorySchema,status:z.enum(['draft','ready','archived']).default('ready')}).safeParse(raw);
  if(!parsed.success||!id||id.length>100)throw new ServiceError('Invalid story save.',400);
  const {story,mutationId,baseRevision,status}=parsed.data;
  await validateStoredStory(principal,id,story);
  const result=await storageClient().rpc('dextro_save_story',{p_owner:principal.ownerId,p_id:id,p_base:baseRevision,p_mutation:mutationId,p_hash:hash(JSON.stringify({story,status})),p_story:story,p_status:status});
  storageError(result.error);return result.data;
}
export async function validateStoredStory(principal:Principal,id:string,story:StoredStory) {
  const ids=[...new Set(story.document.assets.map(a=>a.assetId))];
  const response=ids.length?await storageClient().from('media_assets').select('id,kind,byte_size').eq('owner_id',principal.ownerId).in('id',ids).eq('state','ready').is('deleted_at',null):{data:[],error:null};
  storageError(response.error);const assets=response.data||[];
  if(assets.length!==ids.length)throw new ServiceError('Some media is unavailable in this workspace.',422);
  let size=Buffer.byteLength(JSON.stringify(story));
  const values=story.document.assets.map(ref=>{const asset=assets.find(a=>a.id===ref.assetId)!;size+=4*Math.ceil(asset.byte_size/3)+100;return {...ref,kind:asset.kind,source:'upload',data:asset.kind==='image'?'data:image/png;base64,aGVsbG8=':'data:audio/wav;base64,YXVkaW8='};});
  if(size>24_000_000)throw new ServiceError('This story exceeds the 24 MB export limit. Remove unused media first.',413);
  const checked=storySchema.safeParse({...story.document,...story,id,version:2,updatedAt:new Date().toISOString(),assets:values});
  if(!checked.success)throw new ServiceError('The story structure or media references are invalid.',422);
}
export async function readCloudStory(principal:Principal,id:string,revision?:number) {
  const db=storageClient();
  const current=await db.from('stories').select('*').eq('owner_id',principal.ownerId).eq('id',id).is('deleted_at',null).maybeSingle();storageError(current.error);
  if(!current.data)throw new ServiceError('Story not found.',404);
  let record=current.data;
  if(revision) {
    const version=await db.from('story_versions').select('snapshot,revision,created_at').eq('owner_id',principal.ownerId).eq('story_id',id).eq('revision',revision).maybeSingle();storageError(version.error);
    if(!version.data)throw new ServiceError('Story version not found.',404);
    record={...record,...version.data.snapshot,revision,updated_at:version.data.created_at};
  }
  return {id:record.id,title:record.title,description:record.description,genre:record.genre,document:record.document,revision:record.revision,status:record.status,updatedAt:record.updated_at};
}
