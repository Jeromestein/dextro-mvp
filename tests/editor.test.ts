import test from "node:test";
import assert from "node:assert/strict";
import { sampleStory } from "../src/modules/story/sample";
import { storySchema, validateStory, newPassage, copyStory } from "../src/modules/story/model";
import { buildGame } from "../src/modules/export/standalone";
import { appendPassage, changePassage, connectChoice, removePassage } from "../src/modules/editor/session/operations";
import { createHistory, editorReducer } from "../src/modules/editor/session/history";
import { autoLayout, layoutSignature, NODE_WIDTH, nodeHeight, positionsFor, setPositions } from "../src/modules/editor/graph/layout";

test("layout roundtrips through backups without leaking into playable HTML", () => {
  const old = sampleStory();
  assert.deepEqual(storySchema.parse(old), old);
  const story = setPositions(old, [{ id: "arrival", x: -120, y: 80 }]);
  story.editor!.viewport = { x: 30, y: -50, zoom: .8 };
  const restored = storySchema.parse(JSON.parse(JSON.stringify(story)));
  assert.deepEqual(restored.editor, story.editor);
  assert.deepEqual(copyStory(restored).editor, restored.editor);
  const game = buildGame(restored);
  const data = JSON.parse(game.match(/<script type="application\/json" id="story-data">(.*?)<\/script>/s)![1]);
  assert.equal(data.editor, undefined);
  assert.deepEqual(data.passages, old.passages);
  assert.ok(restored.editor, "export must not mutate the editable story");
});
test("imports reject unsafe, duplicate, and unbounded graph coordinates", () => {
  for (const positions of [
    [{ id: "arrival", x: Infinity, y: 0 }],
    [{ id: "arrival", x: 100001, y: 0 }],
    [{ id: "arrival", x: 0, y: 0 }, { id: "arrival", x: 3, y: 4 }],
  ]) assert.equal(storySchema.safeParse({ ...sampleStory(), editor: { positions } }).success, false);
});
test("connections identify individual choices, including converging and looping branches", () => {
  const source = sampleStory();
  let story = connectChoice(source, { passageId: "arrival", choiceId: "arrival-0" }, "keeper");
  assert.deepEqual(story.passages[0].choices.map((c) => c.target), ["keeper", "keeper"]);
  story = connectChoice(story, { passageId: "arrival", choiceId: "arrival-1" }, "arrival");
  assert.deepEqual(story.passages[0].choices.map((c) => c.target), ["keeper", "arrival"]);
  assert.equal(connectChoice(story, { passageId: "arrival", choiceId: "arrival-0" }, "does-not-exist"), story);
  assert.equal(source.passages[0].choices[0].target, "letter");
});
test("large pan and drag gestures cannot make a saved story unreadable", () => {
  let story = setPositions(sampleStory(), [{ id: "arrival", x: 100001, y: -100001 }]);
  story = appendPassage(story, newPassage());
  const state = editorReducer(createHistory(story), { type: "viewport", viewport: { x: -200000, y: 10000001, zoom: 2 } });
  const restored = storySchema.parse(JSON.parse(JSON.stringify(state.present)));
  assert.deepEqual(restored.passages, story.passages);
  assert.equal(restored.editor!.positions[0].x, 100000);
  assert.equal(restored.editor!.viewport!.x, -200000);
});
test("deleting a passage preserves incoming choice text; undo restores destinations and layout", () => {
  const story = setPositions(sampleStory(), [{ id: "boat", x: 400, y: 90 }]);
  let state = createHistory(story);
  state = editorReducer(state, { type: "commit", story: removePassage(story, "boat"), time: 1 });
  const oldChoice = story.passages.find((p) => p.id === "letter")!.choices[0];
  const nextChoice = state.present.passages.find((p) => p.id === "letter")!.choices[0];
  assert.equal(nextChoice.text, oldChoice.text);
  assert.equal(nextChoice.target, "");
  assert.ok(validateStory(state.present).some((i) => i.level === "error"));
  assert.equal(state.present.editor!.positions.some((p) => p.id === "boat"), false);
  state = editorReducer(state, { type: "undo" });
  assert.deepEqual(state.present, story);
  assert.deepEqual(validateStory(state.present), []);
  assert.equal(removePassage(story, "arrival").startId, "letter");
});
test("text edits group into one undo; branch edits and dragging remain separate actions", () => {
  const original = sampleStory();
  let state = createHistory(original);
  state = editorReducer(state, { type: "commit", story: { ...state.present, title: "A" }, group: "title", time: 100 });
  state = editorReducer(state, { type: "commit", story: { ...state.present, title: "AB" }, group: "title", time: 200 });
  assert.equal(state.past.length, 1);
  state = editorReducer(state, { type: "commit", story: setPositions(state.present, [{ id: "arrival", x: 70, y: 90 }]), time: 300 });
  assert.equal(state.past.length, 2);
  state = editorReducer(state, { type: "viewport", viewport: { x: 20, y: 10, zoom: .7 } });
  state = editorReducer(state, { type: "undo" });
  assert.equal(state.present.title, "AB");
  assert.deepEqual(state.present.editor!.viewport, { x: 20, y: 10, zoom: .7 });
  state = editorReducer(state, { type: "undo" });
  assert.equal(state.present.title, original.title);
  state = editorReducer(state, { type: "redo" });
  assert.equal(state.present.title, "AB");
  state = editorReducer(state, { type: "commit", story: { ...state.present, title: "New branch" }, time: 400 });
  assert.equal(state.future.length, 0);
});
test("a new connected passage is one reversible transaction", () => {
  const story = sampleStory(), p = newPassage();
  let state = createHistory(story);
  state = editorReducer(state, { type: "commit", story: appendPassage(story, p, { x: 700, y: 310 }, { passageId: "arrival", choiceId: "arrival-0" }), time: 1 });
  assert.equal(state.present.passages[0].choices[0].target, p.id);
  assert.deepEqual(state.present.editor!.positions.find((n) => n.id === p.id), { id: p.id, x: 700, y: 310 });
  assert.deepEqual(editorReducer(state, { type: "undo" }).present, story);
});
test("layout race detection preserves manual positions and new connections, but permits text edits", () => {
  const story = sampleStory(), signature = layoutSignature(story);
  assert.equal(signature, layoutSignature(changePassage(story, "arrival", { text: "Revised text" })));
  assert.notEqual(signature, layoutSignature(setPositions(story, [{ id: "arrival", x: 700, y: 400 }])));
  assert.notEqual(signature, layoutSignature(connectChoice(story, { passageId: "arrival", choiceId: "arrival-0" }, "home")));
});
test("ELK produces finite, non-overlapping positions for a story with a cycle and merged branches", async () => {
  const story = sampleStory();
  story.passages.find((p) => p.id === "boat")!.choices.push({ id: "loop", text: "Return", target: "arrival" });
  const snapshot = JSON.stringify(story);
  const positions = await autoLayout(story);
  assert.equal(positions.length, story.passages.length);
  for (let i = 0; i < positions.length; i++) {
    const a = positions[i];
    assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y));
    for (const b of positions.slice(i + 1)) {
      const ah = nodeHeight(story.passages.find((p) => p.id === a.id)!);
      const bh = nodeHeight(story.passages.find((p) => p.id === b.id)!);
      assert.ok(a.x + NODE_WIDTH <= b.x || b.x + NODE_WIDTH <= a.x || a.y + ah <= b.y || b.y + bh <= a.y, `${a.id} overlaps ${b.id}`);
    }
  }
  assert.equal(JSON.stringify(story), snapshot);
  assert.deepEqual(positionsFor(setPositions(story, positions)), positions);
});
