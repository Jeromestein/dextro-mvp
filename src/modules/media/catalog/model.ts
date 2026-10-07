import { z } from "zod";
import { moodSchema } from "../generation/plan";

export const MUSIC_BUCKET = "music-library";
export const musicThemes = ["cozy", "mystery", "fantasy", "scifi", "adventure", "drama"] as const;
export const catalogRecordSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,70}$/),
  title: z.string().min(1).max(160), originalTitle: z.string().max(250),
  author: z.string().min(1).max(100), provider: z.enum(["freesound", "kenney"]),
  sourceUrl: z.string().url().max(500), license: z.literal("CC0-1.0"),
  licenseUrl: z.literal("https://creativecommons.org/publicdomain/zero/1.0/"), verifiedAt: z.string().max(50),
  description: z.string().max(500), role: z.enum(["music", "sfx"]),
  moods: z.array(moodSchema.exclude(["silence"])).min(1).max(5),
  themes: z.array(z.enum(musicThemes)).min(1).max(6),
  instruments: z.array(z.string().max(40)).min(1).max(8),
  family: z.enum(["piano", "acoustic", "ambient", "electronic", "orchestral", "lofi", "jingle"]),
  energy: z.number().int().min(1).max(3),
  duration: z.number().positive().max(600), loop: z.boolean(), autoEligible: z.boolean(),
  review: z.enum(["technical-checks", "auditioned"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/), byteSize: z.number().int().positive().max(6_000_000),
  mimeType: z.enum(["audio/mpeg", "audio/ogg"]),
  objectPath: z.string().regex(/^(music|effects)\/[a-z0-9-]+\/[a-f0-9]{64}\.(mp3|ogg)$/),
}).superRefine((track, ctx) => {
  if (!track.objectPath.includes(`/${track.id}/${track.sha256}.`)) ctx.addIssue({ code: "custom", message: "Catalog path must identify the exact audio version." });
  if (track.autoEligible && (track.role !== "music" || track.duration < 25)) ctx.addIssue({ code: "custom", message: "Short effects are not automatic background music." });
  if (URL.canParse(track.sourceUrl)) {
    const host = new URL(track.sourceUrl).hostname;
    if (host !== (track.provider === "freesound" ? "freesound.org" : "kenney.nl")) ctx.addIssue({ code: "custom", message: "Use the original provider source page." });
  }
});
export const catalogTrackSchema = z.object({ record: catalogRecordSchema, url: z.string().url() }).transform(({ record, url }) => ({ ...record, url }));
export type CatalogRecord = z.infer<typeof catalogRecordSchema>;
export type CatalogTrack = CatalogRecord & { url: string };
export const catalogAssetId = (track: CatalogRecord) => `catalog-${track.id}-${track.sha256.slice(0, 12)}`;
