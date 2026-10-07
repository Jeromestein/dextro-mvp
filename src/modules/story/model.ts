import { z } from "zod";
import { appearanceSchema } from "./themes";
import { imageSchema } from "@/modules/media/images/schema";
import { mediaPlanSchema } from "@/modules/media/generation/plan";
import { assetSchema, emptyMedia, passageMediaSchema, type MediaAsset } from "@/modules/media/assets/model";

export const choiceSchema = z.object({
  id: z.string().min(1).max(100),
  text: z.string().max(300),
  target: z.string().max(100),
});
export const passageSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().max(200),
  text: z.string().max(12000),
  ending: z.boolean(),
  media: passageMediaSchema,
  choices: z.array(choiceSchema).max(8),
});
export const GRAPH_COORDINATE_LIMIT = 100000;
export const editorLayoutSchema = z.object({
  positions: z.array(z.object({
    id: z.string().min(1).max(100),
    x: z.number().finite().min(-GRAPH_COORDINATE_LIMIT).max(GRAPH_COORDINATE_LIMIT),
    y: z.number().finite().min(-GRAPH_COORDINATE_LIMIT).max(GRAPH_COORDINATE_LIMIT),
  })).max(150).refine((items) => new Set(items.map((p) => p.id)).size === items.length,
    "Layout passage IDs must be unique."),
  viewport: z.object({
    x: z.number().finite().min(-GRAPH_COORDINATE_LIMIT * 10).max(GRAPH_COORDINATE_LIMIT * 10),
    y: z.number().finite().min(-GRAPH_COORDINATE_LIMIT * 10).max(GRAPH_COORDINATE_LIMIT * 10),
    zoom: z.number().finite().min(0.2).max(2),
  }).optional(),
});
const legacyPassageSchema = passageSchema.omit({ media: true }).extend({ image: imageSchema });
const commonStorySchema = z
  .object({
    version: z.literal(2),
    id: z.string().min(1).max(100),
    title: z.string().max(200),
    description: z.string().max(1000),
    genre: z.string().max(50),
    updatedAt: z.string().max(50),
    startId: z.string().max(100),
    passages: z.array(passageSchema).min(1).max(150),
    assets: z.array(assetSchema).max(300),
    editor: editorLayoutSchema.optional(),
    mediaPlan: mediaPlanSchema.optional(),
    appearance: appearanceSchema.optional(),
  });
export const currentStorySchema = commonStorySchema.superRefine((story, ctx) => {
    if (new Set(story.passages.map((p) => p.id)).size !== story.passages.length)
      ctx.addIssue({ code: "custom", message: "Passage IDs must be unique." });
    if (new Set(story.assets.map((a) => a.id)).size !== story.assets.length)
      ctx.addIssue({ code: "custom", message: "Media asset IDs must be unique." });
    for (const p of story.passages) {
      for (const [kind, id] of [["image", p.media.imageId], ["audio", p.media.audioId]]) {
        if (id && !story.assets.some((a) => a.id === id && a.kind === kind))
          ctx.addIssue({ code: "custom", message: `${p.title}: missing or mismatched ${kind} asset.` });
      }
    }
    story.passages.forEach((p) => {
      if (new Set(p.choices.map((c) => c.id)).size !== p.choices.length)
        ctx.addIssue({
          code: "custom",
          message: "Choice IDs must be unique within each passage.",
        });
    });
  });
const legacyStorySchema = commonStorySchema.omit({ assets: true }).extend({
  version: z.literal(1), passages: z.array(legacyPassageSchema).min(1).max(150),
});
// Reading never writes the migration back; the repository saves it atomically on an edit.
export const storySchema = z.union([currentStorySchema, legacyStorySchema.transform((old) => {
  const assets: MediaAsset[] = [];
  const images = new Map<string, string>();
  const passages = old.passages.map(({ image, ...passage }) => {
    let imageId = images.get(image) || "";
    if (image && !imageId) {
      imageId = `legacy-image-${assets.length + 1}`;
      images.set(image, imageId);
      assets.push({ id: imageId, kind: "image", name: passage.title || "Scene image", data: image, source: "legacy", credit: "" });
    }
    return { ...passage, media: { imageId, audioId: "" } };
  });
  return { ...old, version: 2 as const, passages, assets };
}).pipe(currentStorySchema)]);
export type Story = z.infer<typeof currentStorySchema>;
export type Passage = z.infer<typeof passageSchema>;
export type Issue = {
  level: "error" | "warning";
  passageId?: string;
  message: string;
};
export const uid = () => crypto.randomUUID();
export function newPassage(): Passage {
  return {
    id: uid(),
    title: "Untitled passage",
    text: "",
    ending: false,
    media: emptyMedia(),
    choices: [],
  };
}
export function newStory(title = "Untitled story"): Story {
  const opening = newPassage();
  opening.title = "The beginning";
  return {
    version: 2,
    assets: [],
    id: uid(),
    title,
    description: "",
    genre: "Adventure",
    updatedAt: new Date().toISOString(),
    startId: opening.id,
    passages: [opening],
  };
}
export function passageById(story: Story, id: string) {
  return story.passages.find((p) => p.id === id);
}
export function validateStory(story: Story): Issue[] {
  const issues: Issue[] = [];
  const ids = new Set(story.passages.map((p) => p.id));
  if (!story.title.trim())
    issues.push({ level: "error", message: "Give your story a title." });
  if (!ids.has(story.startId))
    issues.push({ level: "error", message: "Choose an opening passage." });
  const reached = new Set<string>();
  const queue = [story.startId];
  while (queue.length) {
    const id = queue.pop()!;
    if (reached.has(id)) continue;
    reached.add(id);
    const p = passageById(story, id);
    if (p && !p.ending)
      queue.push(...p.choices.map((c) => c.target).filter((t) => ids.has(t)));
  }
  const canEnd = new Set(
    story.passages.filter((p) => p.ending).map((p) => p.id),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of story.passages)
      if (!canEnd.has(p.id) && p.choices.some((c) => canEnd.has(c.target))) {
        canEnd.add(p.id);
        changed = true;
      }
  }
  for (const p of story.passages) {
    const label = p.title.trim() || "Untitled passage";
    if (!p.text.trim())
      issues.push({
        level: "error",
        passageId: p.id,
        message: `${label}: add some story text.`,
      });
    if (!p.ending && !p.choices.length)
      issues.push({
        level: "error",
        passageId: p.id,
        message: `${label}: add a choice or mark it as an ending.`,
      });
    if (p.ending && p.choices.length)
      issues.push({
        level: "error",
        passageId: p.id,
        message: `${label}: endings cannot have outgoing choices.`,
      });
    for (const c of p.choices) {
      if (!c.text.trim())
        issues.push({
          level: "error",
          passageId: p.id,
          message: `${label}: a choice needs a label.`,
        });
      if (!ids.has(c.target))
        issues.push({
          level: "error",
          passageId: p.id,
          message: `${label}: connect every choice to a passage.`,
        });
    }
    if (!reached.has(p.id))
      issues.push({
        level: "warning",
        passageId: p.id,
        message: `${label}: this passage cannot be reached from the opening.`,
      });
    else if (!canEnd.has(p.id))
      issues.push({
        level: "error",
        passageId: p.id,
        message: `${label}: there is no route to an ending.`,
      });
  }
  return issues;
}
export function copyStory(story: Story): Story {
  return {
    ...structuredClone(story),
    id: uid(),
    updatedAt: new Date().toISOString(),
  };
}
