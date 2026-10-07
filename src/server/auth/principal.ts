import { z } from 'zod';
import { ServiceError } from '@/server/errors';
import { cloudEnabled } from '@/server/storage/client';
export type Principal = {ownerId:string};
export function requirePrincipal(request:Request):Principal {
  if(!cloudEnabled()) throw new ServiceError('Cloud storage is not enabled.',503);
  const url=new URL(request.url);
  const expectedHost=`${url.hostname}${url.port?`:${url.port}`:''}`;
  // A fixed owner is only safe behind a real access boundary. Hosted access stays
  // disabled until verified sessions or a trusted private ingress are implemented.
  if(process.env.NODE_ENV==='production' || url.protocol!=='http:' || !['localhost','127.0.0.1'].includes(url.hostname) || request.headers.get('host')!==expectedHost)
    throw new ServiceError('This internal cloud workspace is available only from the local development server. Hosted access requires verified authentication.',403);
  const owner=z.uuid().safeParse(process.env.INTERNAL_TEST_OWNER_ID);
  if(!owner.success) throw new ServiceError('Configure the internal workspace owner on the server.',503);
  return {ownerId:owner.data};
}
