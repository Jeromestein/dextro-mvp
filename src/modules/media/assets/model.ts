import { z } from "zod";
import { imageSchema } from "../images/schema";

export const STORY_BYTE_LIMIT = 24_000_000;
export const IMPORT_BYTE_LIMIT = 25_000_000;
export const IMAGE_BYTE_LIMIT = 2_000_000;
export const AUDIO_BYTE_LIMIT = 6_000_000;
const metadata = {
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  credit: z.string().max(1000),
  source: z.enum(["upload", "legacy", "generated", "catalog"]),
  provenance: z.discriminatedUnion("provider", [
    z.object({ provider: z.literal("openai"), model: z.string().max(100), prompt: z.string().max(8000), createdAt: z.string().max(50) }),
    z.object({ provider: z.enum(["kenney", "freesound"]), catalogId: z.string().max(100), sourceUrl: z.string().url().max(500), author: z.string().max(100), license: z.literal("CC0-1.0"), licenseUrl: z.literal("https://creativecommons.org/publicdomain/zero/1.0/"), verifiedAt: z.string().max(50) }),
  ]).optional(),
};
export const assetSchema = z.discriminatedUnion("kind", [
  z.object({ ...metadata, kind: z.literal("image"), data: imageSchema.refine(Boolean, "An image file is required.") }),
  z.object({ ...metadata, kind: z.literal("audio"), data: z.string().max(8_000_100)
    .regex(/^data:audio\/(mpeg|mp4|ogg|wav|webm);base64,[A-Za-z0-9+/]+={0,2}$/, "Use an embedded audio file.") }),
]);
export const passageMediaSchema = z.object({ imageId: z.string().max(100), audioId: z.string().max(100) });
export type MediaAsset = z.infer<typeof assetSchema>;
export type MediaKind = MediaAsset["kind"];
export const emptyMedia = () => ({ imageId: "", audioId: "" });
