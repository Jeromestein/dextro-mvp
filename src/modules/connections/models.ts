export type ModelOption = { id: string; name: string };
export const DEFAULT_STORY_MODEL = "gpt-5.6-luna";
export const DEFAULT_IMAGE_MODEL = "gpt-image-2.5-flare";
export const STORY_MODELS: ModelOption[] = [
  { id: "gpt-5.6-luna", name: "GPT-5.6 Luna" },
  { id: "gpt-6-luna", name: "GPT-6 Luna" },
  { id: "gpt-6.1-sol", name: "GPT-6.1 Sol" },
  { id: "gpt-6-astra", name: "GPT-6 Astra" },
];
export const IMAGE_MODELS: ModelOption[] = [
  { id: "gpt-image-2.5-flare", name: "GPT Image 2.5 Flare" },
  { id: "gpt-image-2.5-sunburst", name: "GPT Image 2.5 Sunburst" },
];
