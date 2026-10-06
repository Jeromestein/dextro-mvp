"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Sparkles, PenLine, BookOpen, GitBranch, Flag, LoaderCircle, Settings2, Check, X } from "lucide-react";
import { copyStory, newStory, storySchema, validateStory, type Story } from "@/modules/story/model";
import AIDraftReview from "./draft-review";
import { useLibrary } from "@/modules/workspace/library-provider";
import { useConnection } from "@/modules/connections/provider";
import { useGenerationDraft } from "./draft-provider";

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
  const controller = useRef<AbortController | null>(null);
  const canGenerate = connection.aiReady && (connection.provider === "chatgpt" ? connection.local : Boolean(connection.accessCode)) && !connection.checking;
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (controller.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);
  const openEditor = (story: Story) => {
    if (library.persistStory(story)) { draftState.setDraft(null); router.push(`/builder/${encodeURIComponent(story.id)}`); }
  };
  const generate = async () => {
    if (controller.current || !canGenerate) return;
    const request = new AbortController();
    controller.current = request;
    setGenerating(true); setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json", ...(connection.provider !== "chatgpt" ? { "X-Workshop-Code": connection.accessCode } : {}) },
        body: JSON.stringify({ ...draftState.brief, ...(connection.provider === "chatgpt" && connection.model ? { model: connection.model } : {}) }),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(170_000)]),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate this game. Please try again.");
      if (request.signal.aborted || controller.current !== request) return;
      const story = storySchema.parse(data.story);
      if (validateStory(story).length) throw new Error("The draft did not pass the story checks. Try again.");
      draftState.setDraft({ story, repaired: data.repaired === true });
    } catch (error) {
      if (!request.signal.aborted && controller.current === request)
        setError(error instanceof Error && error.name === "TimeoutError" ? "Generation timed out. Try a shorter idea." : error instanceof Error ? error.message : "Could not finish your game. Try again.");
    } finally {
      if (controller.current === request) { controller.current = null; setGenerating(false); }
    }
  };
  const cancel = () => { controller.current?.abort(); controller.current = null; setGenerating(false); setError("Generation cancelled. Your idea is ready whenever you are."); };
  return <main className="builder-page product-page">
    <div className="page-heading"><div><span className="kicker">CREATE / EXPLORE / PLAY</span><h1>Game Builder<span className="title-dot">.</span></h1><p>Your idea. A world of choices. A game worth playing.</p></div>
      <Link href="/library" className="button">My Games <ArrowUpRight size={16} /></Link></div>
    <ol className="builder-steps" aria-label="Creation steps"><li className={!draftState.draft ? "current" : "complete"}><span>{draftState.draft ? <Check size={13} /> : "01"}</span> Shape your idea</li><li className={draftState.draft ? "current" : ""}><span>02</span> Explore the draft</li><li><span>03</span> Edit & export</li></ol>
    {draftState.draft ? <section className="builder-review"><AIDraftReview story={draftState.draft.story} repaired={draftState.draft.repaired} onDiscard={() => draftState.setDraft(null)} onKeep={() => openEditor(copyStory(draftState.draft!.story))} /></section> :
    <div className="builder-layout">
      <section className="creation-card">
        <div className="creation-tabs" aria-label="Creation method">
          <button className={mode === "ai" ? "active" : ""} aria-pressed={mode === "ai"} onClick={() => setMode("ai")} disabled={generating}><Sparkles size={16} /> Create with AI</button>
          <button className={mode === "blank" ? "active" : ""} aria-pressed={mode === "blank"} onClick={() => setMode("blank")} disabled={generating}><PenLine size={16} /> Start from scratch</button>
        </div>
        {mode === "ai" ? <form onSubmit={(event) => { event.preventDefault(); void generate(); }}>
          <div className="creation-intro"><span className="section-number">01 / THE IDEA</span><h2>Where does your story begin?</h2><p>A character, a place, a difficult choice. Give us a starting point.</p></div>
          <label className="idea-label"><span className="sr-only">Your game idea</span><textarea required minLength={15} maxLength={1500} value={draftState.brief.premise} disabled={generating} onChange={(event) => draftState.setBrief({ ...draftState.brief, premise: event.target.value })} placeholder="You arrive in a town where nobody is allowed to dream. Tonight, you fall asleep…" /><span className="character-count">{draftState.brief.premise.length} / 1,500</span></label>
          <div className="idea-prompts"><span>Need a spark?</span>{ideas.map((idea) => <button type="button" disabled={generating} key={idea.label} onClick={() => draftState.setBrief({ ...draftState.brief, premise: idea.text })}>{idea.label} <ArrowUpRight size={12} /></button>)}</div>
          <div className="creation-options"><label className="field-label">Mood<select value={draftState.brief.tone} disabled={generating} onChange={(event) => draftState.setBrief({ ...draftState.brief, tone: event.target.value })}>{["Mysterious", "Hopeful", "Adventurous", "Whimsical", "Suspenseful"].map((tone) => <option key={tone}>{tone}</option>)}</select></label><label className="field-label">Language<select value={draftState.brief.language} disabled={generating} onChange={(event) => draftState.setBrief({ ...draftState.brief, language: event.target.value })}><option value="auto">Match my idea</option><option value="en">English</option><option value="zh">简体中文</option></select></label></div>
          <div className="builder-connection"><span className={canGenerate ? "status-dot ready" : "status-dot"} /><span>{connection.checking ? "Checking AI connection…" : canGenerate ? "AI is ready" : "Connect AI in Settings to generate"}</span><Link href="/settings" aria-label="AI connection settings"><Settings2 size={14} /> Settings</Link></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="generate-actions"><button className="button primary generate-button" type="submit" disabled={!library.ready || !canGenerate || generating}>{generating ? <><LoaderCircle size={17} className="spin" /> Building your game…</> : <><Sparkles size={17} /> Generate game <ArrowRight size={17} /></>}</button>{generating && <button className="button" type="button" onClick={cancel}><X size={15} /> Cancel</button>}</div>
          <p className="generation-footnote" role={generating ? "status" : undefined}>{generating ? "Writing passages and checking every path. You can cancel at any time. Leaving this page stops generation." : "Review the complete draft before adding it to your games."}</p>
        </form> : <form className="blank-form" onSubmit={(event) => { event.preventDefault(); openEditor(newStory(title.trim() || "Untitled game")); }}><div className="creation-intro"><span className="section-number">01 / A BLANK CANVAS</span><h2>Write it your way.</h2><p>Start with one passage. Add choices and see your world take shape.</p></div><label className="field-label">Game title<input autoFocus maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give your world a name" /></label><button className="button primary" disabled={!library.ready} type="submit">Open editor <ArrowRight size={17} /></button><p className="generation-footnote">No AI connection needed. Your game saves in this browser.</p></form>}
      </section>
      <aside className="blueprint-card"><div className="blueprint-heading"><GitBranch size={19} /><span>SMALL GAME. MANY PATHS.</span></div><h2>One beginning.<br />More than one ending.</h2><p>Every choice takes your reader somewhere new.</p>
        <div className="branch-diagram" aria-label="A beginning branches into choices and different endings"><div className="branch-start"><span /> The beginning</div><div className="branch-stem" /><div className="branch-fork"><span>Take a chance</span><span>Walk away</span></div><div className="branch-ends"><span><Flag size={13} /> Ending A</span><span><Flag size={13} /> Ending B</span><span><Flag size={13} /> Ending C</span></div></div>
        <div className="blueprint-facts"><span><BookOpen size={16} /> 8–12 connected passages</span><span><Flag size={16} /> 2–3 different endings</span><span><PenLine size={16} /> Every word is editable</span></div>
        <Link href="/play/sample-last-light" className="sample-link">Play a sample game <ArrowUpRight size={16} /></Link>
      </aside>
    </div>}
    <section className="recent-section"><div><h2>Pick up where you left off</h2><Link href="/library">All games <ArrowRight size={14} /></Link></div>{!library.ready ? <p className="quiet">Opening your workspace…</p> : library.stories.length ? <div className="recent-games">{library.stories.slice(0, 3).map((story) => <Link href={`/builder/${encodeURIComponent(story.id)}`} key={story.id}><span className="recent-icon"><GitBranch size={19} /></span><span><strong>{story.title || "Untitled game"}</strong><small>{story.passages.length} passages · {story.passages.filter((p) => p.ending).length} endings</small></span><ArrowUpRight size={17} /></Link>)}</div> : <div className="recent-empty"><BookOpen size={18} /><span>Your games will appear here. Start with an idea or a blank page.</span></div>}</section>
  </main>;
}
