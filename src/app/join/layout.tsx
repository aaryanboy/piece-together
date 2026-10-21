import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join a Game Room",
  description: "Join friends for a live multiplayer jigsaw, Sudoku, or Minesweeper game.",
};

export default function JoinLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
