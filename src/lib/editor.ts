import { GRAPH_COORDINATE_LIMIT, type Passage, type Story } from "./story";

export type Point = { x: number; y: number };
export type Positions = { id: string; x: number; y: number }[];
export type Viewport = { x: number; y: number; zoom: number };
export type ChoiceRef = { passageId: string; choiceId: string };
export const NODE_WIDTH = 250;
export const nodeHeight = (p: Passage) => 92 + (p.ending ? 30 : p.choices.length * 38 + 38);
const coordinate = (value: number, limit = GRAPH_COORDINATE_LIMIT) => Number.isFinite(value) ? Math.max(-limit, Math.min(limit, value)) : 0;

export function positionsFor(story: Story): Positions {
  const saved = new Map(story.editor?.positions.map((p) => [p.id, p]));
  return story.passages.map((p, i) => saved.get(p.id) || {
    id: p.id, x: (i % 3) * 330, y: Math.floor(i / 3) * 450,
  });
}
export function setPositions(story: Story, positions: Positions): Story {
  const changes = new Map(positions.map((p) => [p.id, { id: p.id, x: coordinate(p.x), y: coordinate(p.y) }]));
  const previous = positionsFor(story);
  const next = previous.map((p) => changes.get(p.id) || p);
  if (story.editor && next.every((p, i) => p.x === previous[i].x && p.y === previous[i].y)) return story;
  return { ...story, editor: { ...story.editor, positions: next } };
}
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

export type OutlineBranch = { choice: Passage["choices"][number]; child?: OutlineItem; reference?: "loop" | "shared" | "missing" };
export type OutlineItem = { passage: Passage; branches: OutlineBranch[]; disconnected?: boolean };
export function outlineFor(story: Story): OutlineItem[] {
  const byId = new Map(story.passages.map((p) => [p.id, p]));
  const visited = new Set<string>();
  const visit = (id: string, ancestors: Set<string>): OutlineItem => {
    const p = byId.get(id)!;
    visited.add(id);
    const path = new Set([...ancestors, id]);
    return { passage: p, branches: p.choices.map((choice): OutlineBranch => {
      if (!byId.has(choice.target)) return { choice, reference: "missing" };
      if (path.has(choice.target)) return { choice, reference: "loop" };
      if (visited.has(choice.target)) return { choice, reference: "shared" };
      return { choice, child: visit(choice.target, path) };
    }) };
  };
  const roots: OutlineItem[] = [];
  if (byId.has(story.startId)) roots.push(visit(story.startId, new Set()));
  story.passages.forEach((p) => { if (!visited.has(p.id)) roots.push({ ...visit(p.id, new Set()), disconnected: true }); });
  return roots;
}

// Detect edits while an asynchronous layout is running, including manual moves.
export function layoutSignature(story: Story): string {
  return JSON.stringify([story.startId, story.passages.map((p) => [p.id, p.ending, p.choices.map((c) => [c.id, c.target])]), positionsFor(story)]);
}

export async function autoLayout(story: Story): Promise<Positions> {
  const { default: ELK } = await import("elkjs/lib/elk.bundled.js");
  const graph = await new ELK().layout({
    id: "story-root",
    layoutOptions: { "elk.algorithm": "layered", "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "65", "elk.layered.spacing.nodeNodeBetweenLayers": "115",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES" },
    children: story.passages.map((p, i) => ({
      id: `node-${i}`, width: NODE_WIDTH, height: nodeHeight(p),
      layoutOptions: { "org.eclipse.elk.portConstraints": "FIXED_ORDER" },
      ports: [{ id: `input-${i}`, properties: { "port.side": "WEST" } },
        ...p.choices.map((_, j) => ({ id: `output-${i}-${j}`, properties: { "port.side": "EAST" } }))],
    })),
    edges: story.passages.flatMap((p, i) => p.ending ? [] : p.choices.flatMap((c, j) => {
      const target = story.passages.findIndex((p) => p.id === c.target);
      return target < 0 ? [] : [{ id: `edge-${i}-${j}`, sources: [`output-${i}-${j}`], targets: [`input-${target}`] }];
    })),
  });
  return (graph.children || []).map((n) => ({ id: story.passages[Number(n.id.slice(5))].id, x: n.x || 0, y: n.y || 0 }));
}
