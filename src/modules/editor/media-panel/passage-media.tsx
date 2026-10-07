"use client";
import { useId, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ImagePlus, Music2, Sparkles, Upload, FolderOpen } from "lucide-react";
import SelectField from "@/shared/ui/select-field";
import type { Passage, Story } from "@/modules/story/model";
import type { MediaKind, MediaAsset } from "@/modules/media/assets/model";
import ImageGeneration from "@/modules/media/generation/image-generation";
import { useLibrary } from "@/modules/workspace/library-provider";
import SavedMedia from "@/modules/storage/saved-media";
import CatalogPicker from "@/modules/media/catalog/catalog-picker";
import { assignedAsset, usedAssets, storyByteSize } from "@/modules/media/assets/operations";
import SoundControls from "@/modules/media/audio/sound-controls";

type Props = {
  story: Story; passage: Passage; busy: boolean;
  onUpload: (file: File, kind: MediaKind) => void;
  onAssign: (kind: MediaKind, id: string) => void;
  onCredit: (id: string, credit: string) => void;
  onPrune: () => void;
  onApply: (asset: MediaAsset) => boolean;
  batchControls?: ReactNode;
};
export default function PassageMedia({ story, passage, busy, onUpload, onAssign, onCredit, onPrune, onApply, batchControls }: Props) {
  const { cloud } = useLibrary();
  const [sources, setSources] = useState<Record<MediaKind, Source>>({ image: "create", audio: "create" });
  const imageInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const optionsId = useId();
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
      <SelectField label={kind === "image" ? "Image from this story" : "Track from this story"} value={asset?.id || ""} onChange={value => onAssign(kind, value)}
        options={[{ value: "", label: kind === "image" ? "No image" : "Silence" }, ...story.assets.filter(a => a.kind === kind).map(a => ({ value: a.id, label: a.name }))]} />
      {asset && <>
        {kind === "audio" && <SoundControls data={asset.data} title={asset.name} audition />}
        <details className="media-shared"><summary>File details · Used in {shared.length} {shared.length === 1 ? "passage" : "passages"}</summary><p>{shared.map((p) => p.title || "Untitled passage").join(" · ")}</p><p>Choosing a different file changes this passage only.</p>
          <label className="editor-field media-credit">Credit for this file<input aria-label={kind === "image" ? "Image credit" : "Music credit"} maxLength={1000} value={asset.credit} placeholder="Creator, source and license" onChange={(e) => onCredit(asset.id, e.target.value)} /></label>
        </details>
      </>}
      <MediaSources id={`${optionsId}-${kind}`} kind={kind} cloud={cloud} value={sources[kind]} onChange={source => setSources(previous => ({ ...previous, [kind]: source }))} />
      <div id={`${optionsId}-${kind}-create-panel`} role="tabpanel" aria-labelledby={`${optionsId}-${kind}-create-tab`} hidden={sources[kind] !== "create"} className="media-source-panel">
        {kind === "image" ? <ImageGeneration story={story} passage={passage} onApply={onApply} /> : sources[kind] === "create" && <CatalogPicker story={story} passageId={passage.id} assignedId={audio?.id} onApply={onApply} />}
      </div>
      <div id={`${optionsId}-${kind}-upload-panel`} role="tabpanel" aria-labelledby={`${optionsId}-${kind}-upload-tab`} hidden={sources[kind] !== "upload"} className="media-source-panel">
        <div className="media-upload"><Upload size={22} aria-hidden="true" /><strong>{kind === "image" ? "Bring your scene to life." : "Set your own soundtrack."}</strong>
          <p>{kind === "image" ? "PNG, JPEG or WebP · up to 2 MB" : "MP3, M4A, OGG, WAV or WebM · up to 6 MB"}</p>
          <button className="button" disabled={busy} onClick={() => (kind === "image" ? imageInput : audioInput).current?.click()}>{busy ? "Reading file…" : kind === "image" ? "Choose image" : "Choose music"}</button>
        </div>
      </div>
      {cloud && <div id={`${optionsId}-${kind}-saved-panel`} role="tabpanel" aria-labelledby={`${optionsId}-${kind}-saved-tab`} hidden={sources[kind] !== "saved"} className="media-source-panel">
        {sources[kind] === "saved" && <SavedMedia kind={kind} onApply={onApply} />}
      </div>}
    </section>;
  };
  return <div className="passage-media">
    <header><span className="kicker">PASSAGE MEDIA</span><h2>{passage.title || "Untitled passage"}</h2><p>Set the scene. Carry its mood into the next choice.</p></header>
    {(["image", "audio"] as const).map((kind) => <input key={kind} ref={kind === "image" ? imageInput : audioInput} type="file" hidden accept={kind === "image" ? "image/png,image/jpeg,image/webp" : "audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/x-wav,audio/webm,.mp3,.m4a,.ogg,.wav,.webm"} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) onUpload(file, kind); }} />)}
    {batchControls}
    {field("image")}{field("audio")}
    <footer className="media-library-summary"><span>{story.assets.length} {story.assets.length === 1 ? "file" : "files"} · {(storyByteSize(story) / 1_000_000).toFixed(1)} / 24 MB</span>{unused > 0 && <button onClick={onPrune}>Remove {unused} unused {unused === 1 ? "file" : "files"}</button>}<p>Use files you can include in your game. Credits travel with the export.</p></footer>
  </div>;
}

type Source = "create" | "upload" | "saved";
function MediaSources({ id, kind, cloud, value, onChange }: { id: string; kind: MediaKind; cloud: boolean; value: Source; onChange: (value: Source) => void }) {
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const items: Array<{ value: Source; label: string; icon: ReactNode }> = [
    { value: "create", label: kind === "image" ? "AI image" : "Free library", icon: kind === "image" ? <Sparkles size={14} /> : <Music2 size={14} /> },
    { value: "upload", label: "Upload", icon: <Upload size={14} /> },
    ...(cloud ? [{ value: "saved" as const, label: "Saved", icon: <FolderOpen size={14} /> }] : []),
  ];
  return <div role="tablist" aria-label={kind === "image" ? "Image source" : "Music source"} className="media-source-tabs">
    {items.map((item, index) => <button key={item.value} ref={element => { tabs.current[index] = element; }} type="button" role="tab"
      id={`${id}-${item.value}-tab`} aria-controls={`${id}-${item.value}-panel`} aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1}
      onClick={() => onChange(item.value)} onKeyDown={event => {
        if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
        onChange(items[next].value); tabs.current[next]?.focus();
      }}>{item.icon}<span>{item.label}</span></button>)}
  </div>;
}
