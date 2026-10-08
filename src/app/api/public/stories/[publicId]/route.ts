import { publicManifest } from "@/server/publishing/service";
import { publicResponse } from "@/server/publishing/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ publicId: string }> }) {
  return publicResponse(async () => Response.json(await publicManifest((await context.params).publicId), { headers: { "Cache-Control": "no-store" } }));
}
