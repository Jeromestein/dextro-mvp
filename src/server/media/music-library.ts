import { catalogRecordSchema, MUSIC_BUCKET } from "@/modules/media/catalog/model";
import { storageClient } from "@/server/storage/client";
import { ServiceError } from "@/server/errors";

export async function readMusicLibrary() {
  const db = storageClient();
  const { data, error } = await db.from("music_library_tracks").select("record")
    .eq("active", true).eq("role", "music").order("id").limit(500).abortSignal(AbortSignal.timeout(15_000));
  if (error) throw new ServiceError("The music library is unavailable. Please try again later.", 503);
  return (data || []).map(({ record }) => {
    const checked = catalogRecordSchema.safeParse(record);
    if (!checked.success || checked.data.role !== "music") throw new ServiceError("The music library needs maintenance. Please try again later.", 503);
    const track = checked.data;
    return { record: track, url: db.storage.from(MUSIC_BUCKET).getPublicUrl(track.objectPath).data.publicUrl };
  });
}
