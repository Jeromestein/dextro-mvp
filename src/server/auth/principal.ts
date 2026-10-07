import { z } from 'zod';
import { ServiceError } from '@/server/errors';
import { cloudEnabled } from '@/server/storage/client';
export type Principal = {ownerId:string};
export function requirePrincipal():Principal {
  if(!cloudEnabled()) throw new ServiceError('Cloud storage is not enabled.',503);
  // Local and hosted testing share the server-configured owner without sign-in.
  const owner=z.uuid().safeParse(process.env.INTERNAL_TEST_OWNER_ID);
  if(!owner.success) throw new ServiceError('Configure the internal workspace owner on the server.',503);
  return {ownerId:owner.data};
}
