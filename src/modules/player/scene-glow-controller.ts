// Self-contained so the React player and offline HTML use the same transitions.
export function createSceneGlow(host: HTMLElement, surface: HTMLElement) {
  const layers = [document.createElement("div"), document.createElement("div")];
  layers.forEach(layer => { layer.className = "scene-glow-image"; host.append(layer); });
  let active = -1;
  let requested = "";
  let revision = 0;
  let disposed = false;
  let loader: HTMLImageElement | null = null;
  let frame = 0;
  let cleanup: ReturnType<typeof setTimeout> | undefined;
  let glowEnabled = true;
  const tones: ("light" | "dark" | null)[] = [null, null];
  const engine = {
    reduced() { return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches; },
    brightness(pixels: Uint8ClampedArray) {
      const values: number[] = [];
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] < 128) continue;
        values.push((.2126 * pixels[index] + .7152 * pixels[index + 1] + .0722 * pixels[index + 2]) / 255);
      }
      if (!values.length) return null;
      values.sort((a, b) => a - b);
      // Trim highlights and deep shadows so a lamp cannot turn a night scene light.
      const trim = Math.floor(values.length * .1);
      const middle = values.slice(trim, values.length - trim);
      return middle.reduce((sum, value) => sum + value, 0) / middle.length;
    },
    sampleEdge(image: HTMLImageElement, layer: HTMLElement): "light" | "dark" | null {
      layer.style.removeProperty("--scene-edge");
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 32; canvas.height = 24;
        const context = canvas.getContext("2d");
        if (!context || !image.naturalWidth || !image.naturalHeight) return null;
        context.drawImage(image, 0, 0, 32, 24);
        const scene = engine.brightness(context.getImageData(0, 0, 32, 24).data);
        // Stretch only the bottom strip, so the continuation cannot invent another scene.
        canvas.height = 8;
        const strip = Math.max(1, Math.round(image.naturalHeight * .12));
        context.drawImage(image, 0, image.naturalHeight - strip, image.naturalWidth, strip, 0, 0, 32, 8);
        const pixels = context.getImageData(0, 0, 32, 8);
        const edge = engine.brightness(pixels.data);
        if (scene === null || edge === null) return null;
        const score = .75 * scene + .25 * edge;
        // A neutral band keeps neighboring scenes from oscillating between modes.
        const previous = surface.dataset.sceneTone === "light" ? "light" : surface.dataset.sceneTone === "dark" ? "dark" : "light";
        const tone = score >= .56 ? "light" : score <= .44 ? "dark" : previous;
        // Bound every background pixel for readable text, preserving its color tint.
        for (let index = 0; index < pixels.data.length; index += 4) {
          if (tone === "light") {
            const low = Math.min(pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]);
            const lift = low < 210 ? (210 - low) / (255 - low) : 0;
            for (let channel = 0; channel < 3; channel++) pixels.data[index + channel] += (255 - pixels.data[index + channel]) * lift;
          } else {
            const peak = Math.max(pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]);
            if (peak <= 90) continue;
            for (let channel = 0; channel < 3; channel++) pixels.data[index + channel] *= 90 / peak;
          }
        }
        context.putImageData(pixels, 0, 0);
        layer.style.setProperty("--scene-edge", `url(${JSON.stringify(canvas.toDataURL())})`);
        return tone;
      } catch {
        // A blocked canvas or unreadable image falls back to the default light backdrop.
        return null;
      }
    },
    cancelLoad() {
      if (loader) { loader.onload = null; loader.onerror = null; loader = null; }
      cancelAnimationFrame(frame);
    },
    clear() {
      clearTimeout(cleanup);
      layers.forEach(layer => { layer.style.transition = "none"; layer.style.opacity = "0"; });
      delete surface.dataset.sceneGlow;
      delete surface.dataset.sceneTone;
      active = -1;
      cleanup = setTimeout(() => layers.forEach(layer => { layer.style.backgroundImage = ""; layer.style.removeProperty("--scene-edge"); }), engine.reduced() ? 0 : 850);
    },
    reveal(token: number, next: number) {
      if (disposed || token !== revision) return;
      const changedTone = (surface.dataset.sceneTone || "light") !== (tones[next] || "light");
      // Switch opposite palettes atomically; fading dark pixels under dark text loses contrast.
      layers.forEach((item, index) => {
        item.style.transition = changedTone || engine.reduced() ? "none" : "";
        item.style.opacity = index === next ? "1" : "0";
      });
      if (tones[next]) surface.dataset.sceneTone = tones[next];
      else delete surface.dataset.sceneTone;
      active = next;
      if (glowEnabled) surface.dataset.sceneGlow = "on";
      else delete surface.dataset.sceneGlow;
      cleanup = setTimeout(() => { layers[1 - next].style.backgroundImage = ""; layers[1 - next].style.removeProperty("--scene-edge"); }, engine.reduced() ? 0 : 850);
    },
  };
  return {
    setSource(source: string, enabled = true) {
      if (disposed) return;
      glowEnabled = enabled;
      if (active >= 0 && enabled) surface.dataset.sceneGlow = "on";
      else delete surface.dataset.sceneGlow;
      if (source === requested) return;
      requested = source;
      const token = ++revision;
      engine.cancelLoad();
      if (!source) { engine.clear(); return; }
      const image = new Image();
      loader = image;
      image.onload = () => {
        if (disposed || token !== revision) return;
        loader = null;
        clearTimeout(cleanup);
        const next = active === 0 ? 1 : 0;
        const layer = layers[next];
        layer.style.transition = "none";
        layer.style.opacity = "0";
        layer.style.backgroundImage = `url(${JSON.stringify(source)})`;
        tones[next] = engine.sampleEdge(image, layer);
        if (engine.reduced()) engine.reveal(token, next);
        else frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => engine.reveal(token, next)); });
      };
      image.onerror = () => { if (!disposed && token === revision) { loader = null; engine.clear(); } };
      image.src = source;
    },
    dispose() {
      disposed = true;
      revision++;
      engine.cancelLoad();
      clearTimeout(cleanup);
      host.replaceChildren();
      delete surface.dataset.sceneGlow;
      delete surface.dataset.sceneTone;
    },
  };
}

// Shared layer positioning; presentation.ts supplies the adaptive colors and edge fill.
export const sceneGlowCSS = `
.play-page, .story-preview-stage, .standalone-story { position:relative; isolation:isolate; }
.standalone-story { min-height:100vh; display:flow-root; }
.scene-glow { position:absolute; inset:0; z-index:-1; overflow:hidden; pointer-events:none; border-radius:inherit; }
.scene-glow-image { position:absolute; opacity:0; transition:opacity .8s ease; }
.scene-glow::after { content:""; position:absolute; inset:0; }
@media(prefers-reduced-motion:reduce) { .scene-glow-image { transition:none; } }
`;
