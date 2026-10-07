import { DEFAULT_IMAGE_MODEL, DEFAULT_STORY_MODEL, IMAGE_MODELS, STORY_MODELS } from "@/modules/connections/models";
import { ServiceError } from "./errors";

export const apiConfigured = () => Boolean(process.env.OPENAI_API_KEY?.trim());
export function modelSettings(kind: "story" | "image") {
  const model = (kind === "story" ? process.env.OPENAI_MODEL : process.env.OPENAI_IMAGE_MODEL)?.trim()
    || (kind === "story" ? DEFAULT_STORY_MODEL : DEFAULT_IMAGE_MODEL);
  const options = kind === "story" ? STORY_MODELS : IMAGE_MODELS;
  return { model, models: options.some((option) => option.id === model) ? options : [{ id: model, name: model }, ...options] };
}
export function selectedModel(kind: "story" | "image", requested?: string) {
  const settings = modelSettings(kind);
  const model = requested || settings.model;
  if (!settings.models.some((option) => option.id === model))
    throw new ServiceError(`Choose an available ${kind} model in Settings.`, 400);
  return model;
}
