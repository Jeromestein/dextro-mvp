import Studio from "@/modules/workspace/studio";
export const metadata = { title: "Play — Dextro" };
export default async function Page({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  return <Studio key={storyId} view="play" storyId={storyId} />;
}
