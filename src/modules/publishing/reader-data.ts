import { storySchema, type Story } from "@/modules/story/model";
import { requireStorySize } from "@/modules/media/assets/operations";
import { STORY_BYTE_LIMIT } from "@/modules/media/assets/model";
import { manifestSchema, mediaPath, sha256, type PublicManifest } from "./model";

async function readManifest(publicId: string, signal: AbortSignal): Promise<PublicManifest> {
  const response = await fetch(`/api/public/stories/${encodeURIComponent(publicId)}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(response.status === 404 ? "This story is no longer public." : "The story could not load. Please try again.");
  const manifest = manifestSchema.parse(await response.json());
  if (manifest.publicId !== publicId) throw new Error("The story response did not match this link.");
  return manifest;
}
function dataURL(bytes: Uint8Array, mimeType: string) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return `data:${mimeType};base64,${btoa(binary)}`;
}
export async function loadPublicStory(publicId: string, signal: AbortSignal): Promise<Story> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const manifest = await readManifest(publicId, signal), { content } = manifest;
    const size = new TextEncoder().encode(JSON.stringify(content)).length + content.assets.reduce((total, a) => total + 4 * Math.ceil(a.byteSize / 3) + 100, 0);
    if (size > STORY_BYTE_LIMIT) throw new Error("This story exceeds the playable size limit.");
    const assets: Story["assets"] = [];
    let changed = false;
    for (let i = 0; i < content.assets.length && !changed; i += 4) {
      const batch = await Promise.all(content.assets.slice(i, i + 4).map(async asset => {
        const response = await fetch(mediaPath(manifest, asset.id), { cache: "no-store", signal });
        if (response.status === 409) { changed = true; return null; }
        if (!response.ok) throw new Error(response.status === 404 ? "This story is no longer public." : "Story media could not load. Please try again.");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Story media could not load.");
        const bytes = new Uint8Array(asset.byteSize);
        let length = 0;
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            if (length + chunk.value.length > bytes.length) { await reader.cancel(); throw new Error("Story media exceeded its expected size."); }
            bytes.set(chunk.value, length); length += chunk.value.length;
          }
        } finally { reader.releaseLock(); }
        if (length !== asset.byteSize || await sha256(bytes) !== asset.sha256) throw new Error("Story media did not pass its integrity check. Please try again.");
        return { id: asset.id, name: asset.name, credit: asset.credit, kind: asset.kind, source: "upload" as const, data: dataURL(bytes, asset.mimeType) };
      }));
      assets.push(...batch.filter((a): a is NonNullable<typeof a> => a !== null));
    }
    if (changed || (await readManifest(publicId, signal)).releaseId !== manifest.releaseId) continue;
    const story = storySchema.parse({ ...content, version: 2, id: publicId, updatedAt: manifest.publishedAt, assets });
    requireStorySize(story);
    return story;
  }
  throw new Error("The author is updating this story. Please try again in a moment.");
}
