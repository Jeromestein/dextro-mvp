import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicManifest } from "@/server/publishing/service";
import { ServiceError } from "@/server/errors";
import { mediaPath } from "@/modules/publishing/model";
import PublicReader from "@/modules/publishing/public-reader";

export const dynamic = "force-dynamic";
const read = cache(async (id: string) => {
  try { return await publicManifest(id); }
  catch (error) { if (error instanceof ServiceError && error.status === 404) return null; throw error; }
});
type Props = { params: Promise<{ publicId: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const manifest = await read((await params).publicId);
  if (!manifest) return { title: "Story unavailable — Dextro", description: "This story is not currently public." };
  const { title, description, passages, startId } = manifest.content;
  const image = passages.find(p => p.id === startId)?.media.imageId;
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  const images = image && base ? [new URL(mediaPath(manifest, image), base).href] : [];
  return { title: `${title} — Dextro`, description, robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", images }, twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images } };
}
export default async function PublicStoryPage({ params }: Props) {
  const manifest = await read((await params).publicId);
  if (!manifest) notFound();
  const story = manifest.content, image = story.passages.find(p => p.id === story.startId)?.media.imageId;
  return <PublicReader landing={{ publicId: manifest.publicId, title: story.title, description: story.description, genre: story.genre,
    cover: image ? mediaPath(manifest, image) : null, passages: story.passages.length, endings: story.passages.filter(p => p.ending).length }} />;
}
