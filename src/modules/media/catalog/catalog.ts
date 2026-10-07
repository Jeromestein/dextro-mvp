import { z } from "zod";
import { readMediaFile } from "../assets/read-file";
import type { MediaAsset } from "../assets/model";
import { catalogAssetId, catalogTrackSchema, type CatalogTrack } from "./model";

export async function fetchMusicCatalog(signal: AbortSignal): Promise<CatalogTrack[]> {
  const response = await fetch("/api/media/music", { signal, cache: "no-store" });
  if (!response.ok) throw new Error("The music library is unavailable. Try again in a moment.");
  const result = z.object({ tracks: z.array(catalogTrackSchema).max(500) }).safeParse(await response.json());
  if (!result.success) throw new Error("The music library could not be read. Please try again later.");
  signal.throwIfAborted();
  return result.data.tracks.filter(track => track.role === "music");
}

export async function loadCatalogTrack(track: CatalogTrack, signal: AbortSignal): Promise<MediaAsset> {
  const response = await fetch(track.url, { signal });
  if (!response.ok) throw new Error("Could not load this library track. Try again.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("This library track is empty.");
  const chunks: Uint8Array<ArrayBuffer>[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > track.byteSize) { await reader.cancel(); throw new Error("This library track failed its integrity check."); }
      chunks.push(new Uint8Array(value));
    }
  } finally { reader.releaseLock(); }
  signal.throwIfAborted();
  const blob = new Blob(chunks, { type: track.mimeType });
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  if (size !== track.byteSize || hash !== track.sha256) throw new Error("This library track failed its integrity check. Please choose another track.");
  const file = await readMediaFile(new File([blob], track.title, { type: track.mimeType }), "audio");
  signal.throwIfAborted();
  return { ...file, id: catalogAssetId(track), name: track.title, source: "catalog",
    credit: `${track.originalTitle} — ${track.author} (${track.provider}) · CC0 1.0 · ${track.sourceUrl}`,
    provenance: { provider: track.provider, catalogId: track.id, sourceUrl: track.sourceUrl,
      author: track.author, license: track.license, licenseUrl: track.licenseUrl, verifiedAt: track.verifiedAt },
  };
}
