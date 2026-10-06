import { assetSchema, AUDIO_BYTE_LIMIT, IMAGE_BYTE_LIMIT, type MediaAsset, type MediaKind } from "./model";

export async function readMediaFile(file: File, kind: MediaKind): Promise<MediaAsset> {
  const type = file.type.replace("audio/x-wav", "audio/wav").replace("audio/wave", "audio/wav").replace("audio/x-m4a", "audio/mp4");
  const valid = kind === "image" ? /^image\/(png|jpeg|webp)$/.test(type) : /^audio\/(mpeg|mp4|ogg|wav|webm)$/.test(type);
  const limit = kind === "image" ? IMAGE_BYTE_LIMIT : AUDIO_BYTE_LIMIT;
  if (!valid || file.size > limit || !file.size)
    throw new Error(kind === "image" ? "Choose a PNG, JPEG or WebP image under 2 MB." : "Choose MP3, M4A, OGG, WAV or WebM audio under 6 MB.");
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]+;/, `data:${type};`));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
  return assetSchema.parse({ id: crypto.randomUUID(), kind, name: file.name.slice(0, 200), data, source: "upload", credit: "" });
}
