import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Play Puzzles Solo",
  description: "Play a relaxing jigsaw puzzle on your own, at your own pace.",
};

export default function SoloLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
