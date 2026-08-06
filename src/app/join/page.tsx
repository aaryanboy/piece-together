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
    <main className="pt-app relative flex h-dvh w-full flex-col overflow-hidden bg-[#0F1C2E] text-[#F5EFE0]">
      {/* ambient glow — one accent, kept quiet */}
      <div className="pointer-events-none fixed -left-24 -top-32 h-[420px] w-[420px] rounded-full bg-[#FF6B4A]/10 blur-[110px]" />
      <div className="pointer-events-none fixed -bottom-24 -right-16 h-[380px] w-[380px] rounded-full bg-[#F4B942]/8 blur-[100px]" />

      {/* floating brand mark — not a header bar */}
      <Link
        href="/"
        className="group absolute left-5 top-5 z-20 flex items-center gap-1.5 sm:left-8 sm:top-6"
      >
        <span className="text-lg transition-transform group-hover:scale-110">🧩</span>
        <span className="font-display hidden text-sm font-semibold text-[#F5EFE0]/80 sm:inline">
          Piece Together
        </span>
      </Link>

      {/* floating connection pill — not a header bar */}
      <div className="absolute right-5 top-5 z-20 flex items-center gap-1.5 sm:right-8 sm:top-6">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: isConnected ? "#34D399" : "#FF6B4A" }}
        />
        <span className="jb-mono text-[11px] uppercase tracking-wider text-[#8A96AE]">
          {isConnected ? "Connected" : "Connecting…"}
        </span>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <span className="jb-mono text-[11px] uppercase tracking-[0.28em] text-[#F4B942]">
              Join Room
            </span>
            <h1 className="font-display mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
              Hop into a <span className="italic text-[#FF6B4A]">puzzle</span>
            </h1>
            <p className="mt-2 text-[15px] text-[#A8ADC4]">
              Enter the room code shared by your host
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-full border border-[#FF6B4A]/30 bg-[#FF6B4A]/10 px-4 py-2 text-center text-xs text-[#FFB4A0]">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-6">
            <div>
              <label className="section-label">Your Name</label>
              <input
                type="text"
                placeholder="Enter your display name…"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="field-minimal"
                maxLength={20}
              />
            </div>

            <div>
              <label className="section-label">Room Code</label>
              <input
                type="text"
                placeholder="HAPPY-PUZZLE-742"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="field-minimal jb-mono text-center tracking-[0.15em]"
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={isJoining || !isConnected}
              className="btn-piece btn-piece-primary mt-2 w-full justify-center py-3.5 text-[15px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isJoining ? "Joining room…" : "Join room"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-[#6C7A94]">
            Don&apos;t have a code?{" "}
            <Link href="/create" className="text-[#FF6B4A] underline decoration-[#FF6B4A]/40 underline-offset-4 hover:decoration-[#FF6B4A]">
              Create your own room
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .pt-app { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .font-display { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
        .jb-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

        .section-label {
          display: block;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #8A96AE;
          margin-bottom: 0.6rem;
        }

        .field-minimal {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1.5px solid rgba(245,239,224,0.16);
          padding: 0.5rem 0.1rem 0.7rem;
          font-size: 1.05rem;
          color: #F5EFE0;
          transition: border-color 0.2s ease;
        }
        .field-minimal::placeholder { color: #5C6A85; }
        .field-minimal:focus { outline: none; border-color: #FF6B4A; }

        .btn-piece {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.85rem 1.6rem 0.85rem 2rem;
          border-radius: 14px;
          font-weight: 600;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          white-space: nowrap;
        }
        .btn-piece::before {
          content: "";
          position: absolute;
          left: -7px;
          top: 50%;
          transform: translateY(-50%);
          width: 15px;
          height: 15px;
          border-radius: 50%;
        }
        .btn-piece-primary { background: #FF6B4A; color: #0F1C2E; }
        .btn-piece-primary::before { background: #FF6B4A; }
        .btn-piece-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px -10px rgba(255,107,74,0.65);
        }
      `}</style>
    </main>
  );
}

export default function JoinPage() {
  return <JoinRoomForm />;
}