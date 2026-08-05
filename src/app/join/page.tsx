"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RoomProvider, useRoom } from "@/context/RoomContext";

function JoinRoomForm() {
  const router = useRouter();
  const { joinRoom, isConnected } = useRoom();

  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      await joinRoom(roomCode.trim().toUpperCase(), playerName.trim(), "🧩");
      router.push(`/room/${roomCode.trim().toUpperCase()}`);
    } catch (e: any) {
      setError(e.message || "Failed to join room");
      setIsJoining(false);
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

      <section className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">
              Join a <span className="text-gradient">Puzzle Room</span>
            </h1>
            <p className="text-slate-400 mt-2">
              Enter the room code shared by your host
            </p>
          </div>

          {error && (
            <div className="glass-card rounded-xl p-4 border-red-500/30 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <div className="glass-panel rounded-2xl p-8 space-y-6">
            {/* Player Name */}
            <div className="space-y-2">
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

            {/* Room Code */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Room Code
              </label>
              <input
                type="text"
                placeholder="e.g. HAPPY-PUZZLE-742"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono text-center text-lg tracking-wider"
              />
            </div>

            {/* Join Button */}
            <button
              onClick={handleJoin}
              disabled={isJoining || !isConnected}
              className="w-full py-4 rounded-2xl font-semibold text-white bg-gradient-glow shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isJoining ? "Joining..." : "🔗 Join Room"}
            </button>
          </div>

          <p className="text-center text-sm text-slate-500">
            Don&apos;t have a code?{" "}
            <Link href="/create" className="text-indigo-400 hover:text-indigo-300 underline">
              Create your own room
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function JoinPage() {
  return (
    <RoomProvider>
      <JoinRoomForm />
    </RoomProvider>
  );
}
