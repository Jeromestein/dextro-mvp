"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, PanelRightClose } from "lucide-react";

const WIDTH_KEY = "dextro:inspector-width";
const DEFAULT_WIDTH = 2 / 3;

export default function InspectorDrawer({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode;
}) {
  const drawer = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; width: number; container: number } | null>(null);
  const [ratio, setRatio] = useState(DEFAULT_WIDTH);
  const [containerWidth, setContainerWidth] = useState(0);
  const [resizing, setResizing] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = Number(localStorage.getItem(WIDTH_KEY));
        if (saved >= .25 && saved <= .9) setRatio(saved);
      } catch { /* The default width also works when storage is unavailable. */ }
    });
    const observer = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width));
    if (drawer.current?.parentElement) observer.observe(drawer.current.parentElement);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus({ preventScroll: true });
    const mobile = window.matchMedia("(max-width:760px)");
    let restore = () => {};
    const protectBackground = () => {
      restore();
      if (!mobile.matches) return;
      const siblings: Array<{ element: HTMLElement; inert: boolean }> = [];
      let node = drawer.current;
      while (node && node !== document.body) {
        for (const sibling of Array.from(node.parentElement?.children || [])) {
          if (sibling !== node && sibling instanceof HTMLElement && !["SCRIPT", "STYLE", "LINK", "DIALOG"].includes(sibling.tagName)) {
            siblings.push({ element: sibling, inert: sibling.inert }); sibling.inert = true;
          }
        }
        node = node.parentElement;
      }
      const overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      restore = () => { siblings.forEach(({ element, inert }) => { element.inert = inert; }); document.body.style.overflow = overflow; };
    };
    protectBackground(); mobile.addEventListener("change", protectBackground);
    return () => {
      restore(); mobile.removeEventListener("change", protectBackground);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  const remember = (value: number) => {
    setRatio(value);
    try { localStorage.setItem(WIDTH_KEY, String(value)); } catch { /* Resizing still works for this session. */ }
  };
  const resize = (pixels: number, container: number) => {
    if (container > 0) remember(Math.max(380, Math.min(container - 200, pixels)) / container);
  };
  const minimum = containerWidth ? 380 / containerWidth : .25;
  const maximum = containerWidth ? Math.max(380, containerWidth - 200) / containerWidth : .9;
  return <aside id="passage-editor" className={`workbench-inspector${resizing ? " is-resizing" : ""}`} ref={drawer}
    aria-label="Passage editor" hidden={!open} style={{ width: `${ratio * 100}%` }}
    onKeyDown={event => {
      if (event.key !== "Tab" || !window.matchMedia("(max-width:760px)").matches) return;
      const elements = Array.from(drawer.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]') || []).filter(element => element.getClientRects().length > 0 && element.tabIndex >= 0);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <div className="inspector-resize" role="separator" tabIndex={0} aria-label="Resize passage editor" aria-orientation="vertical"
      aria-controls="passage-editor" aria-valuemin={Math.round(minimum * 100)} aria-valuemax={Math.round(maximum * 100)} aria-valuenow={Math.round(Math.max(minimum, Math.min(maximum, ratio)) * 100)}
      title="Drag to resize · Double-click to reset" onDoubleClick={() => remember(DEFAULT_WIDTH)}
      onPointerDown={event => {
        if (event.button !== 0) return;
        const rect = drawer.current!.getBoundingClientRect();
        drag.current = { x: event.clientX, width: rect.width, container: drawer.current!.parentElement!.clientWidth };
        event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus(); setResizing(true);
      }} onPointerMove={event => {
        if (drag.current) resize(drag.current.width + drag.current.x - event.clientX, drag.current.container);
      }} onPointerUp={event => { drag.current = null; setResizing(false); event.currentTarget.releasePointerCapture(event.pointerId); }}
      onLostPointerCapture={() => { drag.current = null; setResizing(false); }} onPointerCancel={() => { drag.current = null; setResizing(false); }}
      onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End", "Enter"].includes(event.key)) return;
        event.preventDefault();
        const container = drawer.current!.parentElement!.clientWidth;
        if (event.key === "Enter") remember(DEFAULT_WIDTH);
        else resize(event.key === "Home" ? 380 : event.key === "End" ? container - 200 : drawer.current!.clientWidth + (event.key === "ArrowLeft" ? 32 : -32), container);
      }}><span /></div>
    <div className="inspector-heading"><div><span className="kicker">PASSAGE EDITOR</span><h2>{title || "Untitled passage"}</h2></div>
      <button ref={closeButton} type="button" className="button inspector-close" aria-label="Close passage editor" onClick={onClose}>
        <ArrowLeft className="inspector-mobile-back" size={16} /><PanelRightClose className="inspector-desktop-close" size={16} /><span>Back to graph</span>
      </button>
    </div>
    {children}
  </aside>;
}
