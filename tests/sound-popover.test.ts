import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext, Script } from "node:vm";
import { createStandaloneSound } from "../src/modules/media/audio/standalone-sound";
import { soundPopoverView } from "../src/modules/media/audio/sound-popover-view";
import { buildGame } from "../src/modules/export/standalone";
import { addAndAssignAsset } from "../src/modules/media/assets/operations";
import { sampleStory } from "../src/modules/story/sample";

test("sound activation remains distinct from a deliberate mute and silent passages", () => {
  assert.equal(soundPopoverView("off", .35, false).activate, true);
  assert.equal(soundPopoverView("off", .35, true).activate, false);
  assert.equal(soundPopoverView("blocked", .35, true).activate, true);
  assert.equal(soundPopoverView("playing", .35, false).activate, false);
  assert.equal(soundPopoverView("playing", 0, true).audible, false);
  assert.equal(soundPopoverView("silent", .35, true).enabled, true);
  assert.equal(soundPopoverView("silent", .35, true).activate, false);
});

test("exported sound controller supports activation, settings, keyboard dismissal, retry and cleanup without imports", () => {
  class Element extends EventTarget {
    dataset: Record<string, string> = {};
    attributes = new Map<string, string>();
    hidden = false; value = ""; title = ""; innerHTML = ""; textContent = ""; focuses = 0;
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    focus() { this.focuses++; }
  }
  const doc = new EventTarget();
  const parts = Object.fromEntries([".player-sound-trigger", ".player-sound-panel", ".player-sound-mute", "input", "output", ".player-sound-track", ".player-sound-status"].map(key => [key, new Element()]));
  const root = {
    ownerDocument: doc,
    querySelector: (selector: string) => parts[selector],
    contains: (node: Element) => Object.values(parts).includes(node),
  } as unknown as HTMLElement;
  const make = runInNewContext(`(${createStandaloneSound.toString()})`) as typeof createStandaloneSound;
  let enabled = 0, muted = 0, volume = .35;
  const sound = make(root, {
    enable() { enabled++; sound.setStatus("playing"); },
    mute() { muted++; sound.setStatus("off"); },
    setVolume(value) { volume = value; },
  }, soundPopoverView, { on: "sound", off: "muted" });
  const trigger = parts[".player-sound-trigger"], panel = parts[".player-sound-panel"], mute = parts[".player-sound-mute"];
  assert.equal(panel.hidden, true);
  assert.equal(trigger.dataset.activate, "true");
  trigger.dispatchEvent(new Event("click"));
  assert.equal(enabled, 1, "the activation click must enable audio synchronously");
  assert.equal(trigger.dataset.activate, "false");
  assert.equal(panel.hidden, true);
  trigger.dispatchEvent(new Event("click"));
  assert.equal(panel.hidden, false);
  assert.equal(mute.focuses, 1);
  parts.input.value = ".6"; parts.input.dispatchEvent(new Event("input"));
  assert.equal(volume, .6);
  assert.equal(parts.output.textContent, "60%");
  mute.dispatchEvent(new Event("click"));
  assert.equal(muted, 1);
  assert.equal(trigger.dataset.activate, "false", "manual mute keeps the compact settings button");
  assert.equal(panel.hidden, false);
  assert.equal(mute.attributes.get("aria-label"), "Unmute");
  doc.dispatchEvent(Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape" }));
  assert.equal(panel.hidden, true);
  assert.equal(trigger.focuses, 1);
  trigger.dispatchEvent(new Event("click"));
  doc.dispatchEvent(new Event("pointerdown"));
  assert.equal(panel.hidden, true, "outside clicks close without moving focus");
  trigger.dispatchEvent(new Event("click"));
  doc.dispatchEvent(new Event("focusin"));
  assert.equal(panel.hidden, true, "tabbing out dismisses the panel");
  sound.setStatus("blocked");
  assert.equal(trigger.dataset.activate, "true");
  assert.match(parts[".player-sound-status"].textContent, /could not start/);
  trigger.dispatchEvent(new Event("click"));
  assert.equal(enabled, 2);
  assert.equal(parts[".player-sound-status"].textContent, "");
  sound.setTrackTitle("<script>track</script>");
  assert.equal(parts[".player-sound-track"].textContent, "<script>track</script>");
  assert.equal(parts[".player-sound-track"].innerHTML, "", "track names are assigned as text");
  sound.dispose();
  trigger.dispatchEvent(new Event("click"));
  assert.equal(panel.hidden, true, "disposed controls no longer handle events");
});

test("HTML exports include a collapsed accessible sound toolbar and valid standalone JavaScript", () => {
  const story = addAndAssignAsset(sampleStory(), "arrival", {
    id: "music", kind: "audio", name: "Quiet tide", credit: "", source: "upload", data: "data:audio/wav;base64,YXVkaW8=",
  });
  const html = buildGame(story);
  assert.match(html, /class="player-top-actions"/);
  assert.match(html, /aria-controls="sound-panel"/);
  assert.match(html, /id="sound-panel"[^>]*role="dialog"[^>]*hidden/);
  assert.ok(!html.includes('class="player-audio"'));
  const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
  assert.doesNotThrow(() => new Script(script));
});
