"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRoom } from "@/context/RoomContext";
import { PRESET_IMAGES, DIFFICULTY_PRESETS } from "@/lib/constants";
import { PuzzleConfig } from "@/types/puzzle";

const DIFFICULTY_NAMES = ["Easy", "Medium", "Hard", "Extreme", "Insane"];

function difficultyName(index: number) {
  return DIFFICULTY_NAMES[index] ?? DIFFICULTY_NAMES[DIFFICULTY_NAMES.length - 1];
}

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
      setError("Please enter your display name");
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
    <main className="pt-app relative flex min-h-dvh w-full flex-col overflow-y-auto bg-[#0F1C2E] text-[#F5EFE0] pb-10">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed -left-24 -top-32 h-[420px] w-[420px] rounded-full bg-[#FF6B4A]/10 blur-[110px]" />
      <div className="pointer-events-none fixed -bottom-24 -right-16 h-[380px] w-[380px] rounded-full bg-[#F4B942]/8 blur-[100px]" />

      {/* Floating brand link */}
      <Link
        href="/"
        className="group absolute left-5 top-5 z-20 flex items-center gap-1.5 sm:left-8 sm:top-6"
      >
        <span className="text-xl transition-transform group-hover:scale-110">🧩</span>
        <span className="font-display hidden text-sm font-semibold text-[#F5EFE0]/80 sm:inline">
          Piece Together
        </span>
      </Link>

      {/* Connection status pill */}
      <div className="absolute right-5 top-5 z-20 flex items-center gap-1.5 sm:right-8 sm:top-6">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: isConnected ? "#34D399" : "#FF6B4A" }}
        />
        <span className="jb-mono text-xs uppercase tracking-wider text-[#8A96AE]">
          {isConnected ? "Connected" : "Connecting…"}
        </span>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pt-20 sm:px-10 md:pt-14">
        <div className="w-full max-w-4xl">
          <div className="mb-6 text-center md:mb-8">
            <span className="jb-mono text-xs uppercase tracking-[0.28em] text-[#F4B942]">
              New Room
            </span>
            <h1 className="font-display mt-1.5 text-3xl font-bold leading-tight sm:text-4xl">
              Set up your <span className="italic text-[#FF6B4A]">puzzle</span>
            </h1>
          </div>

          {error && (
            <div className="mb-6 rounded-full border border-[#FF6B4A]/30 bg-[#FF6B4A]/10 px-4 py-2.5 text-center text-xs font-semibold text-[#FFB4A0]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.15fr_0.85fr] md:gap-10">
            {/* Left Column: Player Identity & Image Selector */}
            <div className="flex flex-col gap-6">
              <div>
                <label className="section-label">Your Name</label>
                <input
                  type="text"
                  placeholder="Your display name…"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="field-minimal"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="section-label">Choose Puzzle Image</label>
                <div className="grid grid-cols-3 gap-3">
                  {PRESET_IMAGES.map((img) => {
                    const active = selectedImage.id === img.id;
                    return (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImage(img)}
                        className="thumb"
                        data-active={active}
                        aria-label={img.title}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.thumbnail} alt={img.title} className="h-full w-full object-cover" />
                        {active && (
                          <span className="thumb-check">
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="#0F1C2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Settings & Big Create Button */}
            <div className="flex flex-col gap-6 justify-between">
              <div className="flex flex-col gap-6">
                <div>
                  <label className="section-label">Difficulty</label>
                  <div className="flex flex-wrap gap-2.5">
                    {DIFFICULTY_PRESETS.map((d, i) => (
                      <button
                        key={d.label}
                        onClick={() => setSelectedDifficulty(d)}
                        className="chip"
                        data-active={selectedDifficulty.label === d.label}
                      >
                        {difficultyName(i)} <span className="opacity-60">· {d.total} pcs</span>
                      </button>
                    ))}
                  </div>
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
              </div>

              {/* Large prominent create button */}
              <button
                onClick={handleCreate}
                disabled={isCreating || !isConnected}
                className="btn-piece btn-piece-primary w-full justify-center py-4 text-base font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "Creating Room…" : "Create & Start Room"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

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
          margin-bottom: 0.65rem;
        }

        .field-minimal {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1.5px solid rgba(245,239,224,0.16);
          padding: 0.6rem 0.1rem 0.7rem;
          font-size: 1.1rem;
          color: #F5EFE0;
          transition: border-color 0.2s ease;
        }
        .field-minimal::placeholder { color: #5C6A85; }
        .field-minimal:focus { outline: none; border-color: #FF6B4A; }

        .thumb {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          aspect-ratio: 1 / 1;
          border: 2px solid transparent;
          opacity: 0.65;
          transition: transform 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
        }
        .thumb:hover { opacity: 0.95; }
        .thumb[data-active="true"] {
          opacity: 1;
          border-color: #FF6B4A;
          box-shadow: 0 6px 18px -8px rgba(255,107,74,0.55);
        }

        .thumb-check {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #F4B942;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chip {
          border-radius: 999px;
          padding: 0.65rem 1.2rem;
          font-size: 0.95rem;
          font-weight: 500;
          background: transparent;
          border: 1px solid rgba(245,239,224,0.16);
          color: #A8ADC4;
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
          display: inline-flex;
          align-items: center;
        }
        .chip:hover { color: #F5EFE0; border-color: rgba(245,239,224,0.32); }
        .chip[data-active="true"] {
          background: rgba(255,107,74,0.14);
          border-color: #FF6B4A;
          color: #F5EFE0;
          font-weight: 600;
        }

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
          font-family: 'Fraunces', serif;
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