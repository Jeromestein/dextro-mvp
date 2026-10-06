import { GRAPH_COORDINATE_LIMIT, type Story } from "@/modules/story/model";

import { positionsFor, coordinate } from "../graph/layout";
import type { Viewport } from "./types";

export type History = { present: Story; past: Story[]; future: Story[]; group?: string; time: number };
export type HistoryAction =
  | { type: "commit"; story: Story; group?: string; time: number }
  | { type: "undo" | "redo" | "break-group" }
  | { type: "viewport"; viewport: Viewport };
export const createHistory = (story: Story): History => ({ present: story, past: [], future: [], time: 0 });
function retainViewport(story: Story, current: Story): Story {
  return current.editor?.viewport ? { ...story, editor: { positions: positionsFor(story), ...story.editor,
    viewport: current.editor.viewport } } : story;
}
export function editorReducer(state: History, action: HistoryAction): History {
  if (action.type === "break-group") return { ...state, group: undefined };
  if (action.type === "viewport") {
    const viewport = { x: coordinate(action.viewport.x, GRAPH_COORDINATE_LIMIT * 10),
      y: coordinate(action.viewport.y, GRAPH_COORDINATE_LIMIT * 10),
      zoom: Number.isFinite(action.viewport.zoom) ? Math.max(.2, Math.min(2, action.viewport.zoom)) : 1 };
    const old = state.present.editor?.viewport;
    if (old && old.x === viewport.x && old.y === viewport.y && old.zoom === viewport.zoom) return state;
    return { ...state, present: { ...state.present, editor: { positions: positionsFor(state.present),
      ...state.present.editor, viewport } } };
  }
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    return previous ? { present: retainViewport(previous, state.present), past: state.past.slice(0, -1),
      future: [state.present, ...state.future], time: 0 } : state;
  }
  if (action.type === "redo") {
    const next = state.future[0];
    return next ? { present: retainViewport(next, state.present), past: [...state.past, state.present],
      future: state.future.slice(1), time: 0 } : state;
  }
  if (action.type === "commit") {
    if (action.story === state.present) return state;
    const grouped = action.group && action.group === state.group && action.time - state.time < 1000;
    return { present: action.story, past: grouped ? state.past : [...state.past, state.present].slice(-50),
      future: [], group: action.group, time: action.time };
  }
  return state;
}
