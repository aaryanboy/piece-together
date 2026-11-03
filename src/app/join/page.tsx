"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRoom } from "@/context/RoomContext";
import PageHeader from "@/components/PageHeader";

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
    <main className="paper-page flex w-full flex-col">
      <PageHeader actionHref="/create" actionLabel="Create a room" connected={isConnected} status={isConnected ? "Connected" : "Connecting…"} />
      <div className="paper-content">
        <div className="w-full">
          <div className="setup-heading">
            <span className="setup-kicker">Join a room</span>
            <h1 className="setup-title">
              Come solve a <em>puzzle.</em>
            </h1>
            <p className="setup-description">
              Enter the 4-digit code shared by your host
            </p>
          </div>

          {error && (
            <div className="setup-error mb-5 px-4 py-3 text-center text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="paper-form-card flex flex-col gap-5">
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
                className="field-minimal jb-mono text-center text-3xl font-bold tracking-[0.3em]"
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={isJoining || !isConnected}
              className="btn-piece btn-piece-primary mt-3 w-full justify-center py-4 text-base font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isJoining ? "Joining room…" : "Enter Room"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-[#65717a]">
            Don&apos;t have a code?{" "}
            <Link href="/create" className="setup-link">
              Create your own room
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        .pt-app { font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif; }
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