import type { Metadata } from "next";
import "@/app/globals.css";
import "@/modules/workspace/styles.css";
import "@xyflow/react/dist/style.css";
import "@/modules/editor/styles.css";
import "@/modules/player/themes.css";
export const metadata: Metadata = {
  title: "Dextro — Every choice opens a world",
  description:
    "A small, thoughtful studio for writing, playing and sharing choice-based stories.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
