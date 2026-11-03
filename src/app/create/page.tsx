"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRoom } from "@/context/RoomContext";
import PageHeader from "@/components/PageHeader";

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
    <main className="paper-page flex w-full flex-col">
      <PageHeader actionHref="/join" actionLabel="Join a room" connected={isConnected} status={isConnected ? "Connected" : "Connecting…"} />
      <div className="paper-content paper-content-wide">
        <div className="w-full">
          <div className="setup-heading">
            <span className="setup-kicker">New room</span>
            <h1 className="setup-title">
              Set up your <em>room</em>
            </h1>
            <p className="setup-description">
              Set your name here, then choose a game, image, and mode in the room lobby.
            </p>
          </div>

          {error && (
            <div className="setup-error mb-6 px-4 py-3 text-center text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="paper-form-card mx-auto grid w-full max-w-2xl grid-cols-1 items-end gap-6 sm:grid-cols-[1fr_auto]">
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
                <span className="jb-mono ml-2 text-xs uppercase tracking-wider text-[#65717a]">
                  players
                </span>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={isCreating || !isConnected}
              className="btn-piece btn-piece-primary w-full justify-center py-4 text-base font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
            >
              {isCreating ? "Creating Room…" : "Create Room"}
            </button>
          </div>
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