import type { Story } from '@/modules/story/model';
import type { StoredStory } from '@/modules/storage/model';
export type PendingSave={key:string;story:Story;baseRevision:number;mutationId:string;createdAt:number;prepared?:StoredStory;status?:string};
function open(scope:string):Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(`dextro-cloud-${scope}`,1);req.onupgradeneeded=()=>{req.result.createObjectStore('pending',{keyPath:'key'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(new Error('Local recovery storage is unavailable. Export a backup.'));});}
export async function pendingSaves(scope:string):Promise<PendingSave[]>{const db=await open(scope);return new Promise((resolve,reject)=>{const tx=db.transaction('pending');const req=tx.objectStore('pending').getAll();tx.oncomplete=()=>{db.close();resolve(req.result.sort((a:PendingSave,b:PendingSave)=>a.createdAt-b.createdAt));};tx.onerror=()=>{db.close();reject(new Error('Could not read local recovery copies.'));};});}
export async function persistPending(scope:string,entry:PendingSave|string){const db=await open(scope);return new Promise<void>((resolve,reject)=>{const tx=db.transaction('pending','readwrite');const store=tx.objectStore('pending');if(typeof entry==='string')store.delete(entry);else store.put(entry);tx.oncomplete=()=>{db.close();resolve();};tx.onabort=tx.onerror=()=>{db.close();reject(new Error('Could not save the local recovery copy. Export a backup before leaving.'));};});}
// Delete a verified batch only if no tab has changed or extended it meanwhile.
export async function discardPendingIfUnchanged(scope:string,entries:PendingSave[]):Promise<boolean>{
 if(!entries.length)return false;
 const db=await open(scope);
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('pending','readwrite'),store=tx.objectStore('pending'),req=store.getAll();let removed=false;
  req.onsuccess=()=>{
   const current=(req.result as PendingSave[]).filter(entry=>entry.story.id===entries[0].story.id);
   const expected=new Map(entries.map(entry=>[entry.key,JSON.stringify(entry)]));
   if(current.length!==entries.length||current.some(entry=>expected.get(entry.key)!==JSON.stringify(entry)))return;
   entries.forEach(entry=>store.delete(entry.key));removed=true;
  };
  tx.oncomplete=()=>{db.close();resolve(removed);};
  tx.onabort=tx.onerror=()=>{db.close();reject(new Error('Could not reconcile local recovery copies.'));};
 });
}
// Moving conflicted work to a new story keeps one durable recovery copy throughout.
export async function replacePending(scope:string,keys:string[],entry:PendingSave){const db=await open(scope);return new Promise<void>((resolve,reject)=>{const tx=db.transaction('pending','readwrite'),store=tx.objectStore('pending');store.put(entry);keys.forEach(key=>store.delete(key));tx.oncomplete=()=>{db.close();resolve();};tx.onabort=tx.onerror=()=>{db.close();reject(new Error('Could not preserve the recovery copy. Download a backup before leaving.'));};});}
