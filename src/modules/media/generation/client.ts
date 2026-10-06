import { assetSchema, type MediaAsset } from "../assets/model";
import type { ImageRequest } from "./plan";

export async function requestSceneImage(input: Omit<ImageRequest, "requestId">, accessCode: string, signal: AbortSignal): Promise<MediaAsset> {
  const response = await fetch("/api/media/image", {
    method: "POST", signal: AbortSignal.any([signal, AbortSignal.timeout(165_000)]),
    headers: { "Content-Type": "application/json", "X-Workshop-Code": accessCode },
    body: JSON.stringify({ ...input, requestId: crypto.randomUUID() }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not generate this scene.");
  signal.throwIfAborted();
  const asset = assetSchema.parse(data.asset);
  if (asset.kind !== "image" || asset.source !== "generated") throw new Error("The image service returned an unexpected file.");
  return asset;
}
