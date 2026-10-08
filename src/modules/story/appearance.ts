import { z } from "zod";

const legacyTheme = z.enum(["midnight", "starlight", "parchment", "garden"]);
export const appearanceSchema = z.object({
  // Keep legacy metadata readable in saved stories and backups; it no longer styles the player.
  theme: z.union([z.literal("auto"), legacyTheme]).optional(),
  recommendation: legacyTheme.optional(),
  sceneGlow: z.boolean().optional(),
});
type Appearance = z.infer<typeof appearanceSchema>;
type AppearanceStory = { appearance?: Appearance };

export function changeSceneGlow<T extends AppearanceStory>(story: T, sceneGlow: boolean): T {
  return { ...story, appearance: { ...story.appearance, sceneGlow } };
}

// Media can finish after scene glow has been changed. Preserve the latest setting.
export function preserveAppearance<T extends AppearanceStory>(current: T, incoming: T): T {
  return { ...incoming, appearance: current.appearance };
}
