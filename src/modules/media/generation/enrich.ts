import type { Story } from "@/modules/story/model";
import { addAndAssignAsset, requireStorySize } from "../assets/operations";
import { loadCatalogTrack, matchTrack } from "../catalog/catalog";
import { requestSceneImage } from "./client";
import { sceneRevision, type VisualStyle } from "./plan";

export type EnrichmentOptions = {
  music: boolean; images: boolean; style: VisualStyle; imageModel?: string;
  signal: AbortSignal;
  onUpdate: (story: Story) => void; onStatus: (status: string) => void;
};
// Work is sequential and bounded to four images. Cancellation never retries billing.
export async function enrichStoryMedia(source: Story, options: EnrichmentOptions) {
  let story = source;
  const warnings: string[] = [];
  const plan = source.mediaPlan;
  if (!plan) return ["No media plan is available. Add images and music in the Media panel."];
  if (options.music) {
    const trackIds = [...new Set(plan.cues.map((cue) => matchTrack(cue.mood)?.id).filter((id): id is string => Boolean(id)))];
    for (const trackId of trackIds) {
      options.signal.throwIfAborted();
      options.onStatus("Matching CC0 music…");
      try {
        const asset = await loadCatalogTrack(trackId, options.signal);
        let next = story;
        for (const cue of plan.cues) {
          if (matchTrack(cue.mood)?.id !== trackId || next.passages.find((p) => p.id === cue.passageId)?.media.audioId) continue;
          next = addAndAssignAsset(next, cue.passageId, asset);
        }
        requireStorySize(next); story = next; options.onUpdate(story);
      } catch (e) { if (options.signal.aborted) throw e; warnings.push("A music track could not be added. Choose it in the Media panel."); }
    }
  }
  if (options.images) {
    const scenes = plan.scenes.filter((scene) => scene.passageIds.some((id) => story.passages.some((p) => p.id === id && !p.media.imageId))).slice(0, 4);
    let completed = 0;
    for (const scene of scenes) {
      options.signal.throwIfAborted();
      if (scene.revision !== sceneRevision(story, scene.passageIds)) {
        warnings.push("A planned scene changed. Generate its current image from the passage Media panel."); continue;
      }
      options.onStatus(`Generating scenes · ${completed}/${scenes.length} ready`);
      try {
        const asset = await requestSceneImage({ title: story.title, artBrief: plan.artBrief, scene: scene.description, style: options.style, model: options.imageModel }, options.signal);
        options.signal.throwIfAborted();
        let next = story;
        for (const id of scene.passageIds) {
          if (!next.passages.find((p) => p.id === id)?.media.imageId) next = addAndAssignAsset(next, id, asset);
        }
        requireStorySize(next); story = next; completed++; options.onUpdate(story);
      } catch (e) { if (options.signal.aborted) throw e; warnings.push(e instanceof Error ? e.message : "A scene could not be generated."); }
    }
    options.onStatus(`Images ${completed}/${scenes.length} ready${warnings.length ? " · Some media needs attention" : ""}`);
  } else options.onStatus("Music matched · Draft ready");
  return [...new Set(warnings)];
}
