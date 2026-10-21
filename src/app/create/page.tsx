"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRoom } from "@/context/RoomContext";
import BrandLogo from "@/components/BrandLogo";

function CreateRoomForm() {
  const router = useRouter();
  const { createRoom, isConnected } = useRoom();

  const [playerName, setPlayerName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!playerName.trim()) {
      setError("Please enter your display name");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const roomCode = await createRoom(playerName.trim(), playerName.trim().charAt(0).toUpperCase(), maxPlayers);
      router.push(`/room/${roomCode}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create room");
      setIsCreating(false);
    }
  }

  return (
    <main className="pt-app relative flex min-h-dvh h-auto w-full flex-col overflow-y-auto bg-[#0F1C2E] text-[#F5EFE0] pb-32">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed -left-24 -top-32 h-105 w-105 rounded-full bg-[#FF6B4A]/10 blur-[110px]" />
      <div className="pointer-events-none fixed -bottom-24 -right-16 h-95 w-95 rounded-full bg-[#F4B942]/8 blur-[100px]" />

      {/* Floating brand link */}
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

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pt-24 sm:px-10 md:pt-16">
        <div className="w-full max-w-4xl">
          <div className="mb-6 text-center md:mb-8">
            <span className="jb-mono text-xs uppercase tracking-[0.28em] text-[#F4B942]">
              New Room
            </span>
            <h1 className="font-display mt-1.5 text-3xl font-bold leading-tight sm:text-4xl">
              Set up your <span className="italic text-[#FF6B4A]">room</span>
            </h1>
            <p className="mt-2 text-sm text-[#A8ADC4]">
              Set your name here, then choose a game, image, and mode in the room lobby.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-[#FF6B4A]/40 bg-[#FF6B4A]/15 px-4 py-3 text-center text-xs font-bold text-[#FFB4A0] shadow-sm">
              {error}
            </div>
          )}

          <div className="mx-auto grid w-full max-w-2xl grid-cols-1 items-end gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="player-name" className="section-label">Your Name</label>
              <input
                id="player-name"
                type="text"
                placeholder="Your display name…"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="field-minimal"
                maxLength={20}
              />
            </div>

            <div>
              <label className="section-label">Max Players</label>
              <div className="stepper">
                <button
                  type="button"
                  onClick={() => setMaxPlayers((n) => Math.max(2, n - 1))}
                  disabled={maxPlayers <= 2}
                  className="stepper-btn"
                  aria-label="Decrease max players"
                >
                  –
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={maxPlayers}
                  min={2}
                  max={12}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setMaxPlayers(2);
                      return;
                    }
                    const n = parseInt(raw, 10);
                    if (!Number.isNaN(n)) setMaxPlayers(n);
                  }}
                  onBlur={() => setMaxPlayers((n) => Math.min(12, Math.max(2, n || 2)))}
                  className="stepper-input"
                  aria-label="Max players"
                />
                <button
                  type="button"
                  onClick={() => setMaxPlayers((n) => Math.min(12, n + 1))}
                  disabled={maxPlayers >= 12}
                  className="stepper-btn"
                  aria-label="Increase max players"
                >
                  +
                </button>
                <span className="jb-mono ml-2 text-xs uppercase tracking-wider text-[#8A96AE]">
                  players
                </span>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={isCreating || !isConnected}
              className="btn-piece btn-piece-primary w-full justify-center py-4 text-base font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
            >
              {isCreating ? "Creating Room…" : "Create Room"}
            </button>
          </div>
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
          margin-bottom: 0.65rem;
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

        .stepper {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
        }

        .stepper-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid rgba(245,239,224,0.18);
          background: transparent;
          color: #F5EFE0;
          font-size: 1.2rem;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
        }
        .stepper-btn:hover:not(:disabled) {
          border-color: #FF6B4A;
          background: rgba(255,107,74,0.12);
        }
        .stepper-btn:active:not(:disabled) { transform: scale(0.92); }
        .stepper-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .stepper-input {
          width: 3.5rem;
          background: transparent;
          border: none;
          border-bottom: 1.5px solid rgba(245,239,224,0.16);
          text-align: center;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 1.4rem;
          font-weight: 600;
          color: #F5EFE0;
          padding: 0.1rem 0;
          transition: border-color 0.2s ease;
          -moz-appearance: textfield;
        }
        .stepper-input:focus { outline: none; border-color: #FF6B4A; }
        .stepper-input::-webkit-outer-spin-button,
        .stepper-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .btn-piece {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.8rem;
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

export default function CreatePage() {
  return <CreateRoomForm />;
}