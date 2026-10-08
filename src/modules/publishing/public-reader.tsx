"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, BookOpen, GitBranch, LoaderCircle } from "lucide-react";
import type { Story } from "@/modules/story/model";
import Player from "@/modules/player/player";
import { GameplayAudioProvider } from "@/modules/media/audio/gameplay-provider";
import { loadPublicStory } from "./reader-data";
import "./styles.css";

export type PublicLanding = { publicId: string; title: string; description: string; genre: string; cover: string | null; passages: number; endings: number };
export default function PublicReader({ landing }: { landing: PublicLanding }) {
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (story) heading.current?.focus(); }, [story]);
  const start = async () => {
    if (controller.current) return;
    const request = new AbortController(); controller.current = request;
    setLoading(true); setError("");
    try { const loaded = await loadPublicStory(landing.publicId, request.signal); if (!request.signal.aborted) setStory(loaded); }
    catch (error) { if (!request.signal.aborted) setError((error as Error).message); }
    finally { if (!request.signal.aborted) { setLoading(false); controller.current = null; } }
  };
  return <main className="public-story product-shell">
    <header className="public-brand"><span className="product-brand">dextro<span>.</span></span><span>A story shaped by your choices</span></header>
    {story ? <GameplayAudioProvider playbackPath={`/s/${landing.publicId}`}><div className="public-play-heading"><h1 ref={heading} tabIndex={-1}>{story.title}</h1><span>{story.genre}</span></div><Player story={story} /></GameplayAudioProvider> :
      <article className="public-landing">
        {landing.cover ? <Image unoptimized className="public-cover" src={landing.cover} width={1000} height={560} alt={`Cover for ${landing.title}`} /> : <div className="public-cover-fallback"><BookOpen size={52} strokeWidth={1} /><span>EVERY CHOICE OPENS A WORLD</span></div>}
        <div className="public-intro"><span className="kicker">{landing.genre || "AN INTERACTIVE STORY"}</span><h1>{landing.title}</h1>
          {landing.description && <p className="public-description">{landing.description}</p>}
          <p className="public-count"><GitBranch size={15} /> {landing.passages} passages · {landing.endings} endings</p>
          <button className="button primary public-start" disabled={loading} onClick={() => void start()}>{loading ? <><LoaderCircle className="spin" size={17} /> Loading your story…</> : <>Start story <ArrowRight size={17} /></>}</button>
          {error && <p className="form-error" role="alert">{error}</p>}
          <p className="public-note">Choose your path. Find your ending. Play again.</p>
        </div>
      </article>}
  </main>;
}
