import { publicAsset } from "@/server/publishing/service";
import { publicResponse, mediaResponse } from "@/server/publishing/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ publicId: string; releaseId: string; assetId: string }> }) {
  return publicResponse(async () => {
    const { publicId, releaseId, assetId } = await context.params;
    const { bytes, mimeType } = await publicAsset(publicId, releaseId, assetId);
    return mediaResponse(request, bytes, mimeType);
  });
}
