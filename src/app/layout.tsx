import type { Metadata } from "next";
import "./globals.css";
import "./workspace.css";
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
