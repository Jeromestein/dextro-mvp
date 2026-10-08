import type { Story } from "@/modules/story/model";
import { readCloudStory } from "./cloud-repository";
import { discardPendingIfUnchanged, pendingSaves, type PendingSave } from "./cloud-outbox";

function content(story: Story): string {
  // Ignore only timestamps and the camera, never passage positions or content.
  return JSON.stringify({ ...story, updatedAt: undefined,
    editor: story.editor?.positions.length ? { positions: story.editor.positions } : undefined,
  }, (_, value) => value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
}

export async function recoverViewportSaves(scope: string, pending: PendingSave[]) {
  const recovered: Awaited<ReturnType<typeof readCloudStory>>[] = [];
  const groups = new Map<string, PendingSave[]>();
  for (const entry of pending) groups.set(entry.story.id, [...(groups.get(entry.story.id) || []), entry]);
  for (const [id, entries] of groups) {
    const first = entries[0], expected = content(first.story), status = first.status || "ready";
    // Mixed content edits or a new story always retain the entire recovery chain.
    if (!first.baseRevision || entries.some(entry => content(entry.story) !== expected || (entry.status || "ready") !== status)) continue;
    try {
      const latest = await readCloudStory(id);
      const matches = (saved: typeof latest) => saved.status === status && content(saved.story) === expected;
      if (!matches(latest)) {
        const base = latest.revision === first.baseRevision ? latest : await readCloudStory(id, first.baseRevision);
        if (!matches(base)) continue;
      }
      // No rebasing or resubmission: there is no local content change to save.
      if (await discardPendingIfUnchanged(scope, entries)) recovered.push(latest);
    } catch { /* If comparison is unavailable, keep every local recovery copy. */ }
  }
  return { pending: pending.length ? await pendingSaves(scope) : pending, recovered };
}
