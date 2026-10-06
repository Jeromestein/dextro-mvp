import test from "node:test";
import assert from "node:assert/strict";
import { sampleStory } from "../src/modules/story/sample";
import { storySchema, validateStory, newStory } from "../src/modules/story/model";
import { buildGame } from "../src/modules/export/standalone";

test("the complete sample has reachable passages and three playable endings", () => {
  const story = storySchema.parse(sampleStory());
  assert.deepEqual(validateStory(story), []);
  assert.equal(story.passages.filter((p) => p.ending).length, 3);
  for (const route of [
    ["arrival", "letter", "boat", "landing", "light"],
    ["arrival", "keeper", "boat", "landing", "home"],
    ["arrival", "keeper", "road", "shelter"],
  ]) {
    for (let i = 0; i < route.length - 1; i++)
      assert.ok(
        story.passages
          .find((p) => p.id === route[i])
          ?.choices.some((c) => c.target === route[i + 1]),
      );
    assert.ok(story.passages.find((p) => p.id === route.at(-1))?.ending);
  }
});
test("a new unfinished story cannot be exported as playable", () => {
  const story = newStory();
  assert.ok(
    validateStory(story).some((i) => i.message.includes("add some story text")),
  );
  assert.throws(() => buildGame(story), /Fix the story checks/);
});
test("a disconnected choice is reported and blocked", () => {
  const story = sampleStory();
  story.passages[0].choices[0].target = "deleted";
  assert.ok(
    validateStory(story).some(
      (i) => i.level === "error" && i.passageId === "arrival",
    ),
  );
  assert.throws(() => buildGame(story));
});
test("a reachable loop without an exit is blocked", () => {
  const story = sampleStory();
  const p = story.passages.find((p) => p.id === "boat")!;
  p.choices = [{ id: "loop", text: "Keep rowing", target: "boat" }];
  assert.ok(
    validateStory(story).some(
      (i) =>
        i.level === "error" &&
        i.passageId === "boat" &&
        i.message.includes("no route"),
    ),
  );
});
test("a loop with a path to an ending is allowed", () => {
  const story = sampleStory();
  story.passages
    .find((p) => p.id === "boat")!
    .choices.push({ id: "loop", text: "Look again", target: "boat" });
  assert.deepEqual(validateStory(story), []);
});
test("unreachable passages are warnings; choices on endings are errors", () => {
  const story = sampleStory();
  story.passages.push({
    id: "unused",
    title: "Unused",
    text: "An unused ending.",
    ending: true,
    image: "",
    choices: [],
  });
  assert.ok(
    validateStory(story).some(
      (i) => i.level === "warning" && i.passageId === "unused",
    ),
  );
  story.passages
    .at(-1)!
    .choices.push({ id: "invalid", text: "Continue", target: "arrival" });
  assert.ok(
    validateStory(story).some(
      (i) => i.level === "error" && i.passageId === "unused",
    ),
  );
});
test("imports reject duplicate passage IDs and active or remote images", () => {
  const duplicate = sampleStory();
  duplicate.passages[1].id = duplicate.passages[0].id;
  assert.equal(storySchema.safeParse(duplicate).success, false);
  for (const image of [
    "javascript:alert(1)",
    "https://example.com/tracker.png",
    "data:image/svg+xml,<svg onload='alert(1)'/>",
  ]) {
    const story = sampleStory();
    story.passages[0].image = image;
    assert.equal(storySchema.safeParse(story).success, false);
  }
});
test("standalone export roundtrips text and images without script injection", () => {
  const story = sampleStory();
  story.title = '</title><script>alert("unsafe")</script>';
  story.passages[0].text =
    '</script><script>alert("unsafe")</script> & 中文 \u2028';
  story.passages[0].image = "data:image/png;base64,aGVsbG8=";
  const html = buildGame(story);
  assert.equal(html.includes('<script>alert("unsafe")'), false);
  const data = html.match(
    /<script type="application\/json" id="story-data">(.*?)<\/script>/s,
  )![1];
  assert.deepEqual(JSON.parse(data), story);
  assert.ok(html.includes(".textContent="));
  assert.ok(!html.includes("https://"));
});
