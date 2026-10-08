import { storySchema,type Story } from '@/modules/story/model';
import { assetSchema,type MediaAsset } from '@/modules/media/assets/model';
import type { AssetInfo,StoredStory,StorageStatus,StorySummary } from '@/modules/storage/model';
import { requireStorySize } from '@/modules/media/assets/operations';
export async function requestJSON(url:string,init?:RequestInit) {
 const response=await fetch(url,{cache:'no-store',...init});const data=await response.json().catch(()=>({error:'The server is unavailable. Your local work is preserved.'}));if(!response.ok)throw Object.assign(new Error(data.error||'The cloud request failed. Your local work is preserved.'),{status:response.status});return data;
}
export const storageStatus=async():Promise<StorageStatus>=>requestJSON('/api/storage');
export async function listCloudStories():Promise<StorySummary[]> {const rows:StorySummary[]=[];let offset:number|null=0;do{const page=await requestJSON(`/api/stories?offset=${offset}`);rows.push(...page.stories);offset=page.nextOffset;}while(offset!==null);return rows;}
async function sha256(bytes:ArrayBuffer){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
function fromBlob(blob:Blob):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read the downloaded media.'));reader.readAsDataURL(blob);});}
export async function loadCloudAsset(info:AssetInfo):Promise<MediaAsset>{
 const response=await fetch(`/api/assets/${info.id}/content`,{cache:'no-store'});if(!response.ok)throw new Error(`Could not download ${info.name}. Export has not been created.`);
 const bytes=await response.arrayBuffer();if(bytes.byteLength!==info.byte_size||await sha256(bytes)!==info.sha256)throw new Error(`Integrity check failed for ${info.name}.`);
 return assetSchema.parse({id:info.id,kind:info.kind,name:info.name,credit:info.credit,source:info.source,provenance:info.provenance||undefined,data:await fromBlob(new Blob([bytes],{type:info.mime_type}))});
}
export async function readCloudStory(id:string,revision?:number):Promise<{story:Story;revision:number;status:string}>{
 const row=await requestJSON(`/api/stories/${encodeURIComponent(id)}${revision?`?revision=${revision}`:''}`);
 const refs=row.document.assets as StoredStory['document']['assets'];
 const ids=[...new Set(refs.map(a=>a.assetId))];const metadata:AssetInfo[]=ids.length?(await requestJSON(`/api/assets?ids=${ids.join(',')}`)).assets:[];
 if(metadata.length!==ids.length)throw new Error('Some story media is unavailable. The incomplete story was not opened.');
 const downloaded=new Map<string,MediaAsset>();
 // Bound parallel media reads, and do not download unrelated library assets.
 for(let i=0;i<metadata.length;i+=4)await Promise.all(metadata.slice(i,i+4).map(async info=>{const asset=await loadCloudAsset(info);downloaded.set(info.id,asset);uploaded.set(assetCacheKey(info.sha256,asset),info.id);}));
 const story=storySchema.parse({...row.document,version:2,id:row.id,title:row.title,description:row.description,genre:row.genre,updatedAt:row.updatedAt,assets:refs.map(ref=>({...downloaded.get(ref.assetId),id:ref.id,name:ref.name,credit:ref.credit}))});
 requireStorySize(story);return {story,revision:row.revision,status:row.status};
}
const uploaded=new Map<string,string>();
const assetCacheKey=(digest:string,asset:MediaAsset)=>`${digest}:${asset.kind}:${asset.source}:${JSON.stringify(asset.provenance||null)}`;
export function clearUploadCache(){uploaded.clear();}
export async function storeCloudAsset(asset:MediaAsset):Promise<string>{
 const response=await fetch(asset.data);const blob=await response.blob();const bytes=await blob.arrayBuffer();const digest=await sha256(bytes);
 const cacheKey=assetCacheKey(digest,asset),cached=uploaded.get(cacheKey);if(cached)return cached;
 const prepared=await requestJSON('/api/assets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({knownAssetId:asset.id,kind:asset.kind,name:asset.name,credit:asset.credit,source:asset.source,provenance:asset.provenance,mimeType:blob.type,byteSize:blob.size,sha256:digest})});
 if(!prepared.ready){
   const sent=await fetch(prepared.uploadUrl,{method:'PUT',headers:{'Content-Type':blob.type,'x-upsert':'false'},body:bytes});
   // A previous upload may have completed before its response was lost. The
   // completion endpoint verifies the owner's immutable bytes in either case.
   if(!sent.ok&&sent.status!==400&&sent.status!==409)throw new Error(`Upload failed for ${asset.name}. Your local copy is kept.`);
   await requestJSON(`/api/assets/${prepared.id}/complete`,{method:'POST'});
 }
 uploaded.set(cacheKey,prepared.id);return prepared.id;
}
export async function prepareCloudStory(story:Story):Promise<StoredStory>{
 requireStorySize(story);const refs=[];
 for(const asset of story.assets)refs.push({id:asset.id,assetId:await storeCloudAsset(asset),name:asset.name,credit:asset.credit});
 const document={startId:story.startId,passages:story.passages,assets:refs,editor:story.editor,mediaPlan:story.mediaPlan,appearance:story.appearance};
 return {title:story.title,description:story.description,genre:story.genre,document};
}
export async function writePreparedStory(id:string,story:StoredStory,baseRevision:number,mutationId:string,status='ready'):Promise<{revision:number;updatedAt:string}>{return requestJSON(`/api/stories/${encodeURIComponent(id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({baseRevision,mutationId,status,story})});}
