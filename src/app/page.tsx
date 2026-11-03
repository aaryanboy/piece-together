import Link from "next/link";
import { BrandMark } from "@/components/BrandLogo";

const games = [
  {
    name: "Jigsaw",
    number: "01",
    description: "Pass pieces around, spot the edges, and see the picture take shape.",
    kind: "jigsaw",
    note: "A little teamwork",
  },
  {
    name: "Sudoku",
    number: "02",
    description: "Trade deductions—or see who can fill the grid first.",
    kind: "sudoku",
    note: "A little brainpower",
  },
  {
    name: "Minesweeper",
    number: "03",
    description: "Compare clues, call your shots, and hope your hunch is right.",
    kind: "mines",
    note: "A little nerve",
  },
];

function GamePreview({ kind }: { kind: string }) {
  if (kind === "sudoku") {
    return (
      <div aria-hidden="true" className="game-art sudoku-art">
        {["4", "", "2", "", "1", "3", "", "4", "2", "", "3", "1", "1", "2", "", "3"].map(
          (digit, index) => (
            <span key={index}>{digit}</span>
          )
        )}
      </div>
    );
  }

  if (kind === "mines") {
    return (
      <div aria-hidden="true" className="game-art mines-art">
        {["1", "1", "", "1", "💣", "1", "", "1", "1"].map((cell, index) => (
          <span className={cell === "💣" ? "mine-cell" : ""} key={index}>
            {cell}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="game-art jigsaw-art">
      <span className="jigsaw-sky" />
      <span className="jigsaw-sun" />
      <span className="jigsaw-hill" />
      <span className="jigsaw-piece" />
      <span className="jigsaw-seam jigsaw-seam-vertical" />
      <span className="jigsaw-seam jigsaw-seam-horizontal" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link aria-label="Piece Together home" className="landing-brand" href="/">
          <BrandMark className="h-9 w-9" />
          <span>Piece Together</span>
        </Link>
        <nav aria-label="Main navigation" className="landing-nav">
          <a href="#games">The games</a>
          <Link className="nav-join" href="/join">
            Join a room <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>

      <section aria-labelledby="hero-title" className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-mark" />A place for puzzle people</p>
          <h1 id="hero-title">
            Good puzzles
            <br />
            are better <em>together.</em>
          </h1>
          <p className="hero-description">
            Pick a game, send your friends a room code, and figure it out as you go.
            No big plan required.
          </p>
          <div className="hero-actions">
            <Link className="action-primary" href="/create">
              Start a room <span aria-hidden="true">↗</span>
            </Link>
            <Link className="action-secondary" href="/solo">
              Or play on your own
            </Link>
          </div>
          <p className="hero-footnote">
            <span aria-hidden="true">01</span> Jigsaw, Sudoku &amp; Minesweeper
            <i aria-hidden="true">·</i> One room, your rules
          </p>
        </div>

        <div className="room-scene">
          <div className="room-card">
            <div className="room-card-top">
              <div>
                <span className="room-kicker">ROOM PREVIEW</span>
                <h2>Sunday puzzle club</h2>
              </div>
              <span className="room-code">4K7P</span>
            </div>
            <div className="puzzle-board" aria-label="Illustration of friends working on a jigsaw puzzle">
              <svg aria-hidden="true" viewBox="0 0 480 290" fill="none">
                <defs>
                  <clipPath id="board-shape">
                    <rect x="14" y="12" width="452" height="266" rx="14" />
                  </clipPath>
                </defs>
                <g clipPath="url(#board-shape)">
                  <rect x="14" y="12" width="452" height="266" fill="#E8B85A" />
                  <path d="M14 165L93 115L148 149L222 83L294 153L368 98L466 165V278H14V165Z" fill="#6F9B8B" />
                  <path d="M14 203L91 158L152 196L235 137L300 190L373 148L466 203V278H14V203Z" fill="#315B5A" />
                  <circle cx="358" cy="72" r="29" fill="#F5E9CE" />
                  <path d="M163 12H266V79C249 79 249 105 266 105V175H205C205 158 179 158 179 175H115V105C132 105 132 79 115 79V12H163Z" fill="#E86D4D" />
                  <path d="M14 108H80C80 91 106 91 106 108H163V173C146 173 146 199 163 199V278H14V108Z" fill="#F1D9A5" />
                  <path d="M266 105H332C332 122 358 122 358 105H466V278H266V199C283 199 283 173 266 173V105Z" fill="#D78359" />
                  <path d="M163 175H179C179 158 205 158 205 175H266V199C283 199 283 225 266 225V278H163V199C146 199 146 173 163 173V175Z" fill="#E2AC4C" />
                  <path d="M14 108H80C80 91 106 91 106 108H163M163 12V79C146 79 146 105 163 105H179M266 12V79C249 79 249 105 266 105H332C332 122 358 122 358 105H466M14 199H80C80 182 106 182 106 199H163M266 199C283 199 283 225 266 225V278M163 175H179C179 158 205 158 205 175H266M358 199H466" stroke="#F6E8C9" strokeWidth="4" />
                  <path d="M14 108V278M163 105V173M266 105V173M466 105V278" stroke="#F6E8C9" strokeWidth="4" />
                </g>
              </svg>
              <span className="cursor-tag cursor-maya"><i />Maya</span>
              <span className="cursor-tag cursor-you"><i />you</span>
            </div>
            <div className="room-card-bottom">
              <div className="player-stack" aria-hidden="true">
                <span>M</span><span>J</span><span>+</span>
              </div>
              <p><strong>Maya found an edge piece.</strong><br />Your turn to make it fit.</p>
              <span className="room-live"><i /> 3 here</span>
            </div>
          </div>
          <span aria-hidden="true" className="scene-doodle">↘</span>
          <p className="scene-caption">A shared board, wherever you are.</p>
        </div>
      </section>

      <section aria-labelledby="games-title" className="games-section" id="games">
        <div className="games-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-mark" />Choose your kind of fun</p>
            <h2 id="games-title">Three ways to spend an evening.</h2>
          </div>
          <p>Play together on one board, or turn it into a friendly race.</p>
        </div>

        <div className="game-list">
          {games.map((game) => (
            <article className={`game-row ${game.kind}-row`} key={game.name}>
              <span className="game-number">{game.number}</span>
              <GamePreview kind={game.kind} />
              <div className="game-copy">
                <h3>{game.name}</h3>
                <p>{game.description}</p>
              </div>
              <span className="game-note">{game.note}</span>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <p>Make a room. Send the code. See what happens.</p>
        <Link href="/create">Let&apos;s play <span aria-hidden="true">↗</span></Link>
      </footer>

      <style>{`
        .landing-page {
          --ink: #17283a;
          --muted: #65717a;
          --paper: #f3eddf;
          --paper-dark: #e8dfce;
          --coral: #e86d4d;
          --gold: #d7a840;
          min-height: 100dvh;
          overflow: hidden;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
        }

        .landing-header, .landing-hero, .games-section, .landing-footer {
          width: min(1120px, calc(100% - 64px));
          margin-inline: auto;
        }

        .landing-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 82px;
          border-bottom: 1px solid rgba(23, 40, 58, 0.16);
        }
        .landing-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--ink);
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.035em;
          text-decoration: none;
        }
        .landing-nav { display: flex; align-items: center; gap: 30px; font-size: 13px; }
        .landing-nav a { color: var(--ink); text-decoration: none; }
        .landing-nav a:first-child { color: var(--muted); }
        .landing-nav a:hover, .action-secondary:hover { color: var(--coral); }
        .landing-nav .nav-join { font-weight: 650; }
        .nav-join span { margin-left: 4px; color: var(--coral); }

        .landing-hero {
          display: grid;
          grid-template-columns: 0.95fr 1.05fr;
          align-items: center;
          gap: clamp(42px, 8vw, 100px);
          padding-block: 82px 92px;
        }
        .hero-copy { max-width: 490px; }
        .eyebrow {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 0;
          color: #825d26;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }
        .eyebrow-mark { width: 7px; height: 7px; background: var(--coral); transform: rotate(45deg); }
        .hero-copy h1, .games-heading h2 {
          font-family: Georgia, 'Times New Roman', serif;
          font-weight: 600;
          letter-spacing: -0.065em;
        }
        .hero-copy h1 {
          margin: 23px 0 19px;
          font-size: clamp(48px, 6vw, 75px);
          line-height: 0.99;
        }
        .hero-copy h1 em { color: var(--coral); font-weight: 500; }
        .hero-description {
          max-width: 400px;
          margin: 0;
          color: #56636d;
          font-size: 16px;
          line-height: 1.75;
        }
        .hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 21px; margin-top: 29px; }
        .action-primary {
          display: inline-flex;
          align-items: center;
          gap: 22px;
          padding: 14px 17px 14px 20px;
          background: var(--ink);
          color: #fffaf0;
          font-size: 13px;
          font-weight: 650;
          text-decoration: none;
          transition: background 160ms ease, transform 160ms ease;
        }
        .action-primary:hover { background: #294559; transform: translateY(-2px); }
        .action-primary span { color: #f0bf5b; font-size: 16px; }
        .action-secondary { color: var(--ink); font-size: 13px; font-weight: 600; text-decoration: underline; text-decoration-color: #b7ad9a; text-underline-offset: 4px; }
        .hero-footnote {
          margin: 38px 0 0;
          color: #7b817e;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 9px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .hero-footnote span { margin-right: 8px; color: var(--coral); }
        .hero-footnote i { padding-inline: 8px; color: var(--gold); font-style: normal; }

        .room-scene { position: relative; padding: 14px 10px 24px; }
        .room-card {
          position: relative;
          z-index: 1;
          padding: 21px 22px 15px;
          background: #172b3b;
          box-shadow: 12px 14px 0 #d9cdb6;
          transform: rotate(1deg);
        }
        .room-card-top, .room-card-bottom { display: flex; align-items: center; justify-content: space-between; }
        .room-card-top { padding-bottom: 16px; }
        .room-kicker {
          color: #e4b85c;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 9px;
          letter-spacing: 0.14em;
        }
        .room-card-top h2 { margin: 5px 0 0; color: #f4eddf; font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 500; letter-spacing: -0.02em; }
        .room-code { padding: 7px 9px; border: 1px solid #51616a; color: #f4eddf; font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 10px; letter-spacing: 0.12em; }
        .puzzle-board { position: relative; overflow: hidden; background: #e8b85a; }
        .puzzle-board svg { display: block; width: 100%; }
        .cursor-tag {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          color: white;
          font-size: 9px;
          font-weight: 650;
          box-shadow: 2px 3px 0 rgba(23, 40, 58, 0.2);
        }
        .cursor-tag i { width: 6px; height: 6px; border: 1px solid white; border-radius: 50%; }
        .cursor-maya { top: 45%; left: 18%; background: #315b5a; transform: rotate(-4deg); }
        .cursor-you { right: 12%; bottom: 17%; background: var(--coral); transform: rotate(3deg); }
        .room-card-bottom { justify-content: flex-start; gap: 12px; padding-top: 14px; color: #e9e3d6; }
        .player-stack { display: flex; padding-left: 3px; }
        .player-stack span { display: grid; width: 25px; height: 25px; margin-left: -3px; place-items: center; border: 2px solid #172b3b; border-radius: 50%; background: #d98b69; color: #172b3b; font-size: 9px; font-weight: 700; }
        .player-stack span:nth-child(2) { background: #e3bd68; }
        .player-stack span:nth-child(3) { background: #779d8e; }
        .room-card-bottom p { flex: 1; margin: 0; color: #abb4b5; font-size: 10px; line-height: 1.5; }
        .room-card-bottom strong { color: #f5eddf; font-weight: 600; }
        .room-live { color: #bdc5bd; font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 9px; white-space: nowrap; }
        .room-live i { display: inline-block; width: 6px; height: 6px; margin-right: 3px; border-radius: 50%; background: #82b798; }
        .scene-doodle { position: absolute; top: -30px; right: 0; color: var(--coral); font-family: Georgia, serif; font-size: 41px; transform: rotate(10deg); }
        .scene-caption { margin: 25px 0 0 7px; color: #747a76; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-style: italic; }

        .games-section { padding-block: 35px 67px; border-top: 1px solid rgba(23, 40, 58, 0.18); }
        .games-heading { display: flex; align-items: end; justify-content: space-between; gap: 25px; margin-bottom: 25px; }
        .games-heading h2 { margin: 10px 0 0; font-size: clamp(27px, 3.2vw, 38px); line-height: 1.1; }
        .games-heading > p { max-width: 270px; margin: 0 0 3px; color: var(--muted); font-size: 12px; line-height: 1.7; }
        .game-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid #d6cdbd; border-bottom: 1px solid #d6cdbd; }
        .game-row { display: grid; grid-template-columns: 20px 76px 1fr; grid-template-rows: 76px auto; align-items: center; column-gap: 13px; padding: 18px 20px 17px 0; }
        .game-row + .game-row { padding-left: 20px; border-left: 1px solid #d6cdbd; }
        .game-number { align-self: start; padding-top: 4px; color: #8d887d; font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 9px; }
        .game-art { position: relative; display: grid; width: 76px; height: 76px; overflow: hidden; place-items: center; }
        .jigsaw-art { background: #dcae59; }
        .jigsaw-sky { position: absolute; inset: 0 0 38% 0; background: #e88b64; }
        .jigsaw-sun { position: absolute; top: 10px; right: 11px; width: 17px; height: 17px; border-radius: 50%; background: #f4e3b8; }
        .jigsaw-hill { position: absolute; right: -5px; bottom: -7px; left: -5px; height: 43px; border-radius: 50% 50% 0 0; background: #547a69; transform: rotate(-9deg); }
        .jigsaw-piece { position: absolute; z-index: 1; top: 28px; left: 24px; width: 29px; height: 30px; border: 2px solid #f3eddf; background: #e1b34d; }
        .jigsaw-piece::after { position: absolute; top: 7px; right: -7px; width: 11px; height: 11px; border-radius: 50%; background: #e1b34d; border-right: 2px solid #f3eddf; content: ""; }
        .jigsaw-seam { position: absolute; z-index: 2; background: #f3eddf; }
        .jigsaw-seam-vertical { top: 0; bottom: 0; left: 38px; width: 2px; }
        .jigsaw-seam-horizontal { top: 38px; right: 0; left: 0; height: 2px; }
        .sudoku-art { grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); border: 2px solid #315b5a; background: #f8f2e7; color: #315b5a; font-family: Georgia, serif; font-size: 13px; }
        .sudoku-art span { display: grid; width: 100%; height: 100%; place-items: center; border-right: 1px solid #aeb9a8; border-bottom: 1px solid #aeb9a8; }
        .sudoku-art span:nth-child(4n) { border-right: 0; }
        .sudoku-art span:nth-child(n+13) { border-bottom: 0; }
        .sudoku-art span:nth-child(6), .sudoku-art span:nth-child(11) { background: #e5d7b6; }
        .mines-art { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 2px; padding: 5px; background: #d9d3c4; color: #466d79; font-family: var(--font-geist-mono), monospace; font-size: 10px; font-weight: 700; }
        .mines-art span { display: grid; width: 100%; height: 100%; place-items: center; background: #f4eddf; }
        .mines-art .mine-cell { background: #e47757; color: #17283a; font-size: 13px; }
        .game-copy { align-self: center; }
        .game-copy h3 { margin: 0 0 5px; font-family: Georgia, 'Times New Roman', serif; font-size: 19px; font-weight: 600; letter-spacing: -0.03em; }
        .game-copy p { margin: 0; color: #65717a; font-size: 11px; line-height: 1.6; }
        .game-note { grid-column: 2 / -1; margin-top: 12px; color: #916c32; font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 9px; letter-spacing: 0.04em; text-transform: uppercase; }
        .landing-footer { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-block: 0 34px; }
        .landing-footer p { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-style: italic; }
        .landing-footer a { color: var(--ink); font-size: 12px; font-weight: 700; text-decoration: none; }
        .landing-footer a span { padding-left: 5px; color: var(--coral); }

        @media (max-width: 760px) {
          .landing-header, .landing-hero, .games-section, .landing-footer { width: min(100% - 40px, 560px); }
          .landing-header { min-height: 70px; }
          .landing-brand { font-size: 17px; }
          .landing-nav { gap: 16px; font-size: 12px; }
          .landing-hero { grid-template-columns: 1fr; gap: 47px; padding-block: 58px 63px; }
          .hero-copy { max-width: 560px; }
          .hero-copy h1 { font-size: clamp(49px, 11vw, 70px); }
          .room-scene { width: min(100%, 520px); margin-inline: auto; }
          .games-section { padding-top: 30px; }
          .games-heading { align-items: start; flex-direction: column; gap: 10px; }
          .games-heading > p { max-width: 380px; }
          .game-list { grid-template-columns: 1fr; }
          .game-row { grid-template-columns: 24px 76px minmax(0, 1fr) auto; grid-template-rows: 76px; column-gap: 12px; padding: 14px 0; }
          .game-row + .game-row { padding-left: 0; border-top: 1px solid #d6cdbd; border-left: 0; }
          .game-number { align-self: center; padding-top: 0; }
          .game-note { grid-column: 4; grid-row: 1; max-width: 85px; margin: 0; text-align: right; line-height: 1.5; }
          .game-copy h3 { font-size: 18px; }
          .game-copy p { max-width: 280px; }
        }
        @media (max-width: 480px) {
          .landing-header, .landing-hero, .games-section, .landing-footer { width: calc(100% - 32px); }
          .landing-brand { gap: 7px; font-size: 15px; }
          .landing-brand svg { width: 31px; height: 31px; }
          .landing-nav { gap: 12px; font-size: 11px; }
          .landing-nav a:first-child { display: none; }
          .landing-hero { gap: 38px; padding-top: 46px; }
          .hero-copy h1 { font-size: clamp(45px, 12vw, 58px); }
          .hero-description { font-size: 14px; }
          .hero-footnote { margin-top: 27px; font-size: 8px; }
          .room-scene { padding-inline: 4px; }
          .room-card { padding: 15px 13px 12px; box-shadow: 7px 9px 0 #d9cdb6; }
          .room-card-top h2 { font-size: 17px; }
          .room-card-bottom { gap: 8px; }
          .room-card-bottom p { font-size: 9px; }
          .room-live { font-size: 8px; }
          .game-row { grid-template-columns: 18px 62px minmax(0, 1fr); grid-template-rows: 64px auto; column-gap: 10px; }
          .game-art { width: 62px; height: 62px; }
          .game-note { grid-column: 3; grid-row: 2; margin-top: 5px; max-width: unset; text-align: left; }
          .jigsaw-seam-vertical { left: 31px; }
          .jigsaw-seam-horizontal { top: 31px; }
          .jigsaw-piece { top: 23px; left: 20px; width: 24px; height: 24px; }
          .jigsaw-piece::after { top: 5px; right: -7px; }
          .landing-footer { align-items: start; flex-direction: column; padding-top: 5px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .action-primary { transition: none; }
          .action-primary:hover { transform: none; }
        }
      `}</style>
    </main>
  );
}
