import type { Story, Passage } from "@/modules/story/model";
import { positionsFor, coordinate } from "../graph/layout";
import type { Point, ChoiceRef } from "./types";

export function changePassage(story: Story, id: string, changes: Partial<Passage>): Story {
  if (!story.passages.some((p) => p.id === id)) return story;
  return { ...story, passages: story.passages.map((p) => p.id === id ? { ...p, ...changes, id } : p) };
}
export function connectChoice(story: Story, ref: ChoiceRef, target: string): Story {
  const p = story.passages.find((p) => p.id === ref.passageId);
  if (!p || p.ending || !p.choices.some((c) => c.id === ref.choiceId) ||
      (target && !story.passages.some((p) => p.id === target))) return story;
  if (p.choices.find((c) => c.id === ref.choiceId)?.target === target) return story;
  return changePassage(story, p.id, { choices: p.choices.map((c) => c.id === ref.choiceId ? { ...c, target } : c) });
}
export function appendPassage(story: Story, passage: Passage, position?: Point, from?: ChoiceRef): Story {
  if (story.passages.length >= 150 || story.passages.some((p) => p.id === passage.id)) return story;
  const positions = positionsFor(story);
  const maxX = Math.max(0, ...positions.map((p) => p.x));
  const point = position || { x: maxX + 330, y: 0 };
  let next: Story = { ...story, passages: [...story.passages, passage], editor: {
    ...story.editor, positions: [...positions, { id: passage.id, x: coordinate(point.x), y: coordinate(point.y) }],
  } };
  if (from) next = connectChoice(next, from, passage.id);
  return next;
}
export function removePassage(story: Story, id: string): Story {
  if (story.passages.length <= 1 || !story.passages.some((p) => p.id === id)) return story;
  const passages = story.passages.filter((p) => p.id !== id).map((p) => ({
    ...p, choices: p.choices.map((c) => c.target === id ? { ...c, target: "" } : c),
  }));
  return { ...story, passages, startId: story.startId === id ? passages[0].id : story.startId,
    ...(story.editor ? { editor: { ...story.editor, positions: story.editor.positions.filter((p) => p.id !== id) } } : {}) };
}
