import type { Story, Passage } from "@/modules/story/model";

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
