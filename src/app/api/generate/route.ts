import { generationStatus, generateStory } from "@/server/generation/story";
import { cloudEnabled } from "@/server/storage/client";
import { submitJob } from "@/server/generation/jobs/service";
export { generationStatus as GET };
export const POST = (request: Request) => cloudEnabled() ? submitJob(request, "story") : generateStory(request);
export const runtime = "nodejs";
export const maxDuration = 180;
