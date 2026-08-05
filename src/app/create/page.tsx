"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RoomProvider, useRoom } from "@/context/RoomContext";
import { PRESET_IMAGES, DIFFICULTY_PRESETS } from "@/lib/constants";
import { PuzzleConfig } from "@/types/puzzle";

function CreateRoomForm() {
  const router = useRouter();
  const { createRoom, updateConfig, isConnected } = useRoom();

  const [playerName, setPlayerName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [selectedImage, setSelectedImage] = useState(PRESET_IMAGES[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTY_PRESETS[1]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const roomCode = await createRoom(playerName.trim(), "🧩", maxPlayers);

      const config: PuzzleConfig = {
        rows: selectedDifficulty.rows,
        cols: selectedDifficulty.cols,
        totalPieces: selectedDifficulty.total,
        imageUrl: selectedImage.url,
        imageTitle: selectedImage.title,
        imageWidth: 1200,
        imageHeight: 800,
        boardWidth: 800,
        boardHeight: 560,
      };

      updateConfig(config, roomCode);
      router.push(`/room/${roomCode}`);
    } catch (e: any) {
      setError(e.message || "Failed to create room");
      setIsCreating(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      {/* Ambient Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/10 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-3xl group-hover:scale-110 transition-transform">🧩</span>
          <span className="text-xl font-bold text-gradient">Piece Together</span>
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isConnected ? "bg-emerald-400" : "bg-red-400"
            }`}
          />
          <span className="text-xs text-slate-500">
            {isConnected ? "Connected" : "Connecting..."}
          </span>
        </div>
      </nav>

      <section className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-3xl space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">
              Create a <span className="text-gradient">Puzzle Room</span>
            </h1>
            <p className="text-slate-400 mt-2">
              Pick an image, set the difficulty, and invite friends
            </p>
          </div>

          {error && (
            <div className="glass-card rounded-xl p-4 border-red-500/30 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {/* Player Name */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              Your Name
            </label>
            <input
              type="text"
              placeholder="Enter your display name..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              maxLength={20}
            />
          </div>

          {/* Image Selection */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              Choose an Image
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRESET_IMAGES.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className={`relative rounded-xl overflow-hidden aspect-[4/3] border-2 transition-all duration-200 hover:scale-[1.03] ${
                    selectedImage.id === img.id
                      ? "border-indigo-500 shadow-lg shadow-indigo-500/20"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img.thumbnail}
                    alt={img.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                    <span className="text-xs font-medium text-white">{img.title}</span>
                  </div>
                  {selectedImage.id === img.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              Difficulty
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {DIFFICULTY_PRESETS.map((d) => (
                <button
                  key={d.label}
                  onClick={() => setSelectedDifficulty(d)}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition-all border ${
                    selectedDifficulty.label === d.label
                      ? "bg-indigo-600/30 border-indigo-500 text-white"
                      : "bg-slate-800/50 border-white/5 text-slate-400 hover:text-white hover:border-white/15"
                  }`}
                >
                  <div className="font-semibold">{d.total} pcs</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {d.rows}×{d.cols}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Max Players */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              Max Players
            </label>
            <div className="flex gap-3">
              {[2, 4, 6, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxPlayers(n)}
                  className={`flex-1 rounded-xl py-3 text-sm font-medium transition-all border ${
                    maxPlayers === n
                      ? "bg-indigo-600/30 border-indigo-500 text-white"
                      : "bg-slate-800/50 border-white/5 text-slate-400 hover:text-white hover:border-white/15"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={isCreating || !isConnected}
            className="w-full py-4 rounded-2xl font-semibold text-white bg-gradient-glow shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isCreating ? "Creating Room..." : "🚀 Create Room"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default function CreatePage() {
  return (
    <RoomProvider>
      <CreateRoomForm />
    </RoomProvider>
  );
}
