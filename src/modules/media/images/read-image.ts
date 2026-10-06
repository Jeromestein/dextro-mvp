import { imageSchema } from "./schema";

export async function readSceneImage(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 2_000_000)
    throw new Error("Choose a PNG, JPEG or WebP image under 2 MB.");
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
  return imageSchema.parse(data);
}
