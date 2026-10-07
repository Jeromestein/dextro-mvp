import { owned } from '@/server/storage/http';
import { assetBytes } from '@/server/storage/assets';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){return owned(request,async p=>{
 const {asset,bytes}=await assetBytes(p,(await context.params).id);
 const headers={'Content-Type':asset.mime_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline','Accept-Ranges':'bytes'};
 const range=request.headers.get('range');
 if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.length}`}});
 const start=m[1]?Number(m[1]):Math.max(0,bytes.length-Number(m[2]));const end=m[1]?(m[2]?Math.min(Number(m[2]),bytes.length-1):bytes.length-1):bytes.length-1;
 if(start>end||start>=bytes.length)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.length}`}});
 return new Response(new Blob([new Uint8Array(bytes.subarray(start,end+1))]).stream(),{status:206,headers:{...headers,'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':String(end-start+1)}});}
 return new Response(new Blob([new Uint8Array(bytes)]).stream(),{headers:{...headers,'Content-Length':String(bytes.length)}});
});}
