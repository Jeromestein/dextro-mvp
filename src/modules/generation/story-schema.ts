import { z } from "zod";
import { storySchema, validateStory, type Story } from "@/modules/story/model";

export const generationInputSchema = z.object({
  model: z.string().max(100).optional(),
  premise: z.string().trim().min(15).max(1500),
  tone: z.enum([
    "Mysterious",
    "Hopeful",
    "Adventurous",
    "Whimsical",
    "Suspenseful",
  ]),
  language: z.enum(["auto", "en", "zh"]).default("auto"),
});

const draftSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  genre: z.string().min(1).max(50),
  startId: z.string().min(1).max(100),
  passages: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        title: z.string().min(1).max(200),
        text: z.string().min(1).max(12000),
        ending: z.boolean(),
        choices: z
          .array(
            z.object({
              id: z.string().min(1).max(100),
              text: z.string().min(1).max(300),
              target: z.string().min(1).max(100),
            }),
          )
          .max(3),
      }),
    )
    .min(8)
    .max(12),
});

// Derive the provider schema and local validation from the same definition.
export const generationJSONSchema = z.toJSONSchema(draftSchema);
export type DraftCheck =
  | { story: Story; errors: [] }
  | { story: null; errors: string[] };
export function checkDraft(raw: unknown): DraftCheck {
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success)
    return {
      story: null,
      errors: parsed.error.issues
        .slice(0, 20)
        .map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  const result = storySchema.safeParse({
    ...parsed.data,
    version: 2,
    assets: [],
    id: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
    passages: parsed.data.passages.map((p) => ({ ...p, media: { imageId: "", audioId: "" } })),
  });
  if (!result.success)
    return { story: null, errors: result.error.issues.map((i) => i.message) };
  const story = result.data;
  const errors = validateStory(story).map((i) => i.message);
  const endings = story.passages.filter((p) => p.ending).length;
  if (endings < 2 || endings > 3) errors.push("Use 2–3 endings.");
  for (const passage of story.passages) {
    if (!passage.title.trim())
      errors.push(`${passage.id}: add a passage title.`);
    if (!passage.ending && passage.choices.length < 2)
      errors.push(`${passage.id}: non-endings need 2–3 choices.`);
  }
  return errors.length
    ? { story: null, errors: errors.slice(0, 30) }
    : { story, errors: [] };
}
