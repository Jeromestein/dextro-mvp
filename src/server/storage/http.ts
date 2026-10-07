import { ServiceError,readBounded } from '@/server/errors';
import { sameOrigin } from '@/server/auth/origin';
import { requirePrincipal,type Principal } from '@/server/auth/principal';
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function owned(request:Request,operation:(principal:Principal)=>Promise<Response>):Promise<Response> {
  try {
    const principal=requirePrincipal(request);
    if(!['GET','HEAD'].includes(request.method)&&!sameOrigin(request)) throw new ServiceError('Use this studio to change your workspace.',403);
    return await operation(principal);
  } catch(error) {
    return json({error:error instanceof ServiceError?error.message:'The workspace request could not be completed.'},error instanceof ServiceError?error.status:500);
  }
}
export async function body(request:Request,limit=2_500_000):Promise<unknown> {
  try {return JSON.parse(await readBounded(request.body,limit));} catch(error) {if(error instanceof ServiceError) throw error;throw new ServiceError('The request is not valid JSON.',400);}
}
