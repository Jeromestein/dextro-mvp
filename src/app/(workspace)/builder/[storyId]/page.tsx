import Studio from "@/components/studio";
export const metadata = { title: "Game Editor — Dextro" };
export default async function Page({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  return <Studio key={storyId} view="editor" storyId={storyId} />;
}
