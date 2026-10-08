import { editorLayoutSchema, type Story } from "@/modules/story/model";
import type { Viewport } from "./types";

export function withoutViewport(story: Story): Story {
  if (!story.editor?.viewport) return story;
  return { ...story, editor: { positions: story.editor.positions } };
}

const key = (scope: string, id: string) => `dextro:viewport:${JSON.stringify([scope, id])}`;

export function restoreViewport(story: Story, scope: string): Story {
  try {
    const saved = sessionStorage.getItem(key(scope, story.id));
    const viewport = editorLayoutSchema.shape.viewport.parse(saved ? JSON.parse(saved) : undefined);
    if (viewport) return { ...story, editor: { positions: story.editor?.positions || [], viewport } };
  } catch { /* Storage may be disabled or contain an outdated view. */ }
  return story;
}

export function rememberViewport(scope: string, id: string, viewport: Viewport) {
  try { sessionStorage.setItem(key(scope, id), JSON.stringify(viewport)); }
  catch { /* Viewing the graph must still work without browser storage. */ }
}
