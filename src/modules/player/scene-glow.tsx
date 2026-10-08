"use client";
import { useEffect, useRef } from "react";
import { createSceneGlow, sceneGlowCSS } from "./scene-glow-controller";

export default function SceneGlow({ source, enabled = true }: { source: string; enabled?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof createSceneGlow> | null>(null);
  useEffect(() => {
    const element = host.current;
    if (!element?.parentElement) return;
    controller.current = createSceneGlow(element, element.parentElement);
    return () => { controller.current?.dispose(); controller.current = null; };
  }, []);
  useEffect(() => { controller.current?.setSource(source, enabled); }, [source, enabled]);
  return <><style>{sceneGlowCSS}</style><div className="scene-glow" ref={host} aria-hidden="true" /></>;
}
