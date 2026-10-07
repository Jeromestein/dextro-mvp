import { cloudEnabled,storageClient,storageError } from '@/server/storage/client';
import { owned,json } from '@/server/storage/http';
export async function GET(request:Request) {
  if(!cloudEnabled())return json({mode:'local',scope:'local',available:true});
  return owned(request,async p=>{
    const url=process.env.SUPABASE_URL?.trim();
    if(!url||!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url))return json({error:'Configure the Supabase project URL before opening this workspace.'},503);
    const status={mode:'supabase',scope:`${new URL(url).hostname}:${p.ownerId}`,ownerId:p.ownerId};
    try{const r=await storageClient().from('app_users').select('id').eq('id',p.ownerId).single();storageError(r.error);return json({...status,available:true});}
    catch(error){return json({...status,available:false,error:(error as Error).message});}
  });
}
