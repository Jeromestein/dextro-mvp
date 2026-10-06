import type { Passage, Story } from "@/modules/story/model";
import type { MediaAsset, MediaKind } from "./model";
import { STORY_BYTE_LIMIT } from "./model";

export function assignedAsset(story: Story, passage: Passage | undefined, kind: MediaKind) {
  const id = passage?.media[kind === "image" ? "imageId" : "audioId"];
  return story.assets.find((asset) => asset.id === id && asset.kind === kind);
}
export function assignAsset(story: Story, passageId: string, kind: MediaKind, assetId: string): Story {
  const key = kind === "image" ? "imageId" : "audioId";
  if (assetId && !story.assets.some((a) => a.id === assetId && a.kind === kind)) return story;
  const passage = story.passages.find((p) => p.id === passageId);
  if (!passage || passage.media[key] === assetId) return story;
  return { ...story, passages: story.passages.map((p) => p.id === passageId ? { ...p, media: { ...p.media, [key]: assetId } } : p) };
}
export function addAndAssignAsset(story: Story, passageId: string, asset: MediaAsset): Story {
  if (!story.passages.some((p) => p.id === passageId)) return story;
  const existing = story.assets.find((a) => a.kind === asset.kind && a.data === asset.data);
  if (existing) return assignAsset(story, passageId, asset.kind, existing.id);
  if (story.assets.some((a) => a.id === asset.id)) return story;
  return assignAsset({ ...story, assets: [...story.assets, asset] }, passageId, asset.kind, asset.id);
}
export function usedAssets(story: Story) {
  const used = new Set(story.passages.flatMap((p) => [p.media.imageId, p.media.audioId]));
  return story.assets.filter((a) => used.has(a.id));
}
export function pruneAssets(story: Story): Story {
  const assets = usedAssets(story);
  return assets.length === story.assets.length ? story : { ...story, assets };
}
// Base64 is ASCII: count it without serializing or copying media on each text edit.
export function storyByteSize(story: Story): number {
  const metadata = { ...story, assets: story.assets.map((asset) => ({ ...asset, data: "" })) };
  return new TextEncoder().encode(JSON.stringify(metadata)).length + story.assets.reduce((bytes, a) => bytes + a.data.length, 0);
}
export function requireStorySize(story: Story) {
  if (story.assets.length > 300) throw new Error("This story has reached the 300-file limit. Remove unused media first.");
  if (storyByteSize(story) > STORY_BYTE_LIMIT)
    throw new Error("This story exceeds the 24 MB limit. Remove unused media or choose smaller files.");
}
