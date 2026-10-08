import { z } from "zod";
import { passageSchema, type Story } from "@/modules/story/model";

export const releaseAssetSchema = z.object({
  id: z.string().min(1).max(100), name: z.string().min(1).max(200), credit: z.string().max(1000),
  kind: z.enum(["image", "audio"]), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/webm"]),
  byteSize: z.number().int().positive().max(6_000_000),
});
export const releaseContentSchema = z.object({
  title: z.string().min(1).max(200), description: z.string().max(1000), genre: z.string().max(50),
  startId: z.string().max(100), passages: z.array(passageSchema).min(1).max(150),
  appearance: z.object({ sceneGlow: z.boolean() }), assets: z.array(releaseAssetSchema).max(300),
});
export const manifestSchema = z.object({
  publicId: z.uuid(), releaseId: z.uuid(), publishedAt: z.string(), content: releaseContentSchema,
});
export type ReleaseAsset = z.infer<typeof releaseAssetSchema>;
export type ReleaseContent = z.infer<typeof releaseContentSchema>;
export type PublicManifest = z.infer<typeof manifestSchema>;
export type Publication = { publicId: string; releaseId: string | null; revision: number; contentHash: string; publishedAt: string | null; changed?: boolean };
export type PublicationStatus = { available: boolean; publication: Publication | null; error?: string };
export type PublicationInput = { mutationId: string; expectedPublicationRevision: number; sourceRevision: number };
type ContentSource = Pick<Story, "title" | "description" | "genre" | "startId" | "passages" | "appearance">;

export function usedAssetIds(source: Pick<Story, "passages">) {
  return new Set(source.passages.flatMap(p => [p.media.imageId, p.media.audioId]).filter(Boolean));
}

// An explicit reader projection also defines what counts as an unpublished change.
export function projectContent(source: ContentSource, assets: ReleaseAsset[]): ReleaseContent {
  const used = usedAssetIds(source);
  return {
    title: source.title, description: source.description, genre: source.genre, startId: source.startId,
    passages: source.passages.map(p => passageSchema.parse(p)).sort((a, b) => a.id.localeCompare(b.id, "en")),
    appearance: { sceneGlow: source.appearance?.sceneGlow !== false },
    assets: assets.filter(a => used.has(a.id)).map(a => releaseAssetSchema.parse(a)).sort((a, b) => a.id.localeCompare(b.id, "en")),
  };
}

export const contentKey = (content: ReleaseContent) => JSON.stringify(projectContent(content, content.assets));
export const publicPath = (id: string) => `/s/${encodeURIComponent(id)}`;
export const mediaPath = (manifest: Pick<PublicManifest, "publicId" | "releaseId">, id: string) =>
  `/api/public/stories/${encodeURIComponent(manifest.publicId)}/releases/${encodeURIComponent(manifest.releaseId)}/assets/${encodeURIComponent(id)}`;
export function publicationLabel(publication?: Publication | null) {
  if (!publication) return "Draft";
  if (!publication.releaseId) return "Unpublished";
  return publication.changed ? "Public · Unpublished changes" : "Public";
}

const digests = new WeakMap<Story["assets"][number], Promise<ReleaseAsset>>();
export async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function storyContentHash(story: Story) {
  const used = usedAssetIds(story);
  const assets = await Promise.all(story.assets.filter(a => used.has(a.id)).map(asset => {
    let digest = digests.get(asset);
    if (!digest) {
      digest = (async () => {
        const [header, data] = asset.data.split(",");
        const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
        return releaseAssetSchema.parse({ id: asset.id, name: asset.name, credit: asset.credit, kind: asset.kind,
          mimeType: header.slice(5).split(";")[0], byteSize: bytes.length, sha256: await sha256(bytes) });
      })();
      digests.set(asset, digest);
    }
    return digest;
  }));
  return sha256(new TextEncoder().encode(contentKey(projectContent(story, assets))));
}
