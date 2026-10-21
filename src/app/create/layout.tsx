import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a Game Room",
  description: "Create a private room, pick a multiplayer puzzle, and invite your friends with a simple room code.",
};

export default function CreateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
