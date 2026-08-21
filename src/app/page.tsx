import Link from "next/link";

/**
 * Deterministic mosaic layout (no Math.random — keeps SSR/CSR markup identical).
 * 4x3 grid, one slot left empty for the "hero" piece that drops in last.
 */
const GRID_COLS = 4;
const GRID_ROWS = 3;
const HERO_SLOT = { row: 1, col: 2 };

const NAVY = ["#182B45", "#1E3654", "#14233A", "#213F60", "#233C5E"];
const CORAL = "#FF6B4A";

type Tile = {
  row: number;
  col: number;
  color: string;
  delay: number;
  fx: number;
  fy: number;
  fr: number;
};

const tiles: Tile[] = [];
{
  let i = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (row === HERO_SLOT.row && col === HERO_SLOT.col) continue;
      const isCoral = (row === 0 && col === 3) || (row === 2 && col === 0);
      tiles.push({
        row,
        col,
        color: isCoral ? CORAL : NAVY[i % NAVY.length],
        delay: i * 65,
        fx: (col % 2 === 0 ? -1 : 1) * (36 + i * 5),
        fy: (row % 2 === 0 ? -1 : 1) * (26 + i * 4),
        fr: (i % 2 === 0 ? -1 : 1) * (16 + i * 3),
      });
      i++;
    }
  }
}

export default function LandingPage() {
  return (
    <main className="pt-app relative flex h-dvh w-full items-center overflow-hidden bg-[#0F1C2E] text-[#F5EFE0]">
      {/* ambient glow — one accent, kept quiet */}
      <div className="pointer-events-none absolute -left-24 -top-32 h-105 w-105 rounded-full bg-[#FF6B4A]/10 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-95 w-95 rounded-full bg-[#F4B942]/10 blur-[100px]" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 px-6 sm:px-8 md:grid-cols-[1.15fr_0.85fr] md:gap-12 md:px-12">
        {/* Left — content */}
        <div className="flex flex-col gap-4 sm:gap-5">
          <span className="jb-mono text-[10px] uppercase tracking-[0.28em] text-[#F4B942] sm:text-[11px]">
            Real-time · Multiplayer · Puzzles
          </span>

          <h1 className="headline font-display">
            Piece it
            <br />
            <span className="italic text-[#FF6B4A]">together.</span>
          </h1>

          <p className="max-w-md text-[15px] leading-relaxed text-[#A8ADC4] sm:text-lg">
            Open a room, drop in an image, and watch it come together as friends
            drag pieces in real time — cursors, chat, and all.
          </p>

          <div className="mt-1 flex flex-col gap-3 xs:flex-row sm:flex-row">
            <Link href="/create" className="btn-piece btn-piece-primary">
              Create a room
            </Link>
            <Link href="/join" className="btn-piece btn-piece-ghost">
              Join a room
            </Link>
            <Link href="/solo" className="btn-piece btn-piece-solo">
              🎮 Play Solo
            </Link>
          </div>

          <div className="jb-mono mt-1 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[10.5px] uppercase tracking-wider text-[#6C7A94]">
            <span className="flex items-center gap-1.5">
              <i className="dot" style={{ background: "#FF6B4A" }} />
              Pick an image
            </span>
            <span className="flex items-center gap-1.5">
              <i className="dot" style={{ background: "#F4B942" }} />
              Share the code
            </span>
            <span className="flex items-center gap-1.5">
              <i className="dot" style={{ background: "#8FA7C7" }} />
              Snap pieces in
            </span>
          </div>

          {/* compact mobile stand-in for the mosaic */}
          <div className="mt-1 flex gap-1.5 md:hidden">
            {["#FF6B4A", "#F4B942", "#213A5C", "#1B2E4A", "#182B45", "#233C5E"].map(
              (c, idx) => (
                <span
                  key={idx}
                  className="h-2 w-7 rounded-full opacity-70"
                  style={{ backgroundColor: c }}
                />
              )
            )}
          </div>
        </div>

        {/* Right — signature puzzle mosaic (desktop/tablet only) */}
        <div className="relative hidden aspect-4/3 w-full md:block">
          <div className="hero-mosaic">
            {tiles.map((t) => (
              <div
                key={`${t.row}-${t.col}`}
                className="mosaic-tile"
                style={
                  {
                    gridRow: t.row + 1,
                    gridColumn: t.col + 1,
                    backgroundColor: t.color,
                    animationDelay: `${t.delay}ms`,
                    "--fx": `${t.fx}px`,
                    "--fy": `${t.fy}px`,
                    "--fr": `${t.fr}deg`,
                  } as React.CSSProperties
                }
              >
                {t.col < GRID_COLS - 1 && (
                  <span className="knob knob-right" style={{ background: t.color }} />
                )}
                {t.row < GRID_ROWS - 1 && (
                  <span className="knob knob-bottom" style={{ background: t.color }} />
                )}
              </div>
            ))}
            <div
              className="mosaic-tile mosaic-hero"
              style={{ gridRow: HERO_SLOT.row + 1, gridColumn: HERO_SLOT.col + 1 }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .pt-app { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .font-display { font-family: 'Fraunces', serif; font-optical-sizing: auto; font-weight: 650; }
        .jb-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

        .headline {
          font-size: clamp(2.35rem, 8.2vw, 4.75rem);
          line-height: 0.96;
          letter-spacing: -0.01em;
        }

        .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

        .btn-piece {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.85rem 1.6rem 0.85rem 2rem;
          border-radius: 14px;
          font-weight: 600;
          font-size: 0.95rem;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
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
        .btn-piece-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -10px rgba(255,107,74,0.65); }

        .btn-piece-ghost {
          background: transparent;
          color: #F5EFE0;
          border: 1.5px solid rgba(245,239,224,0.22);
        }
        .btn-piece-ghost::before {
          background: #0F1C2E;
          border: 1.5px solid rgba(245,239,224,0.22);
        }
        .btn-piece-ghost:hover { border-color: rgba(245,239,224,0.45); transform: translateY(-2px); }

        .btn-piece-solo {
          background: #F4B942;
          color: #0F1C2E;
        }
        .btn-piece-solo::before { background: #F4B942; }
        .btn-piece-solo:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -10px rgba(244,185,66,0.65); }

        .hero-mosaic {
          display: grid;
          grid-template-columns: repeat(${GRID_COLS}, 1fr);
          grid-template-rows: repeat(${GRID_ROWS}, 1fr);
          gap: 9px;
          width: 100%;
          height: 100%;
        }

        .mosaic-tile {
          position: relative;
          border-radius: 16px;
          animation: settle 0.75s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        .knob {
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 50%;
        }
        .knob-right { right: -8px; top: 50%; transform: translateY(-50%); }
        .knob-bottom { bottom: -8px; left: 50%; transform: translateX(-50%); }

        .mosaic-hero {
          border: 2px dashed rgba(244,185,66,0.45);
          background: transparent;
          animation:
            dash-pulse 1.8s ease-in-out infinite,
            drop-in 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) 1.55s both;
        }

        @keyframes settle {
          from { opacity: 0; transform: translate(var(--fx), var(--fy)) rotate(var(--fr)); }
          to { opacity: 1; transform: translate(0, 0) rotate(0deg); }
        }

        @keyframes dash-pulse {
          0%, 100% { border-color: rgba(244,185,66,0.25); }
          50% { border-color: rgba(244,185,66,0.6); }
        }

        @keyframes drop-in {
          0% { opacity: 0; transform: translateY(-130px) scale(0.5) rotate(-28deg); background-color: transparent; border-color: rgba(244,185,66,0.6); }
          55% { opacity: 1; transform: translateY(6px) scale(1.06) rotate(3deg); background-color: #F4B942; border-color: #F4B942; }
          78% { transform: translateY(-3px) scale(0.97); }
          100% { transform: translateY(0) scale(1) rotate(0deg); background-color: #F4B942; border-color: #F4B942; box-shadow: 0 0 30px 8px rgba(244,185,66,0.35); }
        }

        @media (prefers-reduced-motion: reduce) {
          .mosaic-tile { animation: none !important; opacity: 1; transform: none; }
          .mosaic-hero {
            background: #F4B942;
            border-color: #F4B942;
            box-shadow: 0 0 30px 8px rgba(244,185,66,0.35);
          }
          .btn-piece:hover { transform: none; }
        }
      `}</style>
    </main>
  );
}