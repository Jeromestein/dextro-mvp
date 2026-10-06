import test from "node:test";
import assert from "node:assert/strict";
import { createGameplayAudio } from "../src/modules/media/audio/gameplay";
import { createAudioController } from "../src/modules/media/audio/controller";

function browserAudio() {
  let clicking = false;
  let requireClick = false;
  const instances: FakeAudio[] = [];
  class FakeAudio {
    src: string;
    paused = true;
    loop = false;
    volume = 0;
    startedInClick = false;
    constructor(src: string) { this.src = src; instances.push(this); }
    play() {
      this.startedInClick = clicking;
      if (requireClick && !clicking) return Promise.reject(new DOMException("Interaction required", "NotAllowedError"));
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ""; }
    load() {}
  }
  const original = ["window", "Audio"].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
  Object.defineProperty(globalThis, "Audio", { configurable: true, value: FakeAudio });
  return {
    instances,
    blockAutoplay() { requireClick = true; },
    click(action: () => void) { clicking = true; try { action(); } finally { clicking = false; } },
    restore() {
      for (const [name, descriptor] of original) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
    },
  };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test("Play starts sound during the click and the same session survives navigation, remounts and mute", async () => {
  const browser = browserAudio();
  const audio = createGameplayAudio();
  try {
    browser.click(() => audio.start("story-a", "opening"));
    assert.equal(browser.instances.length, 1);
    assert.equal(browser.instances[0].startedInClick, true, "play() must run before the initiating click returns");
    audio.enter("story-a", "opening");
    audio.enter("story-a", "opening");
    await flush();
    assert.equal(browser.instances.length, 1, "mounting the player must keep the already playing element");
    assert.equal(audio.getSnapshot().status, "playing");
    audio.setVolume(0.2);
    assert.equal(browser.instances[0].volume, 0.2);
    audio.enter("story-a", "next-track");
    await flush();
    assert.equal(browser.instances.length, 2);
    audio.mute();
    audio.enter("story-a", "third-track");
    audio.enter("story-a", "");
    audio.enter("story-a", "opening");
    assert.equal(browser.instances.length, 2, "scene changes and restart must respect manual mute");
    assert.equal(audio.getSnapshot().status, "off");
    assert.ok(browser.instances.every((element) => element.paused));
    browser.click(audio.enable);
    await flush();
    assert.equal(audio.getSnapshot().status, "playing");
    assert.equal(audio.getSnapshot().volume, 0.2);
    audio.stop();
    assert.equal(audio.getSnapshot().storyId, "");
    assert.ok(browser.instances.every((element) => element.paused && element.src === ""));
  } finally { audio.stop(); browser.restore(); }
});

test("blocked direct entry can be enabled by a click and audition cannot overlap gameplay", async () => {
  const browser = browserAudio();
  const audio = createGameplayAudio();
  const audition = createAudioController(() => {});
  try {
    browser.blockAutoplay();
    audio.enter("direct-link", "opening");
    await flush();
    assert.equal(audio.getSnapshot().status, "blocked");
    audio.enter("direct-link", "opening");
    assert.equal(browser.instances.length, 1, "renders must not repeatedly retry blocked autoplay");
    browser.click(audio.enable);
    await flush();
    assert.equal(audio.getSnapshot().status, "playing");
    audition.setTrack("audition");
    browser.click(audition.enable);
    await flush();
    assert.equal(audio.getSnapshot().status, "off");
    assert.equal(browser.instances.filter((element) => !element.paused).length, 1);
    browser.click(() => audio.start("next-game", "new-opening"));
    await flush();
    assert.equal(audio.getSnapshot().storyId, "next-game");
    assert.equal(browser.instances.filter((element) => !element.paused).length, 1);
    assert.equal(browser.instances.at(-1)!.src, "new-opening");
    browser.click(() => audio.start("silent-opening", ""));
    assert.equal(audio.getSnapshot().status, "silent");
    assert.ok(browser.instances.every((element) => element.paused));
  } finally { audio.stop(); audition.dispose(); browser.restore(); }
});
