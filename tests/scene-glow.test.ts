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
  const pixels = new Uint8ClampedArray([220, 110, 44, 255, 40, 30, 20, 255]);
  class FakeImage {
    src = "";
    naturalWidth = 1536;
    naturalHeight = 1024;
    scene = pixels;
    edge = pixels;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { images.push(this); }
  }
  const layers: { style: Record<string, string> }[] = [];
  const host = { append: (layer: typeof layers[number]) => layers.push(layer), replaceChildren: () => layers.splice(0) };
  const surface = { dataset: {} as Record<string, string> };
  const samples: number[][] = [];
  const rendered: Uint8ClampedArray[] = [];
  // Exercise the stringified function used by offline exports as well as React.
  const create = runInNewContext(`(${createSceneGlow.toString()})`, {
    document: { createElement: (tag: string) => {
      if (tag === "canvas") {
        let sampled = pixels;
        return {
        getContext: () => canvasAvailable ? {
          drawImage: (image: FakeImage, ...bounds: number[]) => { samples.push(bounds); sampled = bounds.length === 4 ? image.scene : image.edge; },
          getImageData: () => ({ data: new Uint8ClampedArray(sampled) }),
          putImageData: (image: { data: Uint8ClampedArray }) => rendered.push(image.data),
        } : null,
        toDataURL: () => "data:image/png;base64,edge",
      }; }
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
  return { controller, images, layers, surface, frames, timers, samples, rendered,
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
  const [x, y, width, height] = h.samples.at(-1)!;
  assert.equal(x, 0); assert.equal(width, h.images[0].naturalWidth);
  assert.equal(y + height, h.images[0].naturalHeight);
  assert.ok(height < h.images[0].naturalHeight / 5, "only the bottom strip supplies the continuation");
  const pixels = h.rendered[0];
  assert.ok(Math.max(...pixels.slice(0, 3)) <= 90, "bright edges cannot overwhelm narrative text");
  assert.equal(pixels[0] / pixels[1], 2, "tone mapping preserves the source hue");
  assert.deepEqual([...pixels.slice(4)], [40, 30, 20, 255], "dark source colors stay intact");
  assert.equal(h.surface.dataset.sceneTone, "dark");
  assert.ok(h.layers[0].style["--scene-edge"]);
  h.controller.setSource(""); h.settle();
  assert.ok(h.layers.every(layer => !layer.style["--scene-edge"]));
  assert.equal(h.surface.dataset.sceneTone, undefined);
  h.controller.dispose();
  const blocked = harness(false, false);
  blocked.controller.setSource("scene"); blocked.images[0].onload!(); blocked.paint();
  assert.equal(blocked.surface.dataset.sceneGlow, "on");
  assert.equal(blocked.layers[0].style["--scene-edge"], undefined);
  assert.equal(blocked.surface.dataset.sceneTone, undefined, "unreadable images leave the default light backdrop in control");
  blocked.controller.dispose();
});

const gray = (...values: number[]) => new Uint8ClampedArray(values.flatMap(value => [value, value, value, 255]));

function contrast(first: number[], second: number[]) {
  const luminance = (rgb: number[]) => rgb.map(value => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  const [high, low] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (high + .05) / (low + .05);
}

test("scene tone weighs the whole image, ignores isolated highlights, and holds neutral scenes steady", () => {
  const h = harness();
  const load = (name: string, scene: Uint8ClampedArray, edge = scene) => {
    h.controller.setSource(name);
    Object.assign(h.images.at(-1)!, { scene, edge });
    h.images.at(-1)!.onload!(); h.paint(); h.settle();
  };
  load("sunny with foreground shadow", gray(220, 205, 200, 215), gray(45, 70, 85));
  assert.equal(h.surface.dataset.sceneTone, "light", "a foreground shadow must not darken a sunny scene");
  for (let i = 0; i < h.rendered.at(-1)!.length; i += 4) {
    assert.ok(contrast([66, 81, 71], [...h.rendered.at(-1)!.slice(i, i + 3)]) >= 4.5);
  }
  load("neutral after daylight", gray(128));
  assert.equal(h.surface.dataset.sceneTone, "light");
  load("night with a lamp", gray(25, 30, 25, 35, 20, 25, 30, 25, 20, 255), gray(180, 210));
  assert.equal(h.surface.dataset.sceneTone, "dark", "bright lamps must not turn a night scene light");
  assert.ok(h.layers.every(layer => layer.style.transition === "none"), "opposite palettes switch together without illegible intermediate frames");
  for (let i = 0; i < h.rendered.at(-1)!.length; i += 4) {
    assert.ok(contrast([221, 216, 206], [...h.rendered.at(-1)!.slice(i, i + 3)]) >= 4.5);
  }
  load("neutral after night", gray(128));
  assert.equal(h.surface.dataset.sceneTone, "dark");
  h.controller.dispose();
});

test("an initial neutral scene uses light and removing a dark scene resets that default", () => {
  const h = harness(true);
  h.controller.setSource("neutral");
  h.images[0].scene = h.images[0].edge = gray(128);
  h.images[0].onload!();
  assert.equal(h.surface.dataset.sceneTone, "light");
  h.controller.setSource("night");
  h.images[1].onload!();
  assert.equal(h.surface.dataset.sceneTone, "dark");
  h.controller.setSource("");
  assert.equal(h.surface.dataset.sceneTone, undefined);
  h.controller.setSource("neutral again");
  h.images[2].scene = h.images[2].edge = gray(128);
  h.images[2].onload!();
  assert.equal(h.surface.dataset.sceneTone, "light");
  h.controller.dispose();
});

test("adaptive text works with glow disabled, and a fully transparent image uses the default light backdrop", () => {
  const h = harness(true);
  h.controller.setSource("sunny", false);
  h.images[0].scene = h.images[0].edge = gray(225);
  h.images[0].onload!();
  assert.equal(h.surface.dataset.sceneTone, "light");
  assert.equal(h.surface.dataset.sceneGlow, undefined);
  h.controller.setSource("sunny", true);
  assert.equal(h.surface.dataset.sceneGlow, "on");
  assert.equal(h.images.length, 1, "toggling glow does not reload or reanalyze the image");
  h.controller.setSource("sunny", false);
  assert.equal(h.surface.dataset.sceneGlow, undefined);
  assert.equal(h.surface.dataset.sceneTone, "light");
  h.controller.setSource("transparent");
  h.images[1].scene = h.images[1].edge = new Uint8ClampedArray([255, 255, 255, 0]);
  h.images[1].onload!();
  assert.equal(h.surface.dataset.sceneTone, undefined, "transparent images leave the default light backdrop in control");
  h.controller.setSource("");
  assert.equal(h.surface.dataset.sceneTone, undefined, "missing images revert to the default light backdrop");
  h.controller.dispose();
});

test("scene glow ignores stale loads, falls back without an image, and cleans up", () => {
  const h = harness();
  h.controller.setSource("slow");
  h.images[0].scene = h.images[0].edge = gray(230);
  const stale = h.images[0].onload!;
  h.controller.setSource("latest");
  h.images[1].onload!(); h.paint(); stale(); h.paint();
  assert.equal(h.layers[0].style.backgroundImage, 'url("latest")');
  assert.equal(h.surface.dataset.sceneTone, "dark", "stale image analysis cannot change the current palette");
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
