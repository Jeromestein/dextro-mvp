import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { createSceneGlow, sceneGlowCSS } from "../src/modules/player/scene-glow-controller";
import { buildGame } from "../src/modules/export/standalone";
import { sampleStory } from "../src/modules/story/sample";

function harness(reducedMotion = false, canvasAvailable = true) {
  const frames = new Map<number, () => void>();
  const timers = new Map<number, () => void>();
  let serial = 0;
  const images: FakeImage[] = [];
  class FakeImage {
    src = "";
    naturalWidth = 1536;
    naturalHeight = 1024;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { images.push(this); }
  }
  const layers: { style: Record<string, string> }[] = [];
  const host = { append: (layer: typeof layers[number]) => layers.push(layer), replaceChildren: () => layers.splice(0) };
  const surface = { dataset: {} as Record<string, string> };
  const samples: number[][] = [];
  const pixels = new Uint8ClampedArray([220, 110, 44, 255, 40, 30, 20, 255]);
  // Exercise the stringified function used by offline exports as well as React.
  const create = runInNewContext(`(${createSceneGlow.toString()})`, {
    document: { createElement: (tag: string) => {
      if (tag === "canvas") return {
        getContext: () => canvasAvailable ? {
          drawImage: (_image: FakeImage, ...bounds: number[]) => samples.push(bounds),
          getImageData: () => ({ data: pixels }), putImageData() {},
        } : null,
        toDataURL: () => "data:image/png;base64,edge",
      };
      const style: Record<string, string> = {};
      return { style: Object.assign(style, {
        removeProperty: (key: string) => { delete style[key]; },
        setProperty: (key: string, value: string) => { style[key] = value; },
      }) };
    } }, Image: FakeImage,
    matchMedia: () => ({ matches: reducedMotion }),
    requestAnimationFrame: (fn: () => void) => { frames.set(++serial, fn); return serial; },
    cancelAnimationFrame: (id: number) => frames.delete(id),
    setTimeout: (fn: () => void) => { timers.set(++serial, fn); return serial; },
    clearTimeout: (id: number) => timers.delete(id),
  }) as typeof createSceneGlow;
  const controller = create(host as unknown as HTMLElement, surface as unknown as HTMLElement);
  const flush = (queue: Map<number, () => void>) => {
    const pending = [...queue.values()]; queue.clear(); pending.forEach(fn => fn());
  };
  return { controller, images, layers, surface, frames, timers, samples, pixels,
    paint: () => { flush(frames); flush(frames); }, settle: () => flush(timers) };
}

test("scene glow preloads images, crossfades, and keeps a reused image steady", () => {
  const h = harness();
  h.controller.setSource("one");
  assert.equal(h.surface.dataset.sceneGlow, undefined);
  h.images[0].onload!(); h.paint(); h.settle();
  assert.equal(h.surface.dataset.sceneGlow, "on");
  assert.equal(h.layers[0].style.opacity, "1");
  h.controller.setSource("one");
  assert.equal(h.images.length, 1);
  h.controller.setSource("two");
  assert.equal(h.layers[0].style.opacity, "1", "keep the previous scene while loading");
  h.images[1].onload!(); h.paint();
  assert.equal(h.layers[1].style.backgroundImage, 'url("two")');
  assert.equal(h.layers[1].style.opacity, "1");
  assert.equal(h.layers[0].style.opacity, "0");
  h.settle();
  assert.equal(h.layers[0].style.backgroundImage, "");
  h.controller.dispose();
});

test("immersive continuation samples the bottom edge, preserves dark colors and tolerates blocked canvas", () => {
  const h = harness();
  h.controller.setSource("scene"); h.images[0].onload!(); h.paint();
  const [x, y, width, height] = h.samples[0];
  assert.equal(x, 0); assert.equal(width, h.images[0].naturalWidth);
  assert.equal(y + height, h.images[0].naturalHeight);
  assert.ok(height < h.images[0].naturalHeight / 5, "only the bottom strip supplies the continuation");
  assert.ok(Math.max(...h.pixels.slice(0, 3)) <= 110, "bright edges cannot overwhelm narrative text");
  assert.equal(h.pixels[0] / h.pixels[1], 2, "tone mapping preserves the source hue");
  assert.deepEqual([...h.pixels.slice(4)], [40, 30, 20, 255], "dark source colors stay intact");
  assert.ok(h.layers[0].style["--scene-edge"]);
  h.controller.setSource(""); h.settle();
  assert.ok(h.layers.every(layer => !layer.style["--scene-edge"]));
  h.controller.dispose();
  const blocked = harness(false, false);
  blocked.controller.setSource("scene"); blocked.images[0].onload!(); blocked.paint();
  assert.equal(blocked.surface.dataset.sceneGlow, "on");
  assert.equal(blocked.layers[0].style["--scene-edge"], undefined);
  blocked.controller.dispose();
});

test("scene glow ignores stale loads, falls back without an image, and cleans up", () => {
  const h = harness();
  h.controller.setSource("slow");
  const stale = h.images[0].onload!;
  h.controller.setSource("latest");
  h.images[1].onload!(); h.paint(); stale(); h.paint();
  assert.equal(h.layers[0].style.backgroundImage, 'url("latest")');
  h.controller.setSource(""); h.settle();
  assert.equal(h.surface.dataset.sceneGlow, undefined);
  assert.ok(h.layers.every(layer => layer.style.opacity === "0" && layer.style.backgroundImage === ""));
  h.controller.setSource("broken"); h.images[2].onerror!(); h.settle();
  assert.equal(h.surface.dataset.sceneGlow, undefined);
  h.controller.setSource("pending-paint"); h.images[3].onload!();
  h.controller.setSource("replacement"); h.paint();
  assert.equal(h.surface.dataset.sceneGlow, undefined, "a cancelled reveal cannot paint an old scene");
  const afterDispose = h.images[4].onload!;
  h.controller.dispose(); afterDispose(); h.paint(); h.settle();
  assert.equal(h.layers.length, 0);
  assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
});

test("reduced motion avoids animation frames and exports reuse the shared effect", () => {
  const h = harness(true);
  h.controller.setSource("one"); h.images[0].onload!();
  assert.equal(h.frames.size, 0);
  assert.equal(h.layers[0].style.opacity, "1");
  h.controller.dispose();
  const html = buildGame(sampleStory());
  assert.ok(html.includes(sceneGlowCSS));
  assert.ok(html.includes(createSceneGlow.toString()));
  assert.ok(html.includes('class="player scene-reading-surface"'));
});
