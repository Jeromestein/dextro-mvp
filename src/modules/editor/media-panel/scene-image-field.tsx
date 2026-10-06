"use client";
import { useRef } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";

export default function SceneImageField({ image, characters, onUpload, onRemove }: {
  image: string;
  characters: number;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return <>
    <div className="inspector-image">
      <button onClick={() => input.current?.click()}><ImagePlus size={14} />{image ? "Replace scene image" : "Add scene image"}</button>
      <span>{characters.toLocaleString()} characters</span>
      <input type="file" hidden ref={input} accept="image/png,image/jpeg,image/webp" onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (file) void onUpload(file);
      }} />
    </div>
    {image && <div className="inspector-attachment">
      <Image unoptimized src={image} width={50} height={36} alt="Attached scene" />
      <span>Scene image attached</span>
      <button className="icon-button" aria-label="Remove scene image" onClick={onRemove}><X size={14} /></button>
    </div>}
  </>;
}
