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

export const metadata: Metadata = {
  title: "Piece Together — Multiplayer Jigsaw Puzzles",
  description:
    "Assemble beautiful jigsaw puzzles in real-time with friends. Create a room, share the code, and piece it together!",
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
