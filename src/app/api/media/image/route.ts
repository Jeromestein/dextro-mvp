import { imageStatus, generateImage } from "@/server/media/image";
import { cloudEnabled } from "@/server/storage/client";
import { submitJob } from "@/server/generation/jobs/service";
export { imageStatus as GET };
export const POST = (request: Request) => cloudEnabled() ? submitJob(request, "image") : generateImage(request);
export const runtime = "nodejs";
export const maxDuration = 180;
