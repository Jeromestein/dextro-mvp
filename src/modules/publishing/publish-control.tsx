"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Copy, ExternalLink, Globe, LoaderCircle, LockKeyhole } from "lucide-react";
import Dialog from "@/shared/ui/dialog";
import { validateStory, type Story } from "@/modules/story/model";
import { useLibrary } from "@/modules/workspace/library-provider";
import { requestJSON } from "@/storage/cloud-repository";
import { publicPath, publicationLabel, storyContentHash, type PublicationInput, type PublicationStatus } from "./model";
import "./styles.css";

type Pending = { action: "publish" | "unpublish"; input: PublicationInput };
export default function PublishControl({ story, onIssue }: { story: Story; onIssue: (id?: string) => void }) {
  const { cloud, scope, flushStory, refreshLibrary, storageError } = useLibrary();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PublicationStatus | null>(null);
  const [contentHash, setContentHash] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const pending = useRef<Pending | null>(null);
  const endpoint = `/api/stories/${encodeURIComponent(story.id)}/publication`;
  const recoveryKey = `dextro-publication:${scope}:${story.id}`;
  const loadStatus = useCallback(async () => {
    const next: PublicationStatus = await requestJSON(endpoint);
    setStatus(next);
    return next;
  }, [endpoint]);
  useEffect(() => {
    let cancelled = false;
    if (cloud) void requestJSON(endpoint).then((next: PublicationStatus) => { if (!cancelled) setStatus(next); }).catch(error => { if (!cancelled) setError(error.message); });
    try {
      const saved = sessionStorage.getItem(recoveryKey);
      if (saved) {
        const value = JSON.parse(saved) as Pending;
        if (["publish", "unpublish"].includes(value.action) && typeof value.input?.mutationId === "string") {
          pending.current = value;
          queueMicrotask(() => { if (!cancelled) setUncertain(true); });
        }
      }
    } catch { /* An unreadable recovery entry never causes an automatic mutation. */ }
    return () => { cancelled = true; };
  }, [cloud, endpoint, recoveryKey]);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => { void storyContentHash(story).then(value => { if (!cancelled) setContentHash(value); }).catch(() => { if (!cancelled) setContentHash(""); }); }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [story]);
  const publication = status?.publication;
  const live = !!publication?.releaseId;
  const changed = live && (!contentHash || publication?.contentHash !== contentHash);
  const label = publicationLabel(publication ? { ...publication, changed } : null);
  const issues = validateStory(story);
  const errors = issues.filter(i => i.level === "error");
  const opening = story.passages.find(p => p.id === story.startId);
  const cover = story.assets.find(a => a.id === opening?.media.imageId && a.kind === "image");
  const sharePath = publication ? publicPath(publication.publicId) : "";
  const link = sharePath && typeof window !== "undefined" ? new URL(sharePath, window.location.origin).href : "";
  const forgetPending = () => { pending.current = null; sessionStorage.removeItem(recoveryKey); setUncertain(false); };
  const submit = async (action: Pending["action"]) => {
    if (busy) return;
    setError(""); setNotice(""); setConfirmWithdraw(false);
    try {
      let operation = pending.current;
      if (!operation) {
        setBusy(action === "publish" ? "Saving changes…" : "Unpublishing…");
        const sourceRevision = action === "publish" ? await flushStory(story) : 0;
        operation = { action, input: { sourceRevision, expectedPublicationRevision: publication?.revision || 0, mutationId: crypto.randomUUID() } };
        sessionStorage.setItem(recoveryKey, JSON.stringify(operation));
        pending.current = operation;
      }
      setBusy(operation.action === "publish" ? "Checking & publishing…" : "Unpublishing…");
      await requestJSON(endpoint, { method: operation.action === "publish" ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(operation.input) });
      forgetPending();
      const current = await loadStatus();
      setNotice(current.publication?.releaseId ? "Your public story is ready to share." : "This story is no longer public. Your draft is kept.");
      await refreshLibrary();
    } catch (error) {
      const code = (error as { status?: number }).status;
      if (code && code >= 400 && code < 500) { forgetPending(); void loadStatus().catch(() => {}); }
      else if (pending.current) setUncertain(true);
      setError((error as Error).message);
    } finally { setBusy(""); }
  };
  return <>
    <button className="button primary" disabled={!!busy} onClick={() => { setOpen(true); if (cloud) void loadStatus().catch(error => setError(error.message)); }}><Globe size={15} /> {live ? changed ? "Publish updates" : "Public" : "Publish"}</button>
    {open && <Dialog title="Share your story" onClose={() => { setOpen(false); setConfirmWithdraw(false); }}>
      <div className="publication-preview">{cover && <Image unoptimized width={480} height={240} src={cover.data} alt="Opening scene" />}<div><span className={`publication-badge ${live ? "is-public" : ""}`}>{live ? <Globe size={12} /> : <LockKeyhole size={12} />}{cloud && !status ? "Checking status…" : label}</span><h3>{story.title || "Untitled story"}</h3>{story.description && <p>{story.description}</p>}</div></div>
      {!cloud ? <p className="publication-help">This draft is saved in this browser. To share a public link, enable cloud storage and use Copy local games in My Games. Your browser copy will be kept.</p> : <>
        <p className="publication-help">Anyone with the link can play. Your edits stay in the draft until you publish them.</p>
        {status?.available === false && <p className="form-error" role="alert">{status.error}</p>}
        {live && <div className="publication-share"><label>Public link<input readOnly value={link} onFocus={e => e.target.select()} /></label><div className="publication-actions"><button className="button" onClick={() => void navigator.clipboard.writeText(link).then(() => setNotice("Link copied.")).catch(() => setError("Select the link above to copy it."))}><Copy size={14} /> Copy link</button><a className="button" href={sharePath} target="_blank" rel="noopener noreferrer">Open public page <ExternalLink size={14} /></a></div><small>Published {publication?.publishedAt ? new Date(publication.publishedAt).toLocaleString() : ""}</small></div>}
        <div className="publication-checks"><strong>{errors.length ? `${errors.length} ${errors.length === 1 ? "problem needs" : "problems need"} attention` : "Ready for readers"}</strong>{!issues.length && <p><CheckCircle2 size={15} /> Story checks passed.</p>}{issues.length > 0 && <div className="issues-list">{issues.map((issue, index) => <button key={index} className={`issue ${issue.level}`} onClick={() => { setOpen(false); onIssue(issue.passageId); }}><span><small>{issue.level === "error" ? "NEEDS ATTENTION" : "GOOD TO KNOW"}</small>{issue.message}</span></button>)}</div>}</div>
        <Link className="publication-preview-link" href={`/play/${encodeURIComponent(story.id)}`} target="_blank">Preview the draft <ExternalLink size={13} /></Link>
        {uncertain && <p className="publication-help" role="status">The previous request needs confirmation. Retry safely to check its result before making another change.</p>}
        <div className="publication-actions"><button className="button primary" disabled={!!busy || !status?.available || (!uncertain && (errors.length > 0 || !!storageError || (live && !changed)))} onClick={() => void submit("publish")}>{busy ? <><LoaderCircle className="spin" size={15} /> {busy}</> : uncertain ? "Retry previous request" : live ? changed ? "Publish updates" : "Up to date" : publication ? "Publish again" : "Make public"}</button>{live && !uncertain && <button className="button subtle" disabled={!!busy} onClick={() => setConfirmWithdraw(true)}>Unpublish</button>}</div>
        {storageError && <p className="form-error">Resolve the saving error before publishing.</p>}
        {confirmWithdraw && <div className="publication-withdraw"><p>Stop new readers from opening this story? Your draft and saved versions stay. Already loaded or downloaded copies cannot be recalled.</p><div className="publication-actions"><button className="button" onClick={() => setConfirmWithdraw(false)}>Keep public</button><button className="button danger-solid" onClick={() => void submit("unpublish")}>Unpublish story</button></div></div>}
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="publication-notice" role="status">{notice}</p>}
    </Dialog>}
  </>;
}
