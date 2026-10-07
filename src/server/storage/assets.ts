import { createHash,randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Principal } from '@/server/auth/principal';
import { ServiceError } from '@/server/errors';
import { storageClient,storageError } from './client';
import { assetSchema,type MediaAsset } from '@/modules/media/assets/model';
export const BUCKET='user-media';
const uploadSchema=z.object({kind:z.enum(['image','audio']),name:z.string().min(1).max(200),credit:z.string().max(1000),source:z.enum(['upload','legacy','catalog','generated']),mimeType:z.string(),byteSize:z.number().int().positive(),sha256:z.string().regex(/^[a-f0-9]{64}$/),knownAssetId:z.string().max(100).optional(),provenance:assetSchema.options[0].shape.provenance});
export const hash=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex');
export async function getAsset(principal:Principal,id:string) {
  if(!z.uuid().safeParse(id).success) throw new ServiceError('Asset not found.',404);
  const {data,error}=await storageClient().from('media_assets').select('*').eq('owner_id',principal.ownerId).eq('id',id).is('deleted_at',null).maybeSingle();
  storageError(error);if(!data) throw new ServiceError('Asset not found.',404);return data;
}
export async function prepareUpload(principal:Principal,raw:unknown) {
  const parsed=uploadSchema.safeParse(raw);if(!parsed.success)throw new ServiceError('Invalid media metadata.',400);
  const input=parsed.data;
  const allowed=input.kind==='image'?['image/png','image/jpeg','image/webp']:['audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/webm'];
  if(!allowed.includes(input.mimeType)||input.byteSize>(input.kind==='image'?2_000_000:6_000_000))throw new ServiceError('Choose a supported image up to 2 MB or audio file up to 6 MB.',413);
  const db=storageClient();
  const found=await db.from('media_assets').select('*').eq('owner_id',principal.ownerId).eq('sha256',input.sha256).eq('mime_type',input.mimeType).eq('byte_size',input.byteSize).is('deleted_at',null).in('state',['ready','pending']).order('created_at').limit(1).maybeSingle();
  storageError(found.error);
  let asset=found.data;
  if(input.knownAssetId&&z.uuid().safeParse(input.knownAssetId).success){
    const known=await db.from('media_assets').select('*').eq('owner_id',principal.ownerId).eq('id',input.knownAssetId).eq('sha256',input.sha256).eq('mime_type',input.mimeType).eq('byte_size',input.byteSize).eq('state','ready').is('deleted_at',null).maybeSingle();
    storageError(known.error);if(known.data)asset=known.data;
  }
  if(!asset) {
    const id=randomUUID();
    const inserted=await db.from('media_assets').insert({id,owner_id:principal.ownerId,kind:input.kind,source:input.source==='generated'?'legacy':input.source,state:'pending',name:input.name,credit:input.credit,provenance:input.provenance||null,mime_type:input.mimeType,byte_size:input.byteSize,sha256:input.sha256,object_key:`owners/${principal.ownerId}/assets/${id}/original`}).select('*').single();
    storageError(inserted.error);asset=inserted.data!;
  }
  if(asset.state==='ready')return {id:asset.id,ready:true};
  // An interrupted upload may already have arrived. Finalization is safe to retry.
  const signed=await db.storage.from(BUCKET).createSignedUploadUrl(asset.object_key);
  storageError(signed.error);return {id:asset.id,ready:false,uploadUrl:signed.data!.signedUrl};
}
export async function assetBytes(principal:Principal,id:string,allowPending=false) {
  const asset=await getAsset(principal,id);
  if(asset.state!=='ready'&&!(allowPending&&asset.state==='pending'))throw new ServiceError('This asset is not ready.',409);
  const {data,error}=await storageClient().storage.from(BUCKET).download(asset.object_key);
  storageError(error);
  const bytes=Buffer.from(await data!.arrayBuffer());
  if(bytes.length!==asset.byte_size||hash(bytes)!==asset.sha256)throw new ServiceError('This media file did not pass its integrity check.',422);
  return {asset,bytes};
}
export function validMagic(bytes:Buffer,mime:string) {
  if(mime==='image/webp')return bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  if(mime==='image/png')return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(mime==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(mime==='audio/wav')return bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WAVE';
  if(mime==='audio/ogg')return bytes.subarray(0,4).toString()==='OggS';
  if(mime==='audio/mp4')return bytes.subarray(4,8).toString()==='ftyp';
  if(mime==='audio/webm')return bytes.subarray(0,4).equals(Buffer.from([26,69,223,163]));
  return bytes.subarray(0,3).toString()==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224);
}
export async function completeUpload(principal:Principal,id:string) {
  const {asset,bytes}=await assetBytes(principal,id,true);
  if(!validMagic(bytes,asset.mime_type))throw new ServiceError('The uploaded bytes do not match the declared media format.',422);
  const {error}=await storageClient().from('media_assets').update({state:'ready'}).eq('owner_id',principal.ownerId).eq('id',id);storageError(error);
  return {id,ready:true};
}
export async function hydratedAsset(principal:Principal,id:string):Promise<MediaAsset> {
  const {asset,bytes}=await assetBytes(principal,id);
  return assetSchema.parse({id:asset.id,kind:asset.kind,name:asset.name,credit:asset.credit,source:asset.source,provenance:asset.provenance||undefined,data:`data:${asset.mime_type};base64,${bytes.toString('base64')}`});
}
