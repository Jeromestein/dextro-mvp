import "fake-indexeddb/auto";
import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sampleStory } from "./helpers/sample-story";
import type { Story } from "../src/modules/story/model";
import { recoverViewportSaves } from "../src/storage/viewport-recovery";
import { discardPendingIfUnchanged, pendingSaves, persistPending, type PendingSave } from "../src/storage/cloud-outbox";
import { createHistory, editorReducer } from "../src/modules/editor/session/history";
import { rememberViewport, restoreViewport, withoutViewport } from "../src/modules/editor/session/viewport";

function fixture(): Story {
  return { ...sampleStory(), id: randomUUID(), editor: {
    positions: [{ id: "arrival", x: 100, y: 200 }], viewport: { x: 0, y: 0, zoom: .8 },
  } };
}
function pending(story: Story, baseRevision = 7): PendingSave {
  const mutationId = randomUUID();
  return { key: mutationId, mutationId, story, baseRevision, createdAt: Date.now() };
}
function pan(story: Story): Story {
  return { ...story, updatedAt: "2026-10-08T00:00:00Z", editor: { ...story.editor!, viewport: { x: 400, y: 50, zoom: 1.2 } } };
}
function mockCloud(t: TestContext, latest: Story, base = latest, beforeRead?: () => Promise<void>) {
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    assert.ok(!init?.method || init.method === "GET", "recovery must never submit a story");
    assert.ok(url.startsWith(`/api/stories/${latest.id}`));
    await beforeRead?.();
    const historical = url.endsWith("?revision=7"), story = historical ? base : latest;
    return Response.json({ id: story.id, title: story.title, description: story.description, genre: story.genre,
      updatedAt: story.updatedAt, revision: historical ? 7 : 8, status: "ready",
      document: { startId: story.startId, passages: story.passages, assets: story.assets,
        editor: story.editor, appearance: story.appearance, mediaPlan: story.mediaPlan },
    });
  });
}

test("legacy camera-only saves clear together without creating a cloud revision", async t => {
  const scope = randomUUID(), story = fixture(), first = pending(pan(story));
  const second = pending({ ...pan(story), editor: { ...story.editor!, viewport: { x: 12, y: 20, zoom: .6 } } }, 8);
  await persistPending(scope, first); await persistPending(scope, second);
  mockCloud(t, story);
  const result = await recoverViewportSaves(scope, await pendingSaves(scope));
  assert.deepEqual(result.pending, []);
  assert.equal(result.recovered[0].revision, 8);
  assert.deepEqual(result.recovered[0].story, story);
});

test("a camera-only save based on an older version adopts newer remote content", async t => {
  const scope = randomUUID(), base = fixture(), latest = { ...base, title: "Edited in another tab" };
  const entry = pending(pan(base)); await persistPending(scope, entry);
  mockCloud(t, latest, base);
  const result = await recoverViewportSaves(scope, [entry]);
  assert.deepEqual(result.pending, []);
  assert.equal(result.recovered[0].story.title, latest.title);
});

test("real edits to text, choices, positions, media, metadata or status retain their recovery copies", async t => {
  const edits: Array<(story: Story, entry: PendingSave) => void> = [
    story => { story.passages[0].text = "Unsaved words"; },
    story => { story.passages[0].choices[0].target = "keeper"; },
    story => { story.editor!.positions[0].x += 10; },
    story => { story.assets.push({ id: "new-image", kind: "image", name: "Image", credit: "", source: "upload", data: "data:image/png;base64,aGVsbG8=" }); },
    story => { story.title = "Unsaved title"; },
    (_, entry) => { entry.status = "draft"; },
  ];
  for (const [index, edit] of edits.entries()) await t.test(`edit ${index + 1}`, async child => {
    const scope = randomUUID(), base = fixture(), entry = pending(pan(structuredClone(base)));
    edit(entry.story, entry); await persistPending(scope, entry); mockCloud(child, base);
    assert.deepEqual((await recoverViewportSaves(scope, [entry])).pending, [entry]);
  });
});

test("a camera save followed by content changes keeps the entire pending chain", async () => {
  const scope = randomUUID(), story = fixture(), first = pending(pan(story));
  const second = pending({ ...pan(story), title: "New title" }, 8);
  await persistPending(scope, first); await persistPending(scope, second);
  const before = await pendingSaves(scope);
  assert.deepEqual((await recoverViewportSaves(scope, before)).pending, before);
});

test("unavailable comparisons and new stories never discard local work", async t => {
  const scope = randomUUID(), first = pending(pan(fixture())), second = pending(fixture(), 0);
  await persistPending(scope, first); await persistPending(scope, second);
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Offline"); });
  const before = await pendingSaves(scope);
  assert.deepEqual((await recoverViewportSaves(scope, before)).pending, before);
});

test("another tab extending a batch during comparison prevents cleanup", async t => {
  const scope = randomUUID(), story = fixture(), first = pending(pan(story));
  const second = pending({ ...pan(story), title: "Concurrent edit" }, 8);
  await persistPending(scope, first);
  mockCloud(t, story, story, () => persistPending(scope, second));
  assert.equal((await recoverViewportSaves(scope, [first])).pending.length, 2);
});

test("another tab replacing a pending snapshot prevents cleanup", async () => {
  const scope = randomUUID(), entry = pending(pan(fixture()));
  const changed = { ...entry, story: { ...entry.story, title: "Concurrent edit" } };
  await persistPending(scope, changed);
  assert.equal(await discardPendingIfUnchanged(scope, [entry]), false);
  assert.deepEqual(await pendingSaves(scope), [changed]);
});

test("tab views survive a reload, stay scoped, and never enter the saved content", t => {
  const values = new Map<string, string>(), previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, "sessionStorage", previous); else Reflect.deleteProperty(globalThis, "sessionStorage"); });
  const story = fixture(), view = { x: 200, y: 300, zoom: 1.4 };
  rememberViewport("workspace-a", story.id, view);
  assert.deepEqual(restoreViewport(story, "workspace-a").editor!.viewport, view);
  assert.deepEqual(restoreViewport(story, "workspace-b").editor!.viewport, story.editor!.viewport);
  const saved = withoutViewport(restoreViewport(story, "workspace-a"));
  assert.equal(saved.editor!.viewport, undefined);
  assert.deepEqual(saved.editor!.positions, story.editor!.positions);
  assert.deepEqual(saved.passages, story.passages);
  values.set([...values.keys()][0], "invalid JSON");
  assert.equal(restoreViewport(story, "workspace-a"), story);
});

test("initial layout is display setup and real edits still include node positions", () => {
  const story = sampleStory(), positions = [{ id: story.startId, x: 700, y: 200 }];
  let history = editorReducer(createHistory(story), { type: "initialize-layout", positions });
  assert.equal(history.past.length, 0);
  history = editorReducer(history, { type: "viewport", viewport: { x: 100, y: 30, zoom: .7 } });
  history = editorReducer(history, { type: "commit", story: { ...history.present, title: "Edited" }, time: 1 });
  assert.equal(history.past.length, 1);
  assert.deepEqual(withoutViewport(history.present).editor!.positions[0], positions[0]);
  assert.equal(editorReducer(history, { type: "undo" }).present.title, story.title);
});
