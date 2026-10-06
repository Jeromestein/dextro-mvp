"use client";
import { useRef } from "react";
import Image from "next/image";
import { ImagePlus, Music2, Upload } from "lucide-react";
import type { Passage, Story } from "@/modules/story/model";
import type { MediaKind } from "@/modules/media/assets/model";
import { assignedAsset, usedAssets, storyByteSize } from "@/modules/media/assets/operations";
import SoundControls from "@/modules/media/audio/sound-controls";

type Props = {
  story: Story; passage: Passage; busy: boolean;
  onUpload: (file: File, kind: MediaKind) => void;
  onAssign: (kind: MediaKind, id: string) => void;
  onCredit: (id: string, credit: string) => void;
  onPrune: () => void;
};
export default function PassageMedia({ story, passage, busy, onUpload, onAssign, onCredit, onPrune }: Props) {
  const imageInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const image = assignedAsset(story, passage, "image");
  const audio = assignedAsset(story, passage, "audio");
  const unused = story.assets.length - usedAssets(story).length;
  const field = (kind: MediaKind) => {
    const asset = kind === "image" ? image : audio;
    const key = kind === "image" ? "imageId" : "audioId";
    const shared = asset ? story.passages.filter((p) => p.media[key] === asset.id) : [];
    return <section className="media-section" aria-label={kind === "image" ? "Scene image" : "Background music"}>
      <div className="media-section-heading">{kind === "image" ? <ImagePlus size={16} /> : <Music2 size={16} />}<h3>{kind === "image" ? "Scene image" : "Background music"}</h3></div>
      {kind === "image" && <div className={`media-scene ${image ? "" : "empty"}`}>{image ? <Image unoptimized src={image.data} width={640} height={360} alt={`Scene for ${passage.title}`} /> : <><ImagePlus size={25} /><span>Give this scene a setting.</span></>}</div>}
      <label className="editor-field">{kind === "image" ? "Image from this story" : "Track from this story"}<select aria-label={kind === "image" ? "Scene image assignment" : "Music assignment"} value={asset?.id || ""} onChange={(e) => onAssign(kind, e.target.value)}>
        <option value="">{kind === "image" ? "No image" : "Silence"}</option>{story.assets.filter((a) => a.kind === kind).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select></label>
      <button className="button media-upload" disabled={busy} onClick={() => (kind === "image" ? imageInput : audioInput).current?.click()}><Upload size={14} />{busy ? "Reading file…" : kind === "image" ? "Upload image" : "Upload music"}</button>
      <small className="media-file-hint">{kind === "image" ? "PNG, JPEG or WebP · up to 2 MB" : "MP3, M4A, OGG, WAV or WebM · up to 6 MB"}</small>
      {asset && <>
        <details className="media-shared"><summary>Used in {shared.length} {shared.length === 1 ? "passage" : "passages"}</summary><p>{shared.map((p) => p.title || "Untitled passage").join(" · ")}</p><p>Choosing a different file changes this passage only.</p></details>
        {kind === "audio" && <SoundControls data={asset.data} title={asset.name} audition />}
        <label className="editor-field media-credit">Credit for this file<input aria-label={kind === "image" ? "Image credit" : "Music credit"} maxLength={1000} value={asset.credit} placeholder="Creator, source and license" onChange={(e) => onCredit(asset.id, e.target.value)} /></label>
      </>}
    </section>;
  };
  return <div className="passage-media">
    <header><span className="kicker">PASSAGE MEDIA</span><h2>{passage.title || "Untitled passage"}</h2><p>Set the scene. Carry its mood into the next choice.</p></header>
    {(["image", "audio"] as const).map((kind) => <input key={kind} ref={kind === "image" ? imageInput : audioInput} type="file" hidden accept={kind === "image" ? "image/png,image/jpeg,image/webp" : "audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/x-wav,audio/webm,.mp3,.m4a,.ogg,.wav,.webm"} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) onUpload(file, kind); }} />)}
    {field("image")}{field("audio")}
    <footer className="media-library-summary"><span>{story.assets.length} {story.assets.length === 1 ? "file" : "files"} · {(storyByteSize(story) / 1_000_000).toFixed(1)} / 24 MB</span>{unused > 0 && <button onClick={onPrune}>Remove {unused} unused {unused === 1 ? "file" : "files"}</button>}<p>Use files you can include in your game. Credits travel with the export.</p></footer>
  </div>;
}
