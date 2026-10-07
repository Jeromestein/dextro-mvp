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
  const engine = {
    reduced() { return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches; },
    cancelLoad() {
      if (loader) { loader.onload = null; loader.onerror = null; loader = null; }
      cancelAnimationFrame(frame);
    },
    clear() {
      clearTimeout(cleanup);
      layers.forEach(layer => { layer.style.opacity = "0"; });
      delete surface.dataset.sceneGlow;
      active = -1;
      cleanup = setTimeout(() => layers.forEach(layer => { layer.style.backgroundImage = ""; }), engine.reduced() ? 0 : 850);
    },
    reveal(token: number, next: number) {
      if (disposed || token !== revision) return;
      layers[next].style.transition = "";
      layers.forEach((item, index) => { item.style.opacity = index === next ? "1" : "0"; });
      active = next;
      surface.dataset.sceneGlow = "on";
      cleanup = setTimeout(() => { layers[1 - next].style.backgroundImage = ""; }, engine.reduced() ? 0 : 850);
    },
  };
  return {
    setSource(source: string) {
      if (disposed || source === requested) return;
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
    },
  };
}

// Share the decorative effect with exports without duplicating palette values.
export const sceneGlowCSS = `
.play-page[data-story-theme], .story-preview-stage[data-story-theme], .standalone-story { position:relative; isolation:isolate; }
.standalone-story { min-height:100vh; display:flow-root; }
.scene-glow { position:absolute; inset:0; z-index:-1; overflow:hidden; pointer-events:none; border-radius:inherit; opacity:.68; }
.scene-glow-image { position:absolute; inset:-80px; background-size:cover; background-position:center 35%; filter:blur(70px) saturate(1.18); opacity:0; transition:opacity .8s ease; }
.scene-glow::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg,var(--story-backdrop) 0%,transparent 22%,transparent 50%,var(--story-backdrop) 100%); }
.scene-reading-surface[data-scene-glow="on"] { background:color-mix(in srgb,var(--story-surface) 96%,transparent); }
.story-preview-stage .scene-glow-image { inset:-35px; filter:blur(35px) saturate(1.18); }
@media(max-width:600px) { .scene-glow-image { inset:-40px; filter:blur(40px) saturate(1.12); } }
@media(prefers-reduced-motion:reduce) { .scene-glow-image { transition:none; } }
`;
