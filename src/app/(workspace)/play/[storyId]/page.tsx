import { redirect } from "next/navigation";
import Studio from "@/modules/workspace/studio";
export const metadata = { title: "Play — Dextro" };
export default async function Page({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  if (storyId === "sample-last-light") redirect("/library");
  return <Studio key={storyId} view="play" storyId={storyId} />;
}
