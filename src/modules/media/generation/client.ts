import { assetSchema, type MediaAsset } from "../assets/model";
import type { ImageRequest } from "./plan";
import { requestGeneration } from "./job-client";

export async function requestSceneImage(input: Omit<ImageRequest, "requestId">, signal: AbortSignal, scope = "local"): Promise<MediaAsset> {
  const data = await requestGeneration("/api/media/image", input, signal, scope);
  signal.throwIfAborted();
  const asset = assetSchema.parse(data.asset);
  if (asset.kind !== "image" || asset.source !== "generated") throw new Error("The image service returned an unexpected file.");
  return asset;
}
