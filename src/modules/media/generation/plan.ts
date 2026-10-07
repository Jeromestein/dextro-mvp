import { z } from "zod";
import type { Story } from "@/modules/story/model";

export const moodSchema = z.enum(["calm", "mysterious", "tense", "hopeful", "somber", "silence"]);
export const visualStyleSchema = z.enum(["storybook", "cinematic"]);
export const mediaPlanSchema = z.object({
  artBrief: z.string().min(1).max(1500),
  scenes: z.array(z.object({
    id: z.string().min(1).max(100),
    description: z.string().min(1).max(2000),
    passageIds: z.array(z.string().min(1).max(100)).min(1).max(150),
    revision: z.string().max(100).optional(),
  })).max(4),
  cues: z.array(z.object({ passageId: z.string().min(1).max(100), mood: moodSchema })).max(150),
});
export type MediaPlan = z.infer<typeof mediaPlanSchema>;
export type Mood = z.infer<typeof moodSchema>;
export type VisualStyle = z.infer<typeof visualStyleSchema>;
export function validMediaPlan(raw: unknown, passageIds: string[]): MediaPlan | undefined {
  const result = mediaPlanSchema.safeParse(raw);
  if (!result.success) return;
  const plan = result.data, known = new Set(passageIds);
  const scenes = plan.scenes.map((s) => s.id);
  const assignments = plan.scenes.flatMap((s) => s.passageIds);
  const cues = plan.cues.map((c) => c.passageId);
  if (new Set(scenes).size !== scenes.length || new Set(assignments).size !== assignments.length ||
    new Set(cues).size !== cues.length || [...assignments, ...cues].some((id) => !known.has(id))) return;
  return plan;
}
export const imageRequestSchema = z.object({
  requestId: z.string().uuid(),
  model: z.string().min(1).max(100).optional(),
  title: z.string().max(200),
  artBrief: z.string().max(1500),
  scene: z.string().trim().min(10).max(4000),
  style: visualStyleSchema,
});
export type ImageRequest = z.infer<typeof imageRequestSchema>;
// A compact content fingerprint, used only for stale-plan detection, not security.
export function sceneRevision(story: Story, ids: string[]) {
  const text = JSON.stringify([story.genre, story.description, ids.map((id) => {
    const p = story.passages.find((item) => item.id === id);
    return p ? [p.id, p.title, p.text, p.ending] : [id, null];
  })]);
  let hash = 14695981039346656037n;
  for (const byte of new TextEncoder().encode(text)) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 1099511628211n);
  return hash.toString(16);
}
export function bindMediaPlan(story: Story): Story {
  if (!story.mediaPlan) return story;
  return { ...story, mediaPlan: { ...story.mediaPlan, scenes: story.mediaPlan.scenes.map((scene) => ({ ...scene, revision: sceneRevision(story, scene.passageIds) })) } };
}
export function imageBrief(story: Story, passageId: string) {
  const passage = story.passages.find((p) => p.id === passageId);
  const scene = story.mediaPlan?.scenes.find((s) => s.passageIds.includes(passageId));
  return {
    artBrief: story.mediaPlan?.artBrief || `${story.genre}. ${story.description}`.slice(0, 1500),
    scene: scene && scene.revision === sceneRevision(story, scene.passageIds) ? scene.description : `${passage?.title || ""}\n${passage?.text || ""}`.slice(0, 4000),
  };
}
