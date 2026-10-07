import { z } from "zod";

export const themeIds = ["midnight", "starlight", "parchment", "garden"] as const;
export type ThemeId = typeof themeIds[number];
export const appearanceSchema = z.object({
  theme: z.enum(["auto", ...themeIds]),
  recommendation: z.enum(themeIds).optional(),
});
export type Appearance = z.infer<typeof appearanceSchema>;
type ThemeColors = {
  backdrop: string; surface: string; text: string; narrative: string;
  muted: string; accent: string; border: string; choice: string; hover: string;
};
export type StoryTheme = {
  id: ThemeId; label: string; description: string; scheme: "dark" | "light";
  colors: ThemeColors;
};
export const storyThemes: Record<ThemeId, StoryTheme> = {
  midnight: {
    id: "midnight", label: "Midnight", description: "Dark & suspenseful", scheme: "dark",
    colors: { backdrop: "#121316", surface: "#1c1e23", text: "#f0ece4", narrative: "#d2cec6", muted: "#aaa69f", accent: "#d3b47c", border: "#55545a", choice: "#25272d", hover: "#343138" },
  },
  starlight: {
    id: "starlight", label: "Starlight", description: "Mysterious & cosmic", scheme: "dark",
    colors: { backdrop: "#101827", surface: "#192437", text: "#eef0fa", narrative: "#cbd4e5", muted: "#a2b1cb", accent: "#c2b5f5", border: "#50607c", choice: "#222f46", hover: "#303e5a" },
  },
  parchment: {
    id: "parchment", label: "Parchment", description: "Warm & adventurous", scheme: "light",
    colors: { backdrop: "#ece4d7", surface: "#fcf7ed", text: "#372e26", narrative: "#55483b", muted: "#695946", accent: "#8a572b", border: "#b9a58d", choice: "#f5ecdf", hover: "#ebddc9" },
  },
  garden: {
    id: "garden", label: "Garden", description: "Gentle & hopeful", scheme: "light",
    colors: { backdrop: "#e9ede2", surface: "#fcfcf5", text: "#283a2b", narrative: "#495944", muted: "#59664f", accent: "#42673c", border: "#a0b093", choice: "#f1f5e9", hover: "#e3ecd8" },
  },
};

type ThemeStory = {
  title: string; description: string; genre: string; startId: string;
  passages: { id: string; text: string }[]; appearance?: Appearance;
};
type ThemeBrief = { premise?: string; tone?: string };

// Use story-level signals, never the currently visited passage or its ending.
// English word boundaries avoid matching fragments such as "space" in "workspace".
export function recommendTheme(story: ThemeStory, brief: ThemeBrief = {}): ThemeId {
  const metadata = `${brief.premise || ""} ${story.genre} ${story.title} ${story.description}`;
  const opening = story.passages.find(p => p.id === story.startId)?.text.slice(0, 1800) || "";
  const text = `${metadata} ${opening}`;
  if (/\bdark\b/iu.test(story.genre) || /\bdark (story|tale|tone|atmosphere|theme)\b/iu.test(metadata)) return "midnight";
  if (/\b(horror|haunted|dystopi\w*|grimdark|gothic|nightmare\w*|terrifying|sinister|macabre|dark fantasy)\b|恐怖|惊悚|黑暗|阴森|噩梦|恶梦|反乌托邦|诡异/iu.test(text)) return "midnight";
  if (/\b(sci[ -]?fi|science fiction|space|spaceship|starship|cosmic|galaxy|galactic|cyberpunk|astronaut|orbital)\b|科幻|太空|星际|宇宙|飞船|赛博/iu.test(text)) return "starlight";
  if (/\b(thriller|suspense\w*|noir|somber|bleak)\b|悬疑惊悚|压抑|阴暗/iu.test(metadata) || brief.tone === "Suspenseful") return "midnight";
  if (/\b(cozy|cosy|whimsical|hopeful|heartwarming|gentle|healing)\b|治愈|温馨|轻松|童话/iu.test(metadata) || ["Hopeful", "Whimsical"].includes(brief.tone || "")) return "garden";
  if (/\b(mystery|mysterious|surreal)\b|神秘|悬疑/iu.test(metadata) || brief.tone === "Mysterious") return "starlight";
  return "parchment";
}

export function resolveTheme(story: ThemeStory): StoryTheme {
  const preference = story.appearance?.theme;
  return storyThemes[preference && preference !== "auto" ? preference : story.appearance?.recommendation || recommendTheme(story)];
}

export function themeVariables(theme: StoryTheme): Record<`--story-${string}`, string> {
  return Object.fromEntries(Object.entries(theme.colors).map(([key, value]) => [`--story-${key}`, value]));
}

// Only curated constant colors are serialized into standalone HTML.
export function themeDeclarations(theme: StoryTheme): string {
  return Object.entries(themeVariables(theme)).map(([key, value]) => `${key}:${value}`).join(";") + `;color-scheme:${theme.scheme}`;
}

export function changeTheme<T extends ThemeStory>(story: T, theme: Appearance["theme"]): T {
  return { ...story, appearance: { ...story.appearance, theme } };
}

// Media can finish after a draft theme has been edited. Preserve the latest choice.
export function preserveAppearance<T extends ThemeStory>(current: T, incoming: T): T {
  return { ...incoming, appearance: current.appearance };
}
