"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Sparkles, PenLine, BookOpen, GitBranch, Flag, LoaderCircle, Settings2, Check, X, ChevronDown } from "lucide-react";
import { copyStory, newStory, storySchema, validateStory, type Story } from "@/modules/story/model";
import AIDraftReview from "./draft-review";
import StoryTree from "./story-tree";
import { changeSceneGlow, changeTheme, preserveAppearance } from "@/modules/story/themes";
import { useLibrary } from "@/modules/workspace/library-provider";
import { useConnection } from "@/modules/connections/provider";
import { useGenerationDraft } from "./draft-provider";
import { enrichStoryMedia } from "@/modules/media/generation/enrich";
import { requestGeneration } from "@/modules/media/generation/job-client";
import type { VisualStyle } from "@/modules/media/generation/plan";

const ideas = [
  { label: "A missing memory", text: "You wake up on a train where every passenger remembers you, but you remember none of them. At the next station, someone must be left behind." },
  { label: "The last signal", text: "A deep-space radio operator receives a distress call in their own voice, dated tomorrow. There is enough power for one final transmission." },
  { label: "An impossible letter", text: "A lighthouse keeper receives a letter from a town that sank a hundred years ago. Tonight, its lights have returned beneath the water." },
];
export default function GameBuilder() {
  const library = useLibrary();
  const connection = useConnection();
  const draftState = useGenerationDraft();
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "blank">("ai");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [music, setMusic] = useState(true);
  const [images, setImages] = useState(false);
  const [style, setStyle] = useState<VisualStyle>("storybook");
  const [mediaStatus, setMediaStatus] = useState("");
  const controller = useRef<AbortController | null>(null);
  const latestDraft = useRef<Story | null>(null);
  const canGenerate = connection.aiReady && !connection.checking && library.available;
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (controller.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);
  const openEditor = (story: Story) => {
    controller.current?.abort(); controller.current = null; setGenerating(false);
    if (library.persistStory(story)) { draftState.setDraft(null); router.push(`/builder/${encodeURIComponent(story.id)}`); }
  };
  const generate = async () => {
    if (controller.current || !canGenerate) return;
    const request = new AbortController();
    controller.current = request;
    setGenerating(true); setError(""); setMediaStatus("");
    try {
      const data = await requestGeneration("/api/generate", { ...draftState.brief, includeMedia: music || images, model: connection.model || undefined }, request.signal, library.scope);
      if (request.signal.aborted || controller.current !== request) return;
      const story = storySchema.parse(data.story);
      if (validateStory(story).length) throw new Error("The draft did not pass the story checks. Try again.");
      if (library.cloud) { await library.refreshLibrary(); await library.loadStory(story.id); }
      latestDraft.current = story;
      draftState.setDraft({ story, repaired: data.repaired === true });
      if ((music || images) && story.mediaPlan) {
        const warnings = await enrichStoryMedia(story, { music, images, style, imageModel: connection.imageModel || undefined, scope: library.scope, signal: request.signal,
          onStatus: setMediaStatus,
          onUpdate: (next) => { if (!request.signal.aborted) {
            const merged = latestDraft.current?.id === story.id ? preserveAppearance(latestDraft.current, next) : next;
            latestDraft.current = merged;
            draftState.setDraft((current) => current?.story.id === story.id ? { ...current, story: merged } : current);
            if (library.cloud) library.persistStory(merged, "draft");
          } },
        });
        if (!request.signal.aborted) setError(warnings.join(" "));
      } else if (data.mediaWarning) setError(data.mediaWarning);
    } catch (error) {
      if (!request.signal.aborted && controller.current === request)
        setError(error instanceof Error && error.name === "TimeoutError" ? "Generation timed out. Try a shorter idea." : error instanceof Error ? error.message : "Could not finish your game. Try again.");
    } finally {
      if (controller.current === request) { controller.current = null; setGenerating(false); }
    }
  };
  const cancel = () => { controller.current?.abort(); controller.current = null; setGenerating(false); setError(library.cloud ? "Stopped waiting. Submitted generations continue saving to My Games and Saved media." : draftState.draft ? "Remaining media cancelled. Completed text and media are kept for review." : "Generation cancelled. Your idea is ready whenever you are."); };
  const updateAppearance = (change: (story: Story) => Story) => {
    const current = draftState.draft;
    if (!current) return;
    const story = change(latestDraft.current?.id === current.story.id ? latestDraft.current : current.story);
    latestDraft.current = story;
    draftState.setDraft({ ...current, story });
    if (library.cloud) library.persistStory(story, "draft");
  };
  return <main className="builder-page product-page">
    <div className={`page-heading builder-heading ${draftState.draft ? "review-heading" : ""}`}><div><span className="kicker">{draftState.draft ? "YOUR STORY TAKES SHAPE" : "THE STORY STARTS HERE"}</span><h1>{draftState.draft ? "Review your story" : <>Small idea.<br />A world of possibilities</>}<span className="title-dot">.</span></h1></div>
      <p className="builder-heading-note">Create a story.<br />Let every choice count.</p></div>
    {draftState.draft && <ol className="builder-steps" aria-label="Creation steps"><li className="complete"><span><Check size={13} /></span> Shape your idea</li><li className="current"><span>02</span> Explore the draft</li><li><span>03</span> Edit & export</li></ol>}
    {draftState.draft ? <section className="builder-review">{(mediaStatus || generating || error) && <div className="media-batch" role="status"><p>{mediaStatus || "Story ready"}</p>{error && <p className="form-error">{error}</p>}{generating && <button className="button" onClick={cancel}>Stop remaining media</button>}<small>Keep & edit stops pending media and keeps everything ready so far.</small></div>}<AIDraftReview story={draftState.draft.story} repaired={draftState.draft.repaired} onThemeChange={(theme) => updateAppearance(story => changeTheme(story, theme))} onSceneGlowChange={(enabled) => updateAppearance(story => changeSceneGlow(story, enabled))} onDiscard={() => { controller.current?.abort(); controller.current = null; setGenerating(false); setMediaStatus(""); setError(""); draftState.setDraft(null); }} onKeep={() => openEditor(library.cloud ? draftState.draft!.story : copyStory(draftState.draft!.story))} /></section> :
    <div className="builder-layout">
      <section className="creation-card">
        <div className="creation-tabs" aria-label="Creation method">
          <button className={mode === "ai" ? "active" : ""} aria-pressed={mode === "ai"} onClick={() => setMode("ai")} disabled={generating}><Sparkles size={16} /> Create with AI</button>
          <button className={mode === "blank" ? "active" : ""} aria-pressed={mode === "blank"} onClick={() => setMode("blank")} disabled={generating}><PenLine size={16} /> Start from scratch</button>
        </div>
        {mode === "ai" ? <form onSubmit={(event) => { event.preventDefault(); void generate(); }}>
          <div className="creation-intro"><h2>Where does your story begin?</h2><p>A character, a place, a difficult choice.</p></div>
          <label className="idea-label"><span className="sr-only">Your game idea</span><textarea required minLength={15} maxLength={1500} value={draftState.brief.premise} disabled={generating} onChange={(event) => draftState.setBrief({ ...draftState.brief, premise: event.target.value })} placeholder="You arrive in a town where nobody is allowed to dream. Tonight, you fall asleep…" /><span className="character-count">{draftState.brief.premise.length} / 1,500</span></label>
          <div className="idea-prompts"><span>Need a spark?</span>{ideas.map((idea) => <button type="button" disabled={generating} key={idea.label} onClick={() => draftState.setBrief({ ...draftState.brief, premise: idea.text })}>{idea.label} <ArrowUpRight size={12} /></button>)}</div>
          <div className="creation-options"><label className="field-label">Mood<select value={draftState.brief.tone} disabled={generating} onChange={(event) => draftState.setBrief({ ...draftState.brief, tone: event.target.value })}>{["Mysterious", "Hopeful", "Adventurous", "Whimsical", "Suspenseful"].map((tone) => <option key={tone}>{tone}</option>)}</select></label><label className="field-label">Language<select value={draftState.brief.language} disabled={generating} onChange={(event) => draftState.setBrief({ ...draftState.brief, language: event.target.value })}><option value="auto">Match my idea</option><option value="en">English</option><option value="zh">简体中文</option></select></label></div>
          <details className="creation-media-options">
            <summary><span>Scene images &amp; sound</span><span className="media-options-summary">{images ? "Images on" : "Images off"} · {music ? "Music on" : "Music off"}<ChevronDown size={14} /></span></summary>
            <div className="media-options-body">
          <div className="creation-options">
            <label className="field-label">Background music<select disabled={generating} value={music ? "auto" : "off"} onChange={(e) => setMusic(e.target.value === "auto")}><option value="auto">Auto · Free CC0 library</option><option value="off">Off</option></select></label>
            <label className="field-label">Scene images<select disabled={generating || !connection.imagesReady} value={images ? "on" : "off"} onChange={(e) => setImages(e.target.value === "on")}><option value="off">Off</option><option value="on">Generate · Up to 4 images</option></select></label>
          </div>
          {images && <label className="field-label">Visual style<select disabled={generating} value={style} onChange={(e) => setStyle(e.target.value as VisualStyle)}><option value="storybook">Storybook</option><option value="cinematic">Cinematic</option></select><small>Text is playable while images finish.</small></label>}
          {!connection.imagesReady ? <p className="generation-footnote">Check image availability in <Link href="/settings">Settings</Link>. Free music works without an image connection.</p> : null}
            </div>
          </details>
          {images && <p className="image-billing-note">Generated images use separately billed OpenAI API usage.</p>}
          <div className="builder-connection"><span className={canGenerate ? "status-dot ready" : "status-dot"} /><span>{connection.checking ? "Checking AI connection…" : canGenerate ? "AI is ready" : "Check AI setup in Settings"}</span><Link href="/settings" aria-label="AI connection settings"><Settings2 size={14} /> Settings</Link></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="generate-actions"><button className="button primary generate-button" type="submit" disabled={!library.ready || !canGenerate || generating}>{generating ? <><LoaderCircle size={17} className="spin" /> Building your game…</> : <><Sparkles size={17} /> Generate game <ArrowRight size={17} /></>}</button>{generating && <button className="button" type="button" onClick={cancel}><X size={15} /> {library.cloud ? "Stop waiting" : "Cancel"}</button>}</div>
          <p className="generation-footnote" role={generating ? "status" : undefined}>{generating ? (library.cloud ? "Your draft saves to My Games. Leaving this page stops waiting; submitted generations continue." : "Writing passages and checking every path. You can cancel at any time. Leaving this page stops generation.") : "Review the complete draft before adding it to your games."}</p>
        </form> : <form className="blank-form" onSubmit={(event) => { event.preventDefault(); openEditor(newStory(title.trim() || "Untitled game")); }}><div className="creation-intro"><span className="section-number">01 / A BLANK CANVAS</span><h2>Write it your way.</h2><p>Start with one passage. Add choices and see your world take shape.</p></div><label className="field-label">Game title<input autoFocus maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give your world a name" /></label><button className="button primary" disabled={!library.ready || !library.available} type="submit">Open editor <ArrowRight size={17} /></button><p className="generation-footnote">{library.cloud ? "No AI connection needed. Your game saves to the shared cloud workspace." : "No AI connection needed. Your game saves in this browser."}</p></form>}
      </section>
      <aside className="blueprint-card"><div className="blueprint-heading"><span>ONE BEGINNING. MANY POSSIBILITIES.</span></div><h2>Your next story<br />has more than<br />one ending.</h2><p>Every choice takes your reader somewhere new.</p>
        <StoryTree />
        <div className="blueprint-facts"><span><BookOpen size={16} /> 8–12 connected passages</span><span><Flag size={16} /> 2–3 different endings</span><span><PenLine size={16} /> Every word is editable</span></div>
        <Link href="/play/sample-last-light" className="sample-link">Play a sample game <ArrowUpRight size={16} /></Link>
      </aside>
    </div>}
    <section className="recent-section"><div><h2>Pick up where you left off</h2><Link href="/library">All games <ArrowRight size={14} /></Link></div>{!library.ready ? <p className="quiet">Opening your workspace…</p> : library.stories.length ? <div className="recent-games">{library.stories.slice(0, 3).map((story) => <Link href={`/builder/${encodeURIComponent(story.id)}`} key={story.id}><span className="recent-icon"><GitBranch size={19} /></span><span><strong>{story.title || "Untitled game"}</strong><small>{story.passageCount} passages · {story.endingCount} endings</small></span><ArrowUpRight size={17} /></Link>)}</div> : <div className="recent-empty"><BookOpen size={18} /><span>Your games will appear here. Start with an idea or a blank page.</span></div>}</section>
  </main>;
}
