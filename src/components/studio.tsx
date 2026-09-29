"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Flag,
  GitBranch,
  ImagePlus,
  Library,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  AlertCircle,
  Play,
  Copy,
  CircleHelp,
  PenLine,
} from "lucide-react";
import {
  newStory,
  newPassage,
  uid,
  copyStory,
  storySchema,
  validateStory,
  type Story,
  type Passage,
} from "@/lib/story";
import { loadStories, saveStory, removeStory } from "@/lib/storage";
import { sampleStory } from "@/lib/sample";
import { buildGame, download, filename } from "@/lib/export";
import Player from "./player";
import { Lighthouse } from "./illustration";

type Modal =
  | "new"
  | "ai"
  | "checks"
  | "help"
  | "delete-story"
  | "delete-passage"
  | null;
function Dialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function Studio() {
  const [stories, setStories] = useState<Story[]>([]);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"home" | "editor" | "play">("home");
  const [active, setActive] = useState<Story | null>(null);
  const [selected, setSelected] = useState("");
  const [previewStart, setPreviewStart] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [modal, setModal] = useState<Modal>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [aiReady, setAiReady] = useState(false);
  const [premise, setPremise] = useState("");
  const [tone, setTone] = useState("Mysterious");
  const [accessCode, setAccessCode] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [generated, setGenerated] = useState<Story | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const writes = useRef(0);
  const importRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const generationAbort = useRef<AbortController | null>(null);
  const activeRef = useRef<Story | null>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);
  useEffect(() => {
    loadStories()
      .then(setStories)
      .catch((e) => setStorageError(e.message))
      .finally(() => setReady(true));
    fetch("/api/generate")
      .then((r) => r.json())
      .then((d) => setAiReady(d.available === true))
      .catch(() => setAiReady(false));
    return () => generationAbort.current?.abort();
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (writes.current > 0 || storageError) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [storageError]);
  const persist = (story: Story) => {
    const stamped = { ...story, updatedAt: new Date().toISOString() };
    if (new TextEncoder().encode(JSON.stringify(stamped)).length > 24_000_000) {
      setNotice(
        "This story is too large to save safely. Remove an image or shorten the text.",
      );
      return false;
    }
    activeRef.current = stamped;
    setActive(stamped);
    setStories((prev) => [stamped, ...prev.filter((s) => s.id !== stamped.id)]);
    writes.current++;
    setSaving(true);
    saveQueue.current = saveQueue.current
      .then(() => saveStory(stamped))
      .then(() => setStorageError(""))
      .catch((e) => setStorageError(e.message))
      .finally(() => {
        writes.current--;
        if (!writes.current) setSaving(false);
      });
    return true;
  };
  const edit = (story: Story) => {
    const opening = story.passages.some((p) => p.id === story.startId)
      ? story.startId
      : story.passages[0].id;
    activeRef.current = story;
    setActive(story);
    setSelected(opening);
    setPreviewStart(opening);
    setPreviewKey((k) => k + 1);
    setView("editor");
  };
  const create = (story: Story) => {
    if (!persist(story)) return false;
    edit(story);
    setModal(null);
    return true;
  };
  const play = (story: Story) => {
    activeRef.current = story;
    setActive(story);
    setPreviewKey((k) => k + 1);
    setView("play");
  };
  const selectPassage = (id: string) => {
    setSelected(id);
    setPreviewStart(id);
    setPreviewKey((k) => k + 1);
  };
  const update = (changes: Partial<Story>) => {
    return active ? persist({ ...active, ...changes }) : false;
  };
  const passage = active?.passages.find((p) => p.id === selected);
  const updatePassage = (changes: Partial<Passage>) => {
    if (active && passage)
      update({
        passages: active.passages.map((p) =>
          p.id === selected ? { ...p, ...changes } : p,
        ),
      });
  };
  const addPassage = () => {
    if (!active || active.passages.length >= 150) return;
    const p = newPassage();
    if (update({ passages: [...active.passages, p] })) selectPassage(p.id);
  };
  const issues = active ? validateStory(active) : [];
  const errors = issues.filter((i) => i.level === "error");
  const exportJSON = () => {
    if (active) {
      download(
        `${filename(active)}.dextro.json`,
        JSON.stringify(active, null, 2),
        "application/json",
      );
      setNotice("Editable backup downloaded.");
    }
  };
  const exportHTML = () => {
    if (!active) return;
    if (errors.length) {
      setModal("checks");
      return;
    }
    try {
      download(`${filename(active)}.html`, buildGame(active), "text/html");
      setNotice(
        "Your playable story is ready. Open the HTML file in a browser.",
      );
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  const importStory = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 25_000_000)
        throw new Error("Choose a story file smaller than 25 MB.");
      const parsed = storySchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success)
        throw new Error(
          "This file is not a valid Dextro story. Choose a .dextro.json backup.",
        );
      if (create(copyStory(parsed.data)))
        setNotice("Story imported as a new copy.");
    } catch (e) {
      setNotice((e as Error).message);
    }
    if (importRef.current) importRef.current.value = "";
  };
  const uploadImage = async (file?: File) => {
    if (!file) return;
    const storyAtUpload = active;
    const passageAtUpload = passage;
    try {
      if (!storyAtUpload || !passageAtUpload) return;
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 2_000_000)
        throw new Error("Choose a PNG, JPEG or WebP image under 2 MB.");
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("Could not read that image."));
        r.readAsDataURL(file);
      });
      const latest = activeRef.current;
      if (
        latest?.id !== storyAtUpload.id ||
        !latest.passages.some((p) => p.id === passageAtUpload.id)
      )
        throw new Error(
          "The story changed while uploading. Please attach the image again.",
        );
      const updated = {
        ...latest,
        passages: latest.passages.map((p) =>
          p.id === passageAtUpload.id ? { ...p, image: data } : p,
        ),
      };
      if (new TextEncoder().encode(JSON.stringify(updated)).length > 24_000_000)
        throw new Error(
          "This story is too large. Remove an image before adding another.",
        );
      persist(updated);
    } catch (e) {
      setNotice((e as Error).message);
    }
    if (imageRef.current) imageRef.current.value = "";
  };
  const deleteStory = async () => {
    if (!active) return;
    const id = active.id;
    try {
      await saveQueue.current;
      await removeStory(id);
      setStories((prev) => prev.filter((s) => s.id !== id));
      setActive(null);
      setView("home");
      setModal(null);
      setNotice("Story deleted from this browser.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  const deletePassage = () => {
    if (!active || !passage || active.passages.length <= 1) return;
    const remaining = active.passages
      .filter((p) => p.id !== selected)
      .map((p) => ({
        ...p,
        choices: p.choices.map((c) =>
          c.target === selected ? { ...c, target: "" } : c,
        ),
      }));
    const startId =
      active.startId === selected ? remaining[0].id : active.startId;
    update({ passages: remaining, startId });
    selectPassage(startId);
    setModal(null);
  };
  const generate = async () => {
    setGenerating(true);
    setAiError("");
    setGenerated(null);
    const controller = new AbortController();
    generationAbort.current = controller;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workshop-Code": accessCode,
        },
        body: JSON.stringify({ premise, tone }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Generation failed. Please try again.");
      setGenerated(storySchema.parse(data.story));
    } catch (e) {
      if (!controller.signal.aborted) setAiError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };
  const closeModal = () => {
    if (generating) generationAbort.current?.abort();
    setModal(null);
    setGenerated(null);
    setAiError("");
    setAccessCode("");
  };
  const openAI = () => {
    setGenerated(null);
    setAiError("");
    setModal("ai");
  };
  const filtered = stories.filter((s) =>
    `${s.title} ${s.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className={`studio-shell ${view !== "home" ? "workspace-shell" : ""}`}>
      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => void importStory(e.target.files?.[0])}
      />
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => setView("home")}
          aria-label="Dextro home"
        >
          dextro<span>✳</span>
        </button>
        <div className="studio-label">YOUR STORY STUDIO</div>
        <nav>
          <button
            className={view === "home" ? "nav-link active" : "nav-link"}
            onClick={() => setView("home")}
          >
            <Library size={18} /> My stories{" "}
            <span className="nav-count">{stories.length}</span>
          </button>
          <button
            className="nav-link"
            onClick={() => {
              setNewTitle("");
              setModal("new");
            }}
          >
            <PenLine size={18} /> New story
          </button>
          <button className="nav-link" onClick={openAI}>
            <Sparkles size={18} /> AI co-writer{" "}
            <span className="mini-badge">BETA</span>
          </button>
        </nav>
        <div className="sidebar-note">
          <GitBranch size={24} />
          <p>
            Small choices.
            <br />
            Endless possibilities.
          </p>
          <span>
            Give your imagination
            <br />
            somewhere to go.
          </span>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-link" onClick={() => setModal("help")}>
            <CircleHelp size={18} /> Studio guide
          </button>
          <div className="local-status">
            <span /> Local workspace <small>Saved in this browser</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>
              {view === "home"
                ? "My stories"
                : view === "editor"
                  ? "Story editor"
                  : "Play your story"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="edition">EARLY EDITION · 01</span>
            <div className="avatar">Y</div>
          </div>
        </header>
        {storageError && (
          <div className="storage-warning" role="alert">
            <AlertCircle size={17} />
            {storageError}
            {active && <button onClick={exportJSON}>Download backup</button>}
          </div>
        )}
        {view === "home" && (
          <main className="library-page">
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span /> A LITTLE IMAGINATION GOES A LONG WAY
                </div>
                <h1>
                  Every choice
                  <br />
                  opens a <em>world.</em>
                </h1>
                <p>
                  Write a story that takes a different turn.
                  <br />
                  Build the paths. Let your readers choose.
                </p>
                <div className="hero-actions">
                  <button
                    className="button primary"
                    disabled={!ready}
                    onClick={() => {
                      setNewTitle("");
                      setModal("new");
                    }}
                  >
                    <Plus size={18} /> Create a story
                  </button>
                  <button
                    className="text-button"
                    onClick={() => play(sampleStory())}
                  >
                    Try a story <ArrowUpRight size={18} />
                  </button>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="art-orbit" />
                <div className="art-stars">✳</div>
                <div className="story-slip slip-back">
                  <span>02 / THE CHOICE</span>
                  <p>
                    Which way
                    <br />
                    will you go?
                  </p>
                  <div className="slip-rule" />
                  <div className="slip-rule short" />
                </div>
                <div className="story-slip slip-front">
                  <div className="slip-caption">
                    <BookOpen size={15} /> A NEW BEGINNING
                  </div>
                  <Lighthouse />
                  <h3>The story is yours.</h3>
                  <div className="slip-choice">
                    Follow the light <ArrowRight size={14} />
                  </div>
                </div>
                <div className="art-sticker">
                  <GitBranch size={18} /> One story. Many paths.
                </div>
              </div>
            </section>
            <section className="library-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow muted">
                    MAKE SOMETHING WORTH EXPLORING
                  </div>
                  <h2>
                    Your stories <span>{stories.length}</span>
                  </h2>
                </div>
                <div className="library-tools">
                  <label className="search-box">
                    <Search size={16} />
                    <input
                      aria-label="Search stories"
                      placeholder="Find a story…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <button
                    className="button subtle"
                    disabled={!ready}
                    onClick={() => importRef.current?.click()}
                  >
                    <Upload size={16} /> Import
                  </button>
                </div>
              </div>
              {!ready ? (
                <div className="loading">
                  <LoaderCircle className="spin" /> Opening your workspace…
                </div>
              ) : (
                <div className="story-grid">
                  {!search && (
                    <article className="story-card sample-card">
                      <button
                        className="card-art"
                        onClick={() => play(sampleStory())}
                        aria-label="Play The Last Light sample"
                      >
                        <Lighthouse />
                        <span className="cover-label">A DEXTRO ORIGINAL</span>
                        <span className="cover-play">
                          <Play size={20} fill="currentColor" />
                        </span>
                      </button>
                      <div className="card-body">
                        <div className="card-meta">
                          <span className="tag">STARTER STORY</span>
                          <span>5 min read</span>
                        </div>
                        <h3>The Last Light</h3>
                        <p>
                          A letter with your name. A light across the bay. Some
                          stories are waiting to find you.
                        </p>
                        <div className="card-footer">
                          <span>
                            <GitBranch size={14} /> 9 passages · 3 endings
                          </span>
                          <button
                            className="icon-button"
                            title="Make a copy to edit"
                            aria-label="Edit a copy of The Last Light"
                            onClick={() => create(copyStory(sampleStory()))}
                          >
                            <Copy size={17} />
                          </button>
                        </div>
                      </div>
                    </article>
                  )}
                  {filtered.map((s, i) => (
                    <article className="story-card" key={s.id}>
                      <button
                        className={`written-cover cover-${i % 3}`}
                        onClick={() => edit(s)}
                        aria-label={`Edit ${s.title}`}
                      >
                        <span className="cover-label">YOUR NEXT ADVENTURE</span>
                        <span className="cover-symbol">
                          {["✳", "◇", "◒"][i % 3]}
                        </span>
                        <span className="cover-title">
                          {s.title || "Untitled story"}
                        </span>
                      </button>
                      <div className="card-body">
                        <div className="card-meta">
                          <span className="tag draft">DRAFT</span>
                          <span>{s.genre}</span>
                        </div>
                        <h3>
                          <button onClick={() => edit(s)}>
                            {s.title || "Untitled story"}
                          </button>
                        </h3>
                        <p>
                          {s.description ||
                            "An unwritten world. Pick up where you left off."}
                        </p>
                        <div className="card-footer">
                          <span>
                            <GitBranch size={14} />
                            {s.passages.length} passages ·{" "}
                            {s.passages.filter((p) => p.ending).length} endings
                          </span>
                          <div>
                            <button
                              className="icon-button"
                              title="Play story"
                              aria-label={`Play ${s.title}`}
                              onClick={() => play(s)}
                            >
                              <Play size={16} />
                            </button>
                            <button
                              className="icon-button"
                              title="Delete story"
                              aria-label={`Delete ${s.title}`}
                              onClick={() => {
                                setActive(s);
                                setModal("delete-story");
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!search && (
                    <button
                      className="new-story-card"
                      onClick={() => {
                        setNewTitle("");
                        setModal("new");
                      }}
                    >
                      <span className="new-plus">
                        <Plus size={28} />
                      </span>
                      <h3>
                        A blank page.
                        <br />A thousand possibilities.
                      </h3>
                      <p>Your next story starts here.</p>
                      <span className="new-link">
                        Create a story <ArrowUpRight size={16} />
                      </span>
                    </button>
                  )}
                  {search && !filtered.length && (
                    <div className="search-empty">
                      No stories match “{search}”. Try another title.
                    </div>
                  )}
                </div>
              )}
            </section>
            <footer className="library-footer">
              <span>Made for the stories only you can tell.</span>
              <span>
                Drafts stay in this browser. Export a backup to keep them safe.{" "}
                <ArrowDownIcon />
              </span>
            </footer>
          </main>
        )}
        {view === "editor" && active && passage && (
          <main className="editor-page">
            <div className="workspace-heading">
              <div className="workspace-title">
                <button
                  className="icon-button"
                  aria-label="Back to stories"
                  onClick={() => setView("home")}
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <input
                    className="story-title-input"
                    aria-label="Story title"
                    maxLength={200}
                    value={active.title}
                    onChange={(e) => update({ title: e.target.value })}
                  />
                  <div className="save-state" role="status">
                    {storageError ? (
                      <>
                        <AlertCircle size={12} /> Not saved
                      </>
                    ) : saving ? (
                      <>
                        <LoaderCircle size={12} className="spin" /> Saving…
                      </>
                    ) : (
                      <>
                        <Check size={12} /> Saved in this browser
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="workspace-actions">
                <button
                  className={`button subtle ${errors.length ? "has-issues" : ""}`}
                  onClick={() => setModal("checks")}
                >
                  {errors.length ? (
                    <AlertCircle size={15} />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  <span>
                    Check story{issues.length ? ` · ${issues.length}` : ""}
                  </span>
                </button>
                <button className="button subtle" onClick={() => play(active)}>
                  <Play size={15} /> Play
                </button>
                <details className="export-menu">
                  <summary className="button primary">
                    <Download size={16} /> Export <ChevronDown size={13} />
                  </summary>
                  <div>
                    <button onClick={exportHTML}>
                      Playable HTML <ArrowUpRight size={15} />
                    </button>
                    <button onClick={exportJSON}>
                      Editable backup <Download size={15} />
                    </button>
                  </div>
                </details>
              </div>
            </div>
            <div className="editor-columns">
              <aside className="passage-sidebar">
                <div className="panel-heading">
                  <span>STORY OUTLINE</span>
                  <span>{active.passages.length}</span>
                </div>
                <div className="passage-list">
                  {active.passages.map((p, i) => (
                    <button
                      className={`passage-link ${p.id === selected ? "selected" : ""}`}
                      key={p.id}
                      onClick={() => selectPassage(p.id)}
                    >
                      <span className="passage-number">
                        {p.ending ? (
                          <Flag size={13} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      <span>
                        {p.title || "Untitled passage"}
                        <small>
                          {p.id === active.startId
                            ? "Opening"
                            : p.ending
                              ? "Ending"
                              : `${p.choices.length} choices`}
                        </small>
                      </span>
                      {issues.some(
                        (issue) =>
                          issue.passageId === p.id && issue.level === "error",
                      ) && <span className="issue-dot" />}
                    </button>
                  ))}
                </div>
                <button
                  className="button add-passage"
                  disabled={active.passages.length >= 150}
                  onClick={addPassage}
                >
                  <Plus size={15} /> Add passage
                </button>
                <details className="story-details">
                  <summary>
                    Story details <ChevronDown size={14} />
                  </summary>
                  <label>
                    Description
                    <textarea
                      maxLength={1000}
                      value={active.description}
                      placeholder="A few words to invite readers in…"
                      onChange={(e) => update({ description: e.target.value })}
                    />
                  </label>
                  <label>
                    Genre
                    <input
                      maxLength={50}
                      value={active.genre}
                      onChange={(e) => update({ genre: e.target.value })}
                    />
                  </label>
                </details>
              </aside>
              <section className="passage-editor">
                <div className="panel-heading">
                  <span>
                    <PenLine size={14} /> WRITE YOUR PASSAGE
                  </span>
                  <button
                    className="icon-button danger"
                    aria-label="Delete passage"
                    disabled={active.passages.length === 1}
                    onClick={() => setModal("delete-passage")}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <label className="field-label">
                  Passage title
                  <input
                    className="passage-title"
                    maxLength={200}
                    value={passage.title}
                    onChange={(e) => updatePassage({ title: e.target.value })}
                  />
                </label>
                <div className="passage-flags">
                  <button
                    className={`pill ${active.startId === selected ? "on" : ""}`}
                    onClick={() => update({ startId: selected })}
                  >
                    {active.startId === selected && <Check size={12} />} Opening
                  </button>
                  <button
                    className={`pill ${passage.ending ? "on" : ""}`}
                    disabled={!passage.ending && passage.choices.length > 0}
                    title={
                      passage.choices.length
                        ? "Remove outgoing choices before marking this as an ending"
                        : "Mark as an ending"
                    }
                    onClick={() => updatePassage({ ending: !passage.ending })}
                  >
                    <Flag size={12} /> Ending
                  </button>
                  <span>
                    {passage.choices.length > 0
                      ? "Remove choices to make an ending."
                      : "Choose how this passage fits."}
                  </span>
                </div>
                <label className="field-label story-text-label">
                  The story
                  <textarea
                    className="story-text"
                    placeholder="The door opens. What does your reader discover?"
                    value={passage.text}
                    maxLength={12000}
                    onChange={(e) => updatePassage({ text: e.target.value })}
                  />
                </label>
                <div className="text-tools">
                  <span>
                    {passage.text.trim()
                      ? passage.text.trim().split(/\s+/).length
                      : 0}{" "}
                    words
                  </span>
                  <button
                    className="text-button"
                    onClick={() => imageRef.current?.click()}
                  >
                    <ImagePlus size={15} />
                    {passage.image ? "Replace image" : "Add scene image"}
                  </button>
                  <input
                    type="file"
                    hidden
                    ref={imageRef}
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => void uploadImage(e.target.files?.[0])}
                  />
                </div>
                {passage.image && (
                  <div className="image-attachment">
                    <Image
                      unoptimized
                      width={55}
                      height={38}
                      src={passage.image}
                      alt="Attached scene"
                    />
                    <span>Scene image attached</span>
                    <button
                      className="icon-button"
                      aria-label="Remove scene image"
                      onClick={() => updatePassage({ image: "" })}
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
                {!passage.ending ? (
                  <div className="choices-editor">
                    <div className="section-heading small">
                      <div>
                        <h3>What happens next?</h3>
                        <p>Every choice leads somewhere.</p>
                      </div>
                      <span className="count-label">
                        {passage.choices.length}/8
                      </span>
                    </div>
                    {passage.choices.map((c, i) => (
                      <div className="choice-editor" key={c.id}>
                        <div className="choice-editor-top">
                          <span className="choice-number">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <input
                            aria-label={`Choice ${i + 1} text`}
                            maxLength={300}
                            placeholder="Write a choice…"
                            value={c.text}
                            onChange={(e) =>
                              updatePassage({
                                choices: passage.choices.map((item) =>
                                  item.id === c.id
                                    ? { ...item, text: e.target.value }
                                    : item,
                                ),
                              })
                            }
                          />
                          <button
                            className="icon-button"
                            aria-label={`Remove choice ${i + 1}`}
                            onClick={() =>
                              updatePassage({
                                choices: passage.choices.filter(
                                  (item) => item.id !== c.id,
                                ),
                              })
                            }
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="destination">
                          <GitBranch size={13} />
                          <label htmlFor={`destination-${c.id}`}>Go to</label>
                          <select
                            id={`destination-${c.id}`}
                            value={c.target}
                            onChange={(e) => {
                              if (e.target.value === "__new") {
                                const p = newPassage();
                                update({
                                  passages: [
                                    ...active.passages.map((n) =>
                                      n.id === selected
                                        ? {
                                            ...n,
                                            choices: n.choices.map((item) =>
                                              item.id === c.id
                                                ? { ...item, target: p.id }
                                                : item,
                                            ),
                                          }
                                        : n,
                                    ),
                                    p,
                                  ],
                                });
                              } else
                                updatePassage({
                                  choices: passage.choices.map((item) =>
                                    item.id === c.id
                                      ? { ...item, target: e.target.value }
                                      : item,
                                  ),
                                });
                            }}
                          >
                            <option value="">Choose a passage…</option>
                            {active.passages.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title || "Untitled passage"}
                                {p.ending ? " · Ending" : ""}
                              </option>
                            ))}
                            {active.passages.length < 150 && (
                              <option value="__new">
                                ＋ Create a new passage
                              </option>
                            )}
                          </select>
                        </div>
                      </div>
                    ))}
                    <button
                      className="add-choice"
                      disabled={passage.choices.length >= 8}
                      onClick={() =>
                        updatePassage({
                          choices: [
                            ...passage.choices,
                            { id: uid(), text: "", target: "" },
                          ],
                        })
                      }
                    >
                      <Plus size={16} /> Add a choice
                    </button>
                  </div>
                ) : (
                  <div className="ending-editor">
                    <Flag size={22} />
                    <h3>A place to end the journey.</h3>
                    <p>
                      Readers will see an ending and an invitation to begin
                      again.
                    </p>
                  </div>
                )}
              </section>
              <aside className="preview-panel">
                <div className="panel-heading">
                  <span>
                    <span className="live-dot" /> LIVE PREVIEW
                  </span>
                  <button
                    className="text-button"
                    onClick={() => {
                      setPreviewStart(active.startId);
                      setPreviewKey((k) => k + 1);
                    }}
                  >
                    From opening <ArrowUpRight size={13} />
                  </button>
                </div>
                <Player
                  key={`${active.id}-${previewKey}`}
                  story={active}
                  startId={previewStart}
                  compact
                />
              </aside>
            </div>
          </main>
        )}
        {view === "play" && active && (
          <main className="play-page">
            <div className="play-heading">
              <button className="text-button" onClick={() => setView("home")}>
                <ArrowLeft size={16} /> My stories
              </button>
              <span>{active.title}</span>
              <button
                className="button subtle"
                onClick={() =>
                  active.id === "sample-last-light"
                    ? create(copyStory(active))
                    : edit(active)
                }
              >
                <PenLine size={15} />
                {active.id === "sample-last-light"
                  ? "Make it yours"
                  : "Edit story"}
              </button>
            </div>
            <Player key={`${active.id}-${previewKey}`} story={active} />
          </main>
        )}
      </div>
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal === "new" && (
        <Dialog title="Every story starts somewhere." onClose={closeModal}>
          <p className="modal-description">
            Give your world a name. You can change it any time.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create(newStory(newTitle.trim() || "Untitled story"));
            }}
          >
            <label className="field-label">
              Story title
              <input
                autoFocus
                placeholder="The rain at midnight…"
                value={newTitle}
                maxLength={200}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </label>
            <button className="button primary full" type="submit">
              <Plus size={17} /> Create story
            </button>
          </form>
          <div className="modal-or">or start with a little help</div>
          <button className="button full" onClick={openAI}>
            <Sparkles size={16} /> Draft with AI
          </button>
          <button
            className="text-button full"
            onClick={() => create(copyStory(sampleStory()))}
          >
            Use The Last Light as a starting point <ArrowRight size={15} />
          </button>
        </Dialog>
      )}
      {modal === "ai" && (
        <Dialog
          title="A little spark for your story."
          onClose={closeModal}
          wide
        >
          <p className="modal-description">
            Describe a world. Get a short branching draft to make your own.
          </p>
          {!aiReady ? (
            <div className="ai-unavailable">
              <Sparkles size={28} />
              <h3>The co-writer is not connected yet.</h3>
              <p>
                Your workspace is ready for manual writing. AI drafting becomes
                available when the studio owner connects a provider.
              </p>
              <button
                className="button primary"
                onClick={() => create(copyStory(sampleStory()))}
              >
                Start with the sample <ArrowRight size={16} />
              </button>
            </div>
          ) : generated ? (
            <div className="generation-review">
              <span className="tag">DRAFT READY · REVIEW BEFORE SAVING</span>
              <h3>{generated.title}</h3>
              <p>{generated.description}</p>
              <div className="review-stats">
                {generated.passages.length} passages ·{" "}
                {generated.passages.filter((p) => p.ending).length} endings
              </div>
              <details>
                <summary>Read the opening</summary>
                <p className="narrative">
                  {
                    generated.passages.find((p) => p.id === generated.startId)
                      ?.text
                  }
                </p>
              </details>
              <div className="dialog-actions">
                <button className="button" onClick={() => setGenerated(null)}>
                  Discard draft
                </button>
                <button
                  className="button primary"
                  onClick={() => create(copyStory(generated))}
                >
                  Keep & edit <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void generate();
              }}
            >
              <label className="field-label">
                Your story idea
                <textarea
                  autoFocus
                  required
                  minLength={15}
                  maxLength={1500}
                  value={premise}
                  placeholder="A traveler arrives at an inn where every guest remembers a different version of yesterday…"
                  onChange={(e) => setPremise(e.target.value)}
                  disabled={generating}
                />
              </label>
              <div className="form-row">
                <label className="field-label">
                  Mood
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    disabled={generating}
                  >
                    {[
                      "Mysterious",
                      "Hopeful",
                      "Adventurous",
                      "Whimsical",
                      "Suspenseful",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Workshop access code
                  <input
                    type="password"
                    required
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    disabled={generating}
                    autoComplete="off"
                  />
                </label>
              </div>
              <p className="quiet">
                Creates a new story with 8–12 passages. Your existing work stays
                intact.
              </p>
              {aiError && (
                <p className="form-error" role="alert">
                  {aiError}
                </p>
              )}
              <button
                className="button primary full"
                disabled={generating}
                type="submit"
              >
                {generating ? (
                  <>
                    <LoaderCircle className="spin" size={17} /> Writing your
                    first draft…
                  </>
                ) : (
                  <>
                    <Sparkles size={17} /> Generate a draft
                  </>
                )}
              </button>
            </form>
          )}
        </Dialog>
      )}
      {modal === "checks" && active && (
        <Dialog
          title="A quick check before the adventure."
          onClose={closeModal}
        >
          <p className="modal-description">
            We check paths and missing content. The storytelling is yours.
          </p>
          {!issues.length ? (
            <div className="check-success">
              <CheckCircle2 size={36} />
              <h3>All paths look good.</h3>
              <p>Your story is ready to export.</p>
            </div>
          ) : (
            <div className="issues-list">
              {issues.map((issue, i) => (
                <button
                  key={i}
                  className={`issue ${issue.level}`}
                  onClick={() => {
                    if (issue.passageId) {
                      selectPassage(issue.passageId);
                      setView("editor");
                      setModal(null);
                    }
                  }}
                >
                  <AlertCircle size={16} />
                  <span>
                    <small>
                      {issue.level === "error"
                        ? "NEEDS ATTENTION"
                        : "GOOD TO KNOW"}
                    </small>
                    {issue.message}
                  </span>
                  {issue.passageId && <ArrowUpRight size={14} />}
                </button>
              ))}
            </div>
          )}
          <button
            className="button primary full"
            disabled={errors.length > 0}
            onClick={exportHTML}
          >
            <Download size={16} /> Export playable story
          </button>
        </Dialog>
      )}
      {modal === "help" && (
        <Dialog title="Your story, one choice at a time." onClose={closeModal}>
          <div className="guide-step">
            <span>01</span>
            <div>
              <h3>Start with a passage</h3>
              <p>
                Write what your reader sees. Mark one passage as the opening.
              </p>
            </div>
          </div>
          <div className="guide-step">
            <span>02</span>
            <div>
              <h3>Give them a choice</h3>
              <p>
                Add options and connect them to passages. Different paths can
                meet again.
              </p>
            </div>
          </div>
          <div className="guide-step">
            <span>03</span>
            <div>
              <h3>Find your ending</h3>
              <p>
                Mark endings, play every path, then export your finished story.
              </p>
            </div>
          </div>
          <div className="help-note">
            <FileText size={20} />
            <p>
              Drafts live in this browser, not in the cloud. Download an
              editable backup before clearing browser data or switching devices.
              Playable HTML includes your images and works offline.
            </p>
          </div>
        </Dialog>
      )}
      {modal === "delete-story" && active && (
        <Dialog title="Delete this story?" onClose={closeModal}>
          <p className="modal-description">
            “{active.title}” will be removed from this browser. Download a
            backup first if you want to keep it.
          </p>
          <div className="dialog-actions">
            <button className="button" onClick={exportJSON}>
              Download backup
            </button>
            <button
              className="button danger-solid"
              onClick={() => void deleteStory()}
            >
              Delete story
            </button>
          </div>
        </Dialog>
      )}
      {modal === "delete-passage" && passage && (
        <Dialog title="Delete this passage?" onClose={closeModal}>
          <p className="modal-description">
            “{passage.title}” will be removed. Choices pointing here will need a
            new destination. If this is your opening, the first remaining
            passage becomes the opening.
          </p>
          <div className="dialog-actions">
            <button className="button" onClick={closeModal}>
              Keep passage
            </button>
            <button className="button danger-solid" onClick={deletePassage}>
              Delete passage
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
function ArrowDownIcon() {
  return <Download size={12} />;
}
