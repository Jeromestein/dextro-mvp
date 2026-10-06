import records from "./tracks.json";
import { readMediaFile } from "../assets/read-file";
import type { MediaAsset } from "../assets/model";
import type { Mood } from "../generation/plan";

export const musicCatalog = records;
export type CatalogTrack = typeof records[number];
export function matchTrack(mood: Mood) {
  if (mood === "silence") return;
  return musicCatalog.find((track) => track.mood === mood);
}
export async function loadCatalogTrack(id: string, signal: AbortSignal): Promise<MediaAsset> {
  const track = musicCatalog.find((item) => item.id === id);
  if (!track) throw new Error("That track is not in the CC0 library.");
  const response = await fetch(track.path, { signal });
  if (!response.ok) throw new Error("Could not load this library track. Try again.");
  const blob = await response.blob();
  signal.throwIfAborted();
  const file = await readMediaFile(new File([blob], track.title, { type: "audio/mpeg" }), "audio");
  signal.throwIfAborted();
  return { ...file, id: `catalog-${id}`, name: track.title, source: "catalog",
    credit: `${track.title} — ${track.author} (${track.provider}) · CC0 1.0 · ${track.sourceUrl}`,
    provenance: { provider: track.provider as "freesound" | "kenney", catalogId: id, sourceUrl: track.sourceUrl,
      author: track.author, license: "CC0-1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", verifiedAt: track.verifiedAt },
  };
}
