import { GRAPH_COORDINATE_LIMIT, type Passage, type Story } from "@/modules/story/model";

import type { Positions } from "../session/types";

export const NODE_WIDTH = 250;
export const nodeHeight = (p: Passage) => 92 + (p.ending ? 30 : p.choices.length * 38 + 38);
export const coordinate = (value: number, limit = GRAPH_COORDINATE_LIMIT) => Number.isFinite(value) ? Math.max(-limit, Math.min(limit, value)) : 0;

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
