"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, CheckCircle2, ChevronDown, Download, Flag,
  GitBranch, ListTree, LoaderCircle, PanelRightClose, PanelRightOpen, PenLine,
  Play, Plus, Redo2, Sparkles, Undo2, X, AlertCircle } from "lucide-react";
import { newPassage, uid, validateStory, type Story, type Passage } from "@/modules/story/model";
import { appendPassage, changePassage, connectChoice, removePassage } from "./session/operations";
import { autoLayout, layoutSignature, setPositions } from "./graph/layout";
import type { ChoiceRef, Point, Positions, Viewport } from "./session/types";
import { buildGame, download, filename } from "@/modules/export/standalone";
import { useLibrary } from "@/modules/workspace/library-provider";
import Dialog from "@/shared/ui/dialog";
import Player from "@/modules/player/player";
import StoryOutline from "@/modules/editor/outline/story-outline";

import PassageForm from "./text/passage-form";
import SceneImageField from "./media-panel/scene-image-field";
import { readSceneImage } from "@/modules/media/images/read-image";
import { useEditorSession } from "./session/use-editor-session";

const StoryGraph = dynamic(() => import("@/modules/editor/graph/story-graph"), {
  ssr: false, loading: () => <div className="graph-loading"><LoaderCircle className="spin" size={22} /> Opening your story map…</div>,
});
type Modal = "checks" | "delete" | "create" | "details" | null;
export default function StoryEditor({ initialStory }: { initialStory: Story }) {
  const { persistStory, saving, storageError } = useLibrary();
  const { history, historyRef, send, commit } = useEditorSession(initialStory, persistStory);
  const initialRef = useRef(initialStory);
  const [selection, setSelection] = useState(initialStory.startId);
  const [view, setView] = useState<"graph" | "outline">(() => typeof window !== "undefined" && window.matchMedia("(max-width:760px)").matches ? "outline" : "graph");
  const [panel, setPanel] = useState<"edit" | "preview">("edit");
  const [panelOpen, setPanelOpen] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [notice, setNotice] = useState("");
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [layoutToken, setLayoutToken] = useState(0);
  const [focusToken, setFocusToken] = useState(0);
  const [preview, setPreview] = useState({ from: initialStory.startId, key: 0 });
  const [pendingCreate, setPendingCreate] = useState<{ position: Point; from?: ChoiceRef } | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const layoutJob = useRef(0);
  const initialized = useRef(false);
  const story = history.present;
  const passage = story.passages.find((p) => p.id === selection) || story.passages.find((p) => p.id === story.startId) || story.passages[0];
  const selected = passage.id;
  const issues = useMemo(() => validateStory(story), [story]);
  const errors = issues.filter((i) => i.level === "error");
  const selectedIssues = issues.filter((i) => i.passageId === selected);

  const select = useCallback((id: string) => {
    setSelection(id); setPanelOpen(true); setPreview((old) => ({ from: id, key: old.key + 1 }));
    send({ type: "break-group" });
  }, [send]);
  const focus = useCallback((id: string) => { select(id); setFocusToken((n) => n + 1); }, [select]);
  const writePassage = (changes: Partial<Passage>, group?: string) => commit((s) => changePassage(s, selected, changes), group);
  const link = useCallback((ref: ChoiceRef, target: string) => {
    if (commit((s) => connectChoice(s, ref, target))) setNotice(target ? "Choice connected." : "Connection removed. The choice text is kept.");
  }, [commit]);
  const move = useCallback((positions: Positions) => { commit((s) => setPositions(s, positions)); }, [commit]);
  const saveViewport = useCallback((viewport: Viewport) => { send({ type: "viewport", viewport }); }, [send]);
  const addChoice = useCallback((id: string) => {
    commit((s) => { const p = s.passages.find((p) => p.id === id); return !p || p.ending || p.choices.length >= 8 ? s : changePassage(s, id, { choices: [...p.choices, { id: uid(), text: "", target: "" }] }); });
    select(id); setPanel("edit");
  }, [commit, select]);
  const addPassage = (ending = false, position?: Point, from?: ChoiceRef) => {
    const p = newPassage(); p.ending = ending; if (ending) p.title = "Untitled ending";
    if (commit((s) => appendPassage(s, p, position, from))) { focus(p.id); setPanel("edit"); setModal(null); setPendingCreate(null); }
  };
  const createAt = useCallback((position: Point, from?: ChoiceRef) => {
    if (historyRef.current.present.passages.length >= 150) { setNotice("This story has reached the 150-passage limit."); return; }
    setPendingCreate({ position, from }); setModal("create");
  }, [historyRef]);
  const requestDelete = useCallback((id: string) => {
    if (historyRef.current.present.passages.length <= 1) { setNotice("Keep at least one passage in your story."); return; }
    select(id); setModal("delete");
  }, [select, historyRef]);
  const runLayout = useCallback(async (automatic = false) => {
    const job = ++layoutJob.current;
    const source = historyRef.current.present;
    const signature = layoutSignature(source);
    setLayoutBusy(true);
    try {
      const positions = await autoLayout(source);
      if (job !== layoutJob.current) return;
      if (signature !== layoutSignature(historyRef.current.present)) {
        setNotice("The story changed while arranging. Choose Auto layout to arrange the latest version."); return;
      }
      commit((s) => setPositions(s, positions));
      if (automatic) setFocusToken((n) => n + 1);
      else setLayoutToken((n) => n + 1);
      if (!automatic) setNotice("Story arranged. Undo restores your previous layout.");
    } catch { if (job === layoutJob.current) setNotice("Automatic layout is unavailable. You can still arrange passages by dragging them."); }
    finally { if (job === layoutJob.current) setLayoutBusy(false); }
  }, [commit, historyRef]);
  const cancelLayouts = useCallback(() => { layoutJob.current++; }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (initialized.current) return;
      initialized.current = true;
      if (!initialRef.current.editor?.positions.length) void runLayout(true);
    }, 0);
    return () => { clearTimeout(timer); cancelLayouts(); };
  }, [runLayout, cancelLayouts]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 5500); return () => clearTimeout(timer); }, [notice]);
  const undo = () => { send({ type: "undo" }); setNotice("Change undone."); };
  const redo = () => { send({ type: "redo" }); setNotice("Change restored."); };
  const exportJSON = () => download(`${filename(story)}.dextro.json`, JSON.stringify(story, null, 2), "application/json");
  const exportHTML = () => {
    if (errors.length) { setModal("checks"); return; }
    try { download(`${filename(story)}.html`, buildGame(story), "text/html"); setNotice("Playable game downloaded. It works offline."); }
    catch (e) { setNotice((e as Error).message); }
  };
  const uploadImage = async (file?: File) => {
    if (!file) return;
    const id = selected;
    try {
      const data = await readSceneImage(file);
      if (!historyRef.current.present.passages.some((p) => p.id === id)) throw new Error("This passage was removed. Choose a passage and upload again.");
      commit((s) => changePassage(s, id, { image: data }));
    } catch (e) { setNotice((e as Error).message); }
  };
  const incoming = story.passages.flatMap((p) => p.choices.filter((c) => c.target === selected));
  const closeModal = () => { setModal(null); setPendingCreate(null); };
  return <main className="story-workbench" onKeyDown={(e) => {
    const editable = (e.target as HTMLElement).closest("input,textarea,select,[contenteditable=true]");
    if (editable || modal) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
  }}>
    <header className="workbench-header">
      <div className="workbench-identity"><Link href="/library" className="icon-button" aria-label="Back to My Games"><ArrowLeft size={19} /></Link><div><span className="kicker">STORY WORKSPACE</span><input aria-label="Story title" maxLength={200} value={story.title} onChange={(e) => commit((s) => ({ ...s, title: e.target.value }), "story-title")} /><span className={`workbench-save ${storageError ? "failed" : ""}`} role="status">{storageError ? <><AlertCircle size={12} /> Not saved</> : saving ? <><LoaderCircle size={12} className="spin" /> Saving…</> : <><Check size={12} /> Saved in this browser</>}</span></div></div>
      <div className="workbench-actions"><button className={`button ${errors.length ? "needs-attention" : ""}`} onClick={() => setModal("checks")}>{errors.length ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />} Check story{issues.length > 0 && <span className="workbench-count">{issues.length}</span>}</button><Link href={`/play/${encodeURIComponent(story.id)}`} className="button"><Play size={15} /> Play</Link><details className="export-menu"><summary className="button primary"><Download size={15} /> Export <ChevronDown size={13} /></summary><div><button onClick={exportHTML}>Playable HTML <ArrowUpRight size={14} /></button><button onClick={exportJSON}>Editable backup <Download size={14} /></button></div></details></div>
    </header>
    {storageError && <div className="storage-warning" role="alert"><AlertCircle size={17} />{storageError}<button onClick={exportJSON}>Download backup</button></div>}
    <div className="workbench-toolbar">
      <div className="workbench-view-switch" role="group" aria-label="Story view"><button aria-pressed={view === "graph"} onClick={() => { setView("graph"); send({ type: "break-group" }); }}><GitBranch size={15} /> Graph</button><button aria-pressed={view === "outline"} onClick={() => { setView("outline"); send({ type: "break-group" }); }}><ListTree size={16} /> Outline</button></div>
      <div className="workbench-history"><button className="icon-button" aria-label="Undo" title="Undo (⌘Z outside a text field)" disabled={!history.past.length} onClick={undo}><Undo2 size={17} /></button><button className="icon-button" aria-label="Redo" title="Redo (⌘⇧Z outside a text field)" disabled={!history.future.length} onClick={redo}><Redo2 size={17} /></button></div>
      <button className="workbench-layout" disabled={layoutBusy} onClick={() => void runLayout()}>{layoutBusy ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}<span>{layoutBusy ? "Arranging…" : "Auto layout"}</span></button>
      <div className="workbench-add"><button className="button" disabled={story.passages.length >= 150} onClick={() => addPassage()}><Plus size={15} /> Add passage</button><button className="button" disabled={story.passages.length >= 150} onClick={() => addPassage(true)}><Flag size={14} /> Add ending</button></div>
      <button className="icon-button workbench-panel-toggle" aria-label={panelOpen ? "Hide passage panel" : "Show passage panel"} title={panelOpen ? "Expand workspace" : "Show passage panel"} onClick={() => setPanelOpen((open) => !open)}>{panelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}</button>
    </div>
    <div className={`workbench-body ${panelOpen ? "" : "panel-hidden"}`}>
      <section className="workbench-structure" aria-label="Story structure">
        {view === "graph" ? <StoryGraph story={story} selected={selected} issues={issues} onSelect={select} onMove={move} onViewport={saveViewport}
          onConnect={link} onAddChoice={addChoice} onCreateAt={createAt} onDelete={requestDelete} focusToken={focusToken} layoutToken={layoutToken} /> :
          <StoryOutline story={story} selected={selected} issues={issues} onSelect={(id) => { focus(id); if (window.matchMedia("(max-width:760px)").matches) requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }} />}
        <div className="workbench-structure-foot"><button onClick={() => setModal("details")}>Story details <ArrowUpRight size={12} /></button><span>{story.passages.length}/150 passages · {story.passages.filter((p) => p.ending).length} endings</span></div>
      </section>
      {panelOpen && <aside className="workbench-inspector" ref={panelRef} aria-label="Passage editor">
        <div className="inspector-tabs" role="group" aria-label="Passage panel"><button aria-pressed={panel === "edit"} onClick={() => setPanel("edit")}><PenLine size={14} /> Edit passage</button><button aria-pressed={panel === "preview"} onClick={() => { setPanel("preview"); setPreview((p) => ({ from: selected, key: p.key + 1 })); }}><Play size={14} /> Preview</button></div>
        {panel === "preview" ? <div className="inspector-preview"><div className="inspector-preview-actions"><button onClick={() => setPreview((p) => ({ from: selected, key: p.key + 1 }))}>From selected</button><button onClick={() => setPreview((p) => ({ from: story.startId, key: p.key + 1 }))}>From opening <ArrowUpRight size={12} /></button></div><Player key={`${preview.key}-${selected}`} story={story} startId={story.passages.some((p) => p.id === preview.from) ? preview.from : selected} compact /></div> : <div className="inspector-form">
          <PassageForm story={story} passage={passage} issues={selectedIssues} onChange={writePassage}
          onSetOpening={() => commit((s) => s.startId === selected ? s : ({ ...s, startId: selected }))}
          onLocate={() => { setView("graph"); setFocusToken((n) => n + 1); }} onDelete={() => requestDelete(selected)}
          onAddChoice={() => addChoice(selected)} onConnect={link} onAddPassage={addPassage} onOpenTarget={focus}
          media={<SceneImageField image={passage.image} characters={passage.text.length} onUpload={uploadImage}
            onRemove={() => writePassage({ image: "" })} />} />
        </div>}
      </aside>}
    </div>
    {notice && <div className="toast" role="status"><span>{notice}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={15} /></button></div>}
    {modal === "checks" && <Dialog title="Check your story" onClose={closeModal}><p className="modal-description">We check story paths and missing content. Select an issue to find its passage.</p>{!issues.length ? <div className="check-success"><CheckCircle2 size={35} /><h3>All paths look good.</h3><p>Your story is ready to export.</p></div> : <div className="issues-list">{issues.map((issue, i) => <button key={i} className={`issue ${issue.level}`} onClick={() => { if (issue.passageId) { focus(issue.passageId); setPanel("edit"); closeModal(); } }}><AlertCircle size={15} /><span><small>{issue.level === "error" ? "NEEDS ATTENTION" : "GOOD TO KNOW"}</small>{issue.message}</span>{issue.passageId && <ArrowUpRight size={14} />}</button>)}</div>}<button className="button primary full" disabled={errors.length > 0} onClick={exportHTML}><Download size={15} /> Export playable story</button></Dialog>}
    {modal === "delete" && <Dialog title="Delete this passage?" onClose={closeModal}><p className="modal-description">“{passage.title || "Untitled passage"}” will be removed. {incoming.length ? `${incoming.length} incoming ${incoming.length === 1 ? "choice will" : "choices will"} keep their text and need a new destination.` : "No choices point to this passage."} {story.startId === selected && "The first remaining passage will become the opening."} You can undo this change.</p><div className="dialog-actions"><button className="button" onClick={closeModal}>Keep passage</button><button className="button danger-solid" onClick={() => { commit((s) => removePassage(s, selected)); select(historyRef.current.present.startId); closeModal(); }}>Delete passage</button></div></Dialog>}
    {modal === "create" && pendingCreate && <Dialog title="Continue this branch" onClose={closeModal}><p className="modal-description">Create a destination here. The choice will connect to it automatically.</p><div className="dialog-actions"><button className="button" onClick={closeModal}>Cancel</button><button className="button" onClick={() => addPassage(true, pendingCreate.position, pendingCreate.from)}><Flag size={15} /> New ending</button><button className="button primary" onClick={() => addPassage(false, pendingCreate.position, pendingCreate.from)}><Plus size={15} /> New passage</button></div></Dialog>}
    {modal === "details" && <Dialog title="Story details" onClose={closeModal}><label className="editor-field">Description<textarea maxLength={1000} value={story.description} onChange={(e) => commit((s) => ({ ...s, description: e.target.value }), "description")} /></label><label className="editor-field">Genre<input maxLength={50} value={story.genre} onChange={(e) => commit((s) => ({ ...s, genre: e.target.value }), "genre")} /></label><p className="modal-description">Stories and graph layouts stay in this browser. Download an editable backup to move your work to another device.</p><button className="button primary" onClick={closeModal}>Done</button></Dialog>}
  </main>;
}
