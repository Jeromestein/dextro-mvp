import { owned, json, body } from "@/server/storage/http";
import { mutatePublication, publicationStatus } from "@/server/publishing/service";
type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request, context: Context) {
  return owned(request, async p => json(await publicationStatus(p, (await context.params).id)));
}
export async function POST(request: Request, context: Context) {
  return owned(request, async p => json(await mutatePublication(p, (await context.params).id, "publish", await body(request, 4096))));
}
export async function DELETE(request: Request, context: Context) {
  return owned(request, async p => json(await mutatePublication(p, (await context.params).id, "unpublish", await body(request, 4096))));
}
