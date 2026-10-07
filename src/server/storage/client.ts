import { createClient } from '@supabase/supabase-js';
import { ServiceError } from '@/server/errors';
export const cloudEnabled = () => process.env.STORAGE_MODE === 'supabase';
export function storageClient() {
  const url=process.env.SUPABASE_URL?.trim(), key=process.env.SUPABASE_SECRET_KEY?.trim();
  if(!url || !key) throw new ServiceError('Cloud storage needs SUPABASE_URL and SUPABASE_SECRET_KEY on the server.',503);
  if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) throw new ServiceError('Use the configured Supabase project URL.',503);
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export function storageError(error:{message?:string}|null) {
  if(!error) return;
  const message=error.message||'';
  if(message.includes('REVISION_CONFLICT')) throw new ServiceError('This story changed in another tab. Your local changes are kept. Download a backup or save as a new game.',409);
  if(message.includes('IDEMPOTENCY_CONFLICT')) throw new ServiceError('This request ID was already used for different content.',409);
  if(message.includes('STORY_DELETED')) throw new ServiceError('This story was deleted. Save your local work as a new copy.',409);
  if(message.includes('ASSET_NOT_OWNED')) throw new ServiceError('A story asset is missing or is not available in this workspace.',422);
  if(message.includes('DAILY_LIMIT')) throw new ServiceError('The studio has reached its daily generation limit.',429);
  if(message.includes('CONCURRENCY_LIMIT')) throw new ServiceError('Two generations are already running. Try again after they finish.',429);
  if(message.includes('JOB_CANCELLED')) throw new ServiceError('This generation was stopped.',409);
  throw new ServiceError('Cloud storage could not finish this operation. Your local work is preserved.',503);
}
