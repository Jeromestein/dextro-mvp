import { readMusicLibrary } from "@/server/media/music-library";
import { ServiceError } from "@/server/errors";

export const runtime = "nodejs";
export async function GET() {
  try {
    return Response.json({ tracks: await readMusicLibrary() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof ServiceError ? error.message : "The music library is unavailable." }, { status: error instanceof ServiceError ? error.status : 503 });
  }
}
