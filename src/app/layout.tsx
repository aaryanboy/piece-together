import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "Piece Together | Multiplayer Puzzle Games",
    template: "%s | Piece Together",
  },
  description:
    "Play jigsaw puzzles, Sudoku, and Minesweeper online with friends. Create a room for a shared co-op game or race on separate boards.",
  applicationName: "Piece Together",
  keywords: [
    "multiplayer puzzle games",
    "online Sudoku with friends",
    "multiplayer Minesweeper",
    "jigsaw puzzle game",
    "co-op browser games",
    "free online puzzle games",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Piece Together",
    title: "Piece Together | Multiplayer Puzzle Games",
    description: "Solve Sudoku, hunt for mines, or build a jigsaw together — or race your friends.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Piece Together | Multiplayer Puzzle Games",
    description: "Solve Sudoku, hunt for mines, or build a jigsaw together — or race your friends.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

import { RoomProvider } from "@/context/RoomContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RoomProvider>
          {children}
        </RoomProvider>
      </body>
    </html>
  );
}
