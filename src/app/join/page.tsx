"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRoom } from "@/context/RoomContext";
import BrandLogo from "@/components/BrandLogo";

function JoinRoomForm() {
  const router = useRouter();
  const { joinRoom, isConnected } = useRoom();

  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!playerName.trim()) {
      setError("Please enter your display name");
      return;
    }
    if (!roomCode.trim()) {
      setError("Please enter the 4-digit room code");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      await joinRoom(roomCode.trim().toUpperCase(), playerName.trim(), playerName.trim().charAt(0).toUpperCase());
      router.push(`/room/${roomCode.trim().toUpperCase()}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to join room");
      setIsJoining(false);
    }
  }

  return (
    <main className="pt-app relative flex min-h-dvh h-auto w-full flex-col overflow-y-auto bg-[#0F1C2E] text-[#F5EFE0] pb-28">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed -left-24 -top-32 h-105 w-105 rounded-full bg-[#FF6B4A]/10 blur-[110px]" />
      <div className="pointer-events-none fixed -bottom-24 -right-16 h-95 w-95 rounded-full bg-[#F4B942]/8 blur-[100px]" />

      {/* Top brand logo */}
      <BrandLogo
        className="group absolute left-5 top-5 z-20 flex items-center gap-2 sm:left-8 sm:top-6"
        markClassName="h-7 w-7 transition-transform group-hover:scale-110"
      />

      {/* Connection status pill */}
      <div className="absolute right-5 top-5 z-20 flex items-center gap-2 sm:right-8 sm:top-6">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full shadow-sm"
          style={{ background: isConnected ? "#34D399" : "#FF6B4A" }}
        />
        <span className="jb-mono text-xs uppercase tracking-wider text-[#8A96AE]">
          {isConnected ? "Connected" : "Connecting…"}
        </span>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pt-24 sm:px-6 md:pt-16">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <span className="jb-mono text-xs uppercase tracking-[0.28em] text-[#F4B942]">
              Join Room
            </span>
            <h1 className="font-display mt-2 text-3xl font-bold leading-tight sm:text-4xl">
              Hop into a <span className="italic text-[#FF6B4A]">puzzle</span>
            </h1>
            <p className="mt-2 text-sm text-[#A8ADC4]">
              Enter the 4-digit code shared by your host
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-[#FF6B4A]/40 bg-[#FF6B4A]/15 px-4 py-3 text-center text-xs font-bold text-[#FFB4A0] shadow-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-5">
            <div>
              <label htmlFor="player-name" className="section-label">Your Name</label>
              <input
                id="player-name"
                type="text"
                placeholder="Enter display name…"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="field-minimal"
                maxLength={20}
              />
            </div>

            <div>
              <label htmlFor="room-code" className="section-label">4-Digit Room Code</label>
              <input
                id="room-code"
                type="text"
                placeholder="1234"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="field-minimal jb-mono text-center text-3xl font-bold tracking-[0.3em] text-[#F4B942]"
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={isJoining || !isConnected}
              className="btn-piece btn-piece-primary mt-3 w-full justify-center py-4 text-base font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isJoining ? "Joining room…" : "Enter Room"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-[#6C7A94]">
            Don&apos;t have a code?{" "}
            <Link href="/create" className="font-semibold text-[#FF6B4A] underline decoration-[#FF6B4A]/40 underline-offset-4 hover:decoration-[#FF6B4A]">
              Create your own room
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        .pt-app { font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif; }
        .font-display { font-family: Georgia, 'Times New Roman', serif; font-optical-sizing: auto; }
        .jb-mono { font-family: var(--font-geist-mono), ui-monospace, monospace; }

        .section-label {
          display: block;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #8A96AE;
          margin-bottom: 0.6rem;
        }

        .field-minimal {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(245,239,224,0.16);
          border-radius: 14px;
          padding: 0.8rem 1rem;
          font-size: 1.1rem;
          color: #F5EFE0;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .field-minimal::placeholder { color: #5C6A85; }
        .field-minimal:focus { outline: none; border-color: #FF6B4A; background: rgba(255,255,255,0.06); }

        .btn-piece {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.6rem;
          border-radius: 16px;
          font-weight: 700;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          white-space: nowrap;
        }
        .btn-piece-primary { background: #FF6B4A; color: #0F1C2E; }
        .btn-piece-primary:hover:not(:disabled) {
          box-shadow: 0 12px 28px -10px rgba(255,107,74,0.65);
        }
      `}</style>
    </main>
  );
}

export default function JoinPage() {
  return <JoinRoomForm />;
}