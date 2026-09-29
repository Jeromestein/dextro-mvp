import { z } from "zod";
export const imageSchema = z
  .string()
  .max(2_900_000)
  .refine(
    (value) =>
      value === "" ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value),
    "Only embedded PNG, JPEG or WebP images are supported.",
  );
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
  image: imageSchema,
  choices: z.array(choiceSchema).max(8),
});
export const storySchema = z
  .object({
    version: z.literal(1),
    id: z.string().min(1).max(100),
    title: z.string().max(200),
    description: z.string().max(1000),
    genre: z.string().max(50),
    updatedAt: z.string().max(50),
    startId: z.string().max(100),
    passages: z.array(passageSchema).min(1).max(150),
  })
  .superRefine((story, ctx) => {
    if (new Set(story.passages.map((p) => p.id)).size !== story.passages.length)
      ctx.addIssue({ code: "custom", message: "Passage IDs must be unique." });
    story.passages.forEach((p) => {
      if (new Set(p.choices.map((c) => c.id)).size !== p.choices.length)
        ctx.addIssue({
          code: "custom",
          message: "Choice IDs must be unique within each passage.",
        });
    });
  });
export type Story = z.infer<typeof storySchema>;
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
    image: "",
    choices: [],
  };
}
export function newStory(title = "Untitled story"): Story {
  const opening = newPassage();
  opening.title = "The beginning";
  return {
    version: 1,
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
