"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Dialog from "@/shared/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLibrary } from "@/modules/workspace/library-provider";
import {
  ArrowLeft,
  ArrowUpRight,
  Download,
  GitBranch,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  AlertCircle,
  Play,
  Copy,
  PenLine,
} from "lucide-react";
import {
  copyStory,
  storySchema,
  type Story,
} from "@/modules/story/model";
import { IMPORT_BYTE_LIMIT } from "@/modules/media/assets/model";
import { assignedAsset } from "@/modules/media/assets/operations";
import { useGameplayAudio } from "@/modules/media/audio/gameplay-provider";
import { sampleStory } from "@/modules/story/sample";
import { buildBackup, download, filename } from "@/modules/export/standalone";
import Player from "@/modules/player/player";
import { Lighthouse } from "@/shared/ui/lighthouse";

const StoryEditor = dynamic(() => import("@/modules/editor/story-editor"), { ssr: false, loading: () => <main className="route-message">Opening story editor…</main> });

type Modal = "delete-story" | null;
type View = "home" | "editor" | "play";
export default function Studio({ view, storyId }: { view: View; storyId?: string }) {
  const { ready, stories } = useLibrary();
  const story = storyId === "sample-last-light" && view === "play" ? sampleStory() : stories.find((s) => s.id === storyId);
  if (!ready) return <main className="route-message"><LoaderCircle className="spin" /> Opening your workspace…</main>;
  if (view !== "home" && !story) return <main className="route-message"><h1>Game not found in this browser.</h1><p>Import its JSON backup in My Games, or start a new game.</p><Link href="/library" className="button">My Games</Link></main>;
  if (view === "editor" && story) return <StoryEditor key={story.id} initialStory={story} />;
  return <StudioContent key={`${view}-${storyId || "library"}`} view={view} initialStory={story || null} />;
}
function StudioContent({ view, initialStory }: { view: View; initialStory: Story | null }) {
  const router = useRouter();
  const gameplayAudio = useGameplayAudio();
  const { stories, ready, storageError, persistStory, deleteSavedStory } = useLibrary();
  const [active, setActive] = useState<Story | null>(initialStory);
  const [modal, setModal] = useState<Modal>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  const persist = (story: Story) => {
    if (!persistStory(story)) return false;
    setActive(story);
    return true;
  };
  const edit = (story: Story) => router.push(`/builder/${encodeURIComponent(story.id)}`);
  const create = (story: Story) => {
    if (!persist(story)) return false;
    edit(story);
    setModal(null);
    return true;
  };
  const play = (story: Story) => {
    const opening = story.passages.find((passage) => passage.id === story.startId);
    gameplayAudio.start(story.id, assignedAsset(story, opening, "audio")?.data || "");
    router.push(`/play/${encodeURIComponent(story.id)}`);
  };
  const exportJSON = () => {
    if (active) {
      download(
        `${filename(active)}.dextro.json`,
        buildBackup(active),
        "application/json",
      );
      setNotice("Editable backup downloaded.");
    }
  };
  const importStory = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > IMPORT_BYTE_LIMIT)
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
  const deleteStory = async () => {
    if (!active) return;
    const id = active.id;
    try {
      await deleteSavedStory(id);
      setActive(null);
      router.push("/library");
      setModal(null);
      setNotice("Story deleted from this browser.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  const closeModal = () => setModal(null);
  const filtered = stories.filter((s) =>
    `${s.title} ${s.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="studio-content">
      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => void importStory(e.target.files?.[0])}
      />
      <div className="studio-main">
        {storageError && (
          <div className="storage-warning" role="alert">
            <AlertCircle size={17} />
            {storageError}
            {active && <button onClick={exportJSON}>Download backup</button>}
          </div>
        )}
        {view === "home" && (
          <main className="library-page product-page">
            <div className="page-heading"><div><span className="kicker">YOUR WORKSPACE</span><h1>My Games<span className="title-dot">.</span></h1><p>Keep writing. Explore a different ending. Make it yours.</p></div><Link href="/builder" className="button primary"><Plus size={17} /> New game</Link></div>
            <section className="library-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow muted">
                    SAVED IN THIS BROWSER
                  </div>
                  <h2>
                    Games <span>{stories.length}</span>
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
                      onClick={() => router.push("/builder")}
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
        {view === "play" && active && (
          <main className="play-page">
            <div className="play-heading">
              <button className="text-button" onClick={() => router.push("/library")}>
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
            <Player key={active.id} story={active} />
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
    </div>
  );
}
function ArrowDownIcon() {
  return <Download size={12} />;
}
