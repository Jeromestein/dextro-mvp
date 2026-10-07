"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoaderCircle, Sparkles } from "lucide-react";
import { useConnection } from "@/modules/connections/provider";
import type { Passage, Story } from "@/modules/story/model";
import type { MediaAsset } from "../assets/model";
import { imageBrief, type VisualStyle } from "./plan";
import { requestSceneImage } from "./client";

export default function ImageGeneration({ story, passage, onApply }: { story: Story; passage: Passage; onApply: (asset: MediaAsset) => boolean }) {
  const connection = useConnection();
  const [scene, setScene] = useState(() => imageBrief(story, passage.id).scene);
  const [style, setStyle] = useState<VisualStyle>("storybook");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [candidate, setCandidate] = useState<{ asset: MediaAsset; source: Passage; artBrief: string } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const artBrief = imageBrief(story, passage.id).artBrief;
  useEffect(() => () => { controller.current?.abort(); }, [passage, artBrief, connection.imageModel]);
  const canGenerate = connection.imagesReady && !connection.checking;
  const currentCandidate = candidate?.source === passage && candidate.artBrief === artBrief ? candidate.asset : null;
  const generate = async () => {
    if (controller.current || !canGenerate) return;
    const request = new AbortController(); controller.current = request;
    setBusy(true); setError(""); setCandidate(null);
    try {
      const asset = await requestSceneImage({ title: story.title, scene, artBrief, style, model: connection.imageModel || undefined }, request.signal);
      if (!request.signal.aborted) setCandidate({ asset, source: passage, artBrief });
    } catch (e) { if (!request.signal.aborted) setError(e instanceof Error ? e.message : "Could not generate this scene."); }
    finally { if (controller.current === request) { controller.current = null; setBusy(false); } }
  };
  return <div className="media-generation">
    <h4>Create a scene image with AI</h4>
    <label className="editor-field">Scene description<textarea maxLength={4000} value={scene} disabled={busy} onChange={(e) => { setScene(e.target.value); setCandidate(null); }} /></label>
    <label className="editor-field">Visual style<select value={style} disabled={busy} onChange={(e) => { setStyle(e.target.value as VisualStyle); setCandidate(null); }}><option value="storybook">Storybook</option><option value="cinematic">Cinematic</option></select></label>
    <p className="media-file-hint">One image · OpenAI API usage is billed separately. Review before applying.</p>
    {!canGenerate && <p className="media-file-hint">{connection.checking ? "Checking image configuration…" : "Image generation is unavailable. Check Settings."} <Link href="/settings">Settings</Link></p>}
    <div className="media-actions"><button className="button" disabled={!canGenerate || busy || scene.trim().length < 10} onClick={() => void generate()}>{busy ? <LoaderCircle size={14} className="spin" /> : <Sparkles size={14} />}{busy ? "Generating scene…" : "Generate scene"}</button>{busy && <button className="button" onClick={() => { controller.current?.abort(); setError("Cancelled. Any provider usage already started may still be billed."); }}>Cancel</button>}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {candidate && !currentCandidate && <p className="quiet">This passage changed. Generate a new preview for the latest scene.</p>}
    {currentCandidate && <div className="media-candidate"><span className="kicker">NEW IMAGE · REVIEW</span><Image unoptimized src={currentCandidate.data} width={640} height={426} alt="Generated scene candidate" /><div className="media-actions"><button className="button primary" onClick={() => { try { if (!onApply(currentCandidate)) throw new Error("Could not apply this image. Check available storage."); setCandidate(null); } catch (e) { setError((e as Error).message); } }}>Apply image</button><button className="button" onClick={() => setCandidate(null)}>Discard</button></div></div>}
  </div>;
}
