"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRoom } from "@/context/RoomContext";
import { usePuzzleState } from "@/hooks/usePuzzleState";
import { drawPiecePath } from "@/lib/puzzleGenerator";
import { PuzzlePieceData } from "@/types/puzzle";

/* ──────────────────────────────────────────────────────────
 * THEME PALETTES
 * ────────────────────────────────────────────────────────── */
const DARK = {
  pageBg: "#0F1C2E",
  boardBg: "#16263D",
  boardBorder: "#1E3A5F",
  panel: "#16263D",
  coral: "#FF6B4A",
  gold: "#F4B942",
  paper: "#F5EFE0",
  ink: "#F5EFE0",
  muted: "#8A96AE",
  mint: "#34D399",
  pieceBorder: "rgba(245,239,224,0.35)",
  pieceActive: "#FF6B4A",
  piecePlaced: "#34D399",
  grid: "rgba(244,185,66,0.07)",
  boardOutline: "rgba(244,185,66,0.22)",
  matDots: "rgba(245,239,224,0.03)",
  hudBg: "rgba(22,38,61,0.78)",
  hudBorder: "rgba(245,239,224,0.1)",
  shadow: "rgba(0,0,0,0.28)",
};

const LIGHT = {
  pageBg: "#E8E0D4",
  boardBg: "#D4C9B8",
  boardBorder: "#B8A88C",
  panel: "#1A2332",
  coral: "#FF6B4A",
  gold: "#F4B942",
  paper: "#F5EFE0",
  ink: "#2A2A2A",
  muted: "#6B6B6B",
  mint: "#34D399",
  pieceBorder: "rgba(40,30,20,0.35)",
  pieceActive: "#FF6B4A",
  piecePlaced: "#34D399",
  grid: "rgba(0,0,0,0.08)",
  boardOutline: "rgba(0,0,0,0.18)",
  matDots: "rgba(0,0,0,0.04)",
  hudBg: "rgba(255,255,255,0.82)",
  hudBorder: "rgba(0,0,0,0.08)",
  shadow: "rgba(0,0,0,0.12)",
};

/* ──────────────────────────────────────────────────────────
 * LOBBY VIEW — Dark theme (matches join page)
 * ────────────────────────────────────────────────────────── */
function LobbyView({ roomCode }: { roomCode: string }) {
  const { room, player, startGame, isConnected, leaveRoom, sendChatMessage } = useRoom();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState("");

  function copyCode() {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleLeave() {
    leaveRoom();
    router.push("/");
  }

  function handleSendChat() {
    if (chatInput.trim()) {
      sendChatMessage(chatInput.trim());
      setChatInput("");
    }
  }

  if (!room) return null;

  const players = Object.values(room.players);
  const isHost = player?.isHost;
  const emptySlots = Math.max(0, room.maxPlayers - players.length);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10 sm:py-14" style={{ background: DARK.pageBg, color: DARK.ink }}>
      <div className="w-full max-w-2xl space-y-5">
        <div className="fade-up text-center" style={{ animationDelay: "0ms" }}>
          <p className="section-label !mb-3 justify-center" style={{ color: DARK.muted }}>Room code</p>
          <button onClick={copyCode} className="code-chip group">
            <span className="jb-mono text-2xl font-bold tracking-[0.2em] sm:text-3xl" style={{ color: DARK.paper }}>
              {roomCode}
            </span>
            <span className={"copy-flag " + (copied ? "copy-flag-active" : "")}>
              {copied ? "Copied" : "Copy"}
            </span>
          </button>
          <p className="mt-2.5 text-xs" style={{ color: DARK.muted }}>Share this code with friends to join</p>
        </div>

        {room.config && (
          <div className="fade-up flex items-center gap-4" style={{ animationDelay: "70ms" }}>
            <img
              src={room.config.imageUrl}
              alt={room.config.imageTitle}
              className="h-16 w-24 flex-shrink-0 rounded-xl border object-cover"
              style={{ borderColor: "rgba(245,239,224,0.1)" }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: DARK.paper }}>{room.config.imageTitle}</p>
              <p className="jb-mono mt-0.5 text-[11px] uppercase tracking-wide" style={{ color: DARK.muted }}>
                {room.config.totalPieces} pcs &middot; {room.config.rows}&times;{room.config.cols} &middot; up to {room.maxPlayers} players
              </p>
            </div>
          </div>
        )}

        <div className="fade-up" style={{ animationDelay: "140ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <label className="section-label !mb-0" style={{ color: DARK.muted }}>
              Players ({players.length}/{room.maxPlayers})
            </label>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: isConnected ? DARK.mint : DARK.coral }} />
              <span className="jb-mono text-[10px] uppercase tracking-wider" style={{ color: DARK.muted }}>
                {isConnected ? "Live" : "Reconnecting…"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {players.map((p) => (
              <div key={p.id} className="player-slot" style={{ background: "rgba(245,239,224,0.03)", borderColor: "rgba(245,239,224,0.06)" }}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-base" style={{ backgroundColor: p.color + "30", border: `2px solid ${p.color}` }}>
                  {p.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: DARK.paper }}>{p.name}</p>
                  {p.isHost && (
                    <span className="jb-mono text-[9.5px] uppercase tracking-wider" style={{ color: DARK.gold }}>Host</span>
                  )}
                </div>
              </div>
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`empty-${i}`} className="empty-slot">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed text-sm" style={{ borderColor: "rgba(244,185,66,0.18)", color: "#5C6A85" }}>?</div>
                <span className="jb-mono text-[11px]" style={{ color: "#5C6A85" }}>Waiting…</span>
              </div>
            ))}
          </div>
        </div>

        <div className="fade-up" style={{ animationDelay: "210ms" }}>
          <label className="section-label" style={{ color: DARK.muted }}>Chat</label>
          <div className="chat-scroll h-28 space-y-1.5 overflow-y-auto rounded-xl border p-3 pr-1" style={{ background: "rgba(245,239,224,0.02)", borderColor: "rgba(245,239,224,0.08)" }}>
            {room.chat.length === 0 ? (
              <p className="py-4 text-center text-xs" style={{ color: "#5C6A85" }}>No messages yet — say hello 👋</p>
            ) : (
              room.chat.map((msg) => (
                <div key={msg.id} className="text-xs">
                  {msg.system ? (
                    <span className="italic" style={{ color: "#5C6A85" }}>{msg.text}</span>
                  ) : (
                    <>
                      <span className="font-medium" style={{ color: msg.senderColor }}>{msg.senderName}:</span>{" "}
                      <span style={{ color: "#C3C9D9" }}>{msg.text}</span>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="text"
              placeholder="Type a message…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              className="field-minimal !text-sm"
              style={{ borderColor: "rgba(245,239,224,0.16)", color: DARK.paper }}
            />
            <button onClick={handleSendChat} className="jb-mono text-xs uppercase tracking-wider hover:opacity-80" style={{ color: DARK.coral }}>Send</button>
          </div>
        </div>

        <div className="fade-up flex gap-3 pt-1" style={{ animationDelay: "280ms" }}>
          <button onClick={handleLeave} className="btn-piece btn-piece-ghost flex-1 justify-center">Leave room</button>
          {isHost ? (
            <button
              onClick={() => startGame()}
              disabled={players.length < 1}
              className="btn-piece btn-piece-primary flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >Start game</button>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-[14px] border text-center text-sm" style={{ borderColor: "rgba(245,239,224,0.1)", color: DARK.muted }}>
              Waiting for host…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * GAME VIEW — with light/dark theme toggle
 * ────────────────────────────────────────────────────────── */
function GameView({ roomCode }: { roomCode: string }) {
  const { room, socket, sendChatMessage } = useRoom();
  const {
    pieces,
    activePieceId,
    progressPercent,
    isCompleted,
    completionData,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = usePuzzleState();

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [bgHue, setBgHue] = useState<number>(210);

  const C = useMemo(() => {
    const basePalette = theme === "dark" ? DARK : LIGHT;
    
    // Dynamically calculate theme colors based on bgHue slider
    const pageBg = theme === "dark" 
      ? `hsl(${bgHue}, 35%, 12%)` 
      : `hsl(${bgHue}, 20%, 88%)`;
      
    const boardBg = theme === "dark"
      ? `hsl(${bgHue}, 32%, 17%)`
      : `hsl(${bgHue}, 18%, 78%)`;
      
    const boardBorder = theme === "dark"
      ? `hsl(${bgHue}, 25%, 23%)`
      : `hsl(${bgHue}, 15%, 68%)`;

    const panel = theme === "dark"
      ? `hsl(${bgHue}, 30%, 15%)`
      : `hsl(${bgHue}, 18%, 94%)`;

    const hudBg = theme === "dark"
      ? `hsla(${bgHue}, 30%, 15%, 0.85)`
      : `hsla(${bgHue}, 18%, 96%, 0.85)`;

    const hudBorder = theme === "dark"
      ? `hsla(${bgHue}, 30%, 25%, 0.2)`
      : `hsla(${bgHue}, 18%, 50%, 0.15)`;

    return {
      ...basePalette,
      pageBg,
      boardBg,
      boardBorder,
      panel,
      hudBg,
      hudBorder,
    };
  }, [theme, bgHue]);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [showRef, setShowRef] = useState(false);

  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; scale: number; mid: { x: number; y: number }; offset: { x: number; y: number } } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSnapSound = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }, []);

  const playCompletionSound = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.4);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.4);
    });
  }, []);

  const playRejectSound = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onSnap = () => playSnapSound();
    const onReject = () => playRejectSound();
    const onComplete = () => {
      playCompletionSound();
      const brandColors = ["#FF6B4A", "#F4B942", "#F5EFE0", "#34D399"];
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: brandColors });
      const duration = 2000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: brandColors });
        confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: brandColors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    };
    socket.on("pieces_snapped", onSnap);
    socket.on("snap_rejected", onReject);
    socket.on("game_completed", onComplete);
    return () => {
      socket.off("pieces_snapped", onSnap);
      socket.off("snap_rejected", onReject);
      socket.off("game_completed", onComplete);
    };
  }, [socket, playSnapSound, playRejectSound, playCompletionSound]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number }>>({});
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | undefined>(undefined);
  const stackOrderRef = useRef<PuzzlePieceData[]>([]);
  const placedAtRef = useRef<Record<string, number>>({});
  const prevPlacedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    pieces.forEach((p) => {
      const wasPlaced = prevPlacedRef.current[p.id];
      if (p.isPlaced && !wasPlaced) placedAtRef.current[p.id] = Date.now();
      prevPlacedRef.current[p.id] = p.isPlaced;
    });
  }, [pieces]);

  useEffect(() => {
    if (!room?.config?.imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      const canvas = canvasRef.current;
      if (canvas && room?.config) {
        const rect = canvas.getBoundingClientRect();
        const bx = room.config.boardWidth;
        const by = room.config.boardHeight;
        offsetRef.current = {
          x: rect.width / 2 - bx / 2,
          y: rect.height / 2 - by / 2,
        };
      }
    };
    img.src = room.config.imageUrl;
  }, [room?.config?.imageUrl]);

  useEffect(() => {
    function onResize() {
      const canvas = canvasRef.current;
      if (!canvas || !room?.config || !imageLoaded) return;
      const rect = canvas.getBoundingClientRect();
      const bx = room.config.boardWidth;
      const by = room.config.boardHeight;
      const cx = rect.width / 2 - bx / 2;
      const cy = rect.height / 2 - by / 2;
      const dx = cx - offsetRef.current.x;
      const dy = cy - offsetRef.current.y;
      if (Math.hypot(dx, dy) < 100) {
        offsetRef.current = { x: cx, y: cy };
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [room?.config, imageLoaded]);

  useEffect(() => {
    if (!socket) return;
    function onCursorUpdated({ playerId, x, y }: { playerId: string; x: number; y: number }) {
      setCursors((prev) => ({ ...prev, [playerId]: { x, y } }));
    }
    socket.on("cursor_updated", onCursorUpdated);
    return () => { socket.off("cursor_updated", onCursorUpdated); };
  }, [socket]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;
    if (!canvas || !ctx || !img || !room?.config) return;

    const config = room.config;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = scaleRef.current;
    const offset = offsetRef.current;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offset.x * dpr, offset.y * dpr);

    const boardX = 0;
    const boardY = 0;
    const matPad = 24;

    // Board background with border
    ctx.save();
    ctx.fillStyle = C.boardBorder;
    ctx.beginPath();
    ctx.roundRect(boardX - matPad - 4, boardY - matPad - 4, config.boardWidth + (matPad + 4) * 2, config.boardHeight + (matPad + 4) * 2, 20);
    ctx.fill();
    ctx.fillStyle = C.boardBg;
    ctx.beginPath();
    ctx.roundRect(boardX - matPad, boardY - matPad, config.boardWidth + matPad * 2, config.boardHeight + matPad * 2, 16);
    ctx.fill();
    ctx.fillStyle = C.matDots;
    for (let i = 0; i < config.boardWidth + matPad * 2; i += 18) {
      for (let j = 0; j < config.boardHeight + matPad * 2; j += 18) {
        if ((i + j) % 36 === 0) ctx.fillRect(boardX - matPad + i, boardY - matPad + j, 1.5, 1.5);
      }
    }
    ctx.restore();

    // Board outline
    ctx.save();
    ctx.strokeStyle = C.boardOutline;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(boardX, boardY, config.boardWidth, config.boardHeight);
    ctx.setLineDash([]);
    ctx.restore();

    // Grid lines
    const pw = config.boardWidth / config.cols;
    const ph = config.boardHeight / config.rows;
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let r = 1; r < config.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(boardX, boardY + r * ph);
      ctx.lineTo(boardX + config.boardWidth, boardY + r * ph);
      ctx.stroke();
    }
    for (let c = 1; c < config.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(boardX + c * pw, boardY);
      ctx.lineTo(boardX + c * pw, boardY + config.boardHeight);
      ctx.stroke();
    }
    ctx.restore();

    // Pieces
    const sortedPieces = [...pieces].sort((a, b) => {
      if (a.isPlaced !== b.isPlaced) return a.isPlaced ? -1 : 1;
      if (a.id === activePieceId) return 1;
      if (b.id === activePieceId) return -1;
      return 0;
    });
    stackOrderRef.current = sortedPieces;

    const applyPop = (popScale: number) => {
      if (popScale === 1) return;
      ctx.translate(pw / 2, ph / 2);
      ctx.scale(popScale, popScale);
      ctx.translate(-pw / 2, -ph / 2);
    };

    for (const piece of sortedPieces) {
      const placedAt = placedAtRef.current[piece.id];
      const popT = placedAt ? Math.min(1, (Date.now() - placedAt) / 260) : 1;
      const ease = 1 - Math.pow(1 - popT, 2);
      const placePop = placedAt && popT < 1 ? 1 + 0.16 * (1 - ease) : 1;
      const dragLift = piece.id === activePieceId ? 1.06 : 1;
      const popScale = placePop * dragLift;

      ctx.save();
      ctx.translate(piece.currentX, piece.currentY);
      applyPop(popScale);

      const tabOverflow = Math.max(pw, ph) * 0.26;

      drawPiecePath(ctx, piece, pw, ph);
      ctx.clip();

      const srcPw = img.naturalWidth / config.cols;
      const srcPh = img.naturalHeight / config.rows;
      const srcOverflowX = tabOverflow * (img.naturalWidth / config.boardWidth);
      const srcOverflowY = tabOverflow * (img.naturalHeight / config.boardHeight);
      const sx = piece.gridX * srcPw - srcOverflowX;
      const sy = piece.gridY * srcPh - srcOverflowY;
      const sw = srcPw + srcOverflowX * 2;
      const sh = srcPh + srcOverflowY * 2;
      ctx.drawImage(img, sx, sy, sw, sh, -tabOverflow, -tabOverflow, pw + tabOverflow * 2, ph + tabOverflow * 2);

      ctx.save();
      ctx.shadowColor = C.shadow;
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      drawPiecePath(ctx, piece, pw, ph);
      ctx.strokeStyle = theme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.06)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      // Piece border
      ctx.save();
      ctx.translate(piece.currentX, piece.currentY);
      applyPop(popScale);
      drawPiecePath(ctx, piece, pw, ph);

      if (piece.lockedBy && piece.lockedBy !== socket.id) {
        ctx.strokeStyle = piece.lockedByColor || C.gold;
        ctx.lineWidth = 3;
        ctx.shadowColor = piece.lockedByColor || C.gold;
        ctx.shadowBlur = 8;
      } else if (piece.id === activePieceId) {
        ctx.strokeStyle = C.pieceActive;
        ctx.lineWidth = 3;
        ctx.shadowColor = "rgba(255,107,74,0.45)";
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;
      } else if (piece.isPlaced) {
        ctx.strokeStyle = popT < 1 ? C.gold : C.piecePlaced;
        ctx.lineWidth = popT < 1 ? 2.5 : 1.5;
        ctx.shadowColor = popT < 1 ? C.gold : (theme === "dark" ? "rgba(52,211,153,0.3)" : "rgba(52,211,153,0.3)");
        ctx.shadowBlur = popT < 1 ? 10 : 4;
      } else {
        ctx.strokeStyle = C.pieceBorder;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = C.shadow;
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
      }
      ctx.stroke();
      ctx.restore();
    }

    // Other players' cursors
    if (room.players) {
      for (const [pid, pos] of Object.entries(cursors)) {
        if (pid === socket.id) continue;
        const p = room.players[pid];
        if (!p) continue;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 16);
        ctx.lineTo(11, 11);
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.font = "11px 'Inter', system-ui";
        const nameWidth = ctx.measureText(p.name).width;
        ctx.fillStyle = p.color + "cc";
        ctx.beginPath();
        ctx.roundRect(12, 14, nameWidth + 10, 18, 4);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(p.name, 17, 27);
        ctx.restore();
      }
    }
  }, [pieces, activePieceId, room, cursors, socket, theme, C]);

  useEffect(() => {
    function tick() {
      renderCanvas();
      animFrameRef.current = requestAnimationFrame(tick);
    }
    if (imageLoaded) {
      animFrameRef.current = requestAnimationFrame(tick);
    }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [imageLoaded, renderCanvas]);

  function getCanvasPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left - offsetRef.current.x) / scaleRef.current;
    const y = (clientY - rect.top - offsetRef.current.y) / scaleRef.current;
    return { x, y };
  }

  function findPieceAt(x: number, y: number): PuzzlePieceData | null {
    if (!room?.config) return null;
    const pw = room.config.boardWidth / room.config.cols;
    const ph = room.config.boardHeight / room.config.rows;
    const pad = 2;
    const order = stackOrderRef.current.length ? stackOrderRef.current : pieces;
    for (let i = order.length - 1; i >= 0; i--) {
      const piece = order[i];
      if (piece.isPlaced) continue;
      if (
        x >= piece.currentX - pad &&
        x <= piece.currentX + pw + pad &&
        y >= piece.currentY - pad &&
        y <= piece.currentY + ph + pad
      ) {
        return piece;
      }
    }
    return null;
  }

  function handleWheelZoom(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    const newScale = Math.min(4, Math.max(0.25, scaleRef.current * delta));
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = (mx - offsetRef.current.x) / scaleRef.current;
    const wy = (my - offsetRef.current.y) / scaleRef.current;
    scaleRef.current = newScale;
    offsetRef.current.x = mx - wx * newScale;
    offsetRef.current.y = my - wy * newScale;
  }
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheelZoom, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheelZoom);
  }, []);

  function onPointerDown(e: React.MouseEvent) {
    if (e.button === 2 || e.button === 1) {
      isPanning.current = true;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const pos = getCanvasPos(e);
    const piece = findPieceAt(pos.x, pos.y);
    if (!piece) {
      isPanning.current = true;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (piece.lockedBy && piece.lockedBy !== socket.id) return;
    isDragging.current = true;
    dragOffset.current = { x: pos.x - piece.currentX, y: pos.y - piece.currentY };
    handleDragStart(piece.id);
  }

  function onPointerMove(e: React.MouseEvent) {
    if (isPanning.current) {
      offsetRef.current.x += e.clientX - lastPanPos.current.x;
      offsetRef.current.y += e.clientY - lastPanPos.current.y;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const pos = getCanvasPos(e);
    if (room) socket.emit("cursor_move", { roomCode: room.code, x: pos.x, y: pos.y });
    if (!isDragging.current || activePieceId === null) return;
    const newX = pos.x - dragOffset.current.x;
    const newY = pos.y - dragOffset.current.y;
    handleDragMove(activePieceId, newX, newY);
  }

  function onPointerUp() {
    if (isPanning.current) { isPanning.current = false; return; }
    if (isDragging.current && activePieceId !== null) handleDragEnd(activePieceId);
    isDragging.current = false;
  }

  function touchDist(t1: React.Touch, t2: React.Touch) { return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY); }
  function touchMid(t1: React.Touch, t2: React.Touch, rect: DOMRect) { return { x: (t1.clientX + t2.clientX) / 2 - rect.left, y: (t1.clientY + t2.clientY) / 2 - rect.top }; }

  function onTouchStart(e: React.TouchEvent) {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (e.touches.length === 2) {
      isDragging.current = false; isPanning.current = false;
      const d = touchDist(e.touches[0], e.touches[1]);
      const mid = touchMid(e.touches[0], e.touches[1], rect);
      pinchRef.current = { dist: d, scale: scaleRef.current, mid, offset: { ...offsetRef.current } };
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;
      const wx = (x - offsetRef.current.x) / scaleRef.current;
      const wy = (y - offsetRef.current.y) / scaleRef.current;
      const piece = findPieceAt(wx, wy);
      if (piece && !(piece.lockedBy && piece.lockedBy !== socket.id)) {
        isDragging.current = true;
        dragOffset.current = { x: wx - piece.currentX, y: wy - piece.currentY };
        handleDragStart(piece.id);
      } else {
        isPanning.current = true;
        lastPanPos.current = { x: t.clientX, y: t.clientY };
      }
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (e.touches.length === 2 && pinchRef.current) {
      const d = touchDist(e.touches[0], e.touches[1]);
      const mid = touchMid(e.touches[0], e.touches[1], rect);
      const p = pinchRef.current;
      const newScale = Math.min(4, Math.max(0.25, p.scale * (d / p.dist)));
      const wx = (p.mid.x - p.offset.x) / p.scale;
      const wy = (p.mid.y - p.offset.y) / p.scale;
      scaleRef.current = newScale;
      offsetRef.current.x = mid.x - wx * newScale;
      offsetRef.current.y = mid.y - wy * newScale;
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (isPanning.current) {
        offsetRef.current.x += t.clientX - lastPanPos.current.x;
        offsetRef.current.y += t.clientY - lastPanPos.current.y;
        lastPanPos.current = { x: t.clientX, y: t.clientY };
        return;
      }
      if (isDragging.current && activePieceId !== null) {
        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;
        const wx = (x - offsetRef.current.x) / scaleRef.current;
        const wy = (y - offsetRef.current.y) / scaleRef.current;
        handleDragMove(activePieceId, wx - dragOffset.current.x, wy - dragOffset.current.y);
      }
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) {
      if (isDragging.current && activePieceId !== null) handleDragEnd(activePieceId);
      isDragging.current = false;
      isPanning.current = false;
    }
  }

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!room?.startedAt || room.status === "completed") return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - room.startedAt!) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [room?.startedAt, room?.status]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const playerList = room ? Object.values(room.players) : [];

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ background: C.pageBg, color: C.ink }}>
      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none cursor-crosshair"
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* Top center: timer + progress */}
      <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2">
        <div className="hud-pill flex items-center gap-3 px-4 py-2">
          <span className="jb-mono text-lg font-semibold tracking-wider" style={{ color: C.ink }}>{formatTime(elapsed)}</span>
          <div className="h-4 w-px" style={{ background: theme === "dark" ? "rgba(245,239,224,0.15)" : "rgba(0,0,0,0.1)" }} />
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full sm:w-24" style={{ background: theme === "dark" ? "rgba(245,239,224,0.1)" : "rgba(0,0,0,0.1)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg, #FF6B4A, #F4B942)" }} />
            </div>
            <span className="jb-mono text-[10px]" style={{ color: C.muted }}>{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Top left: home */}
      <div className="absolute left-3 top-3 z-20 sm:left-5 sm:top-5">
        <Link href="/" className="hud-pill group !px-2.5 !py-2 text-lg hover:scale-105 transition-transform">🧩</Link>
      </div>

      {/* Top right: theme toggle + avatars */}
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-5 sm:top-5">
        <button
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          className="hud-pill !px-3 text-lg transition-transform hover:scale-110"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <div className="hud-pill !gap-0 hidden sm:flex">
          <div className="flex -space-x-2">
            {playerList.map((p) => (
              <div key={p.id} className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px]" style={{ backgroundColor: p.color + "40", borderColor: C.pageBg }} title={p.name}>
                {p.avatar}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom center: reference + center button + background hue slider */}
      <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 flex flex-wrap items-center justify-center gap-3 w-max max-w-[95vw]">
        <button
          onClick={() => setShowRef((v) => !v)}
          className="hud-pill gap-2 px-4 py-2 text-sm font-medium transition-transform hover:scale-105 active:scale-95"
          style={{ background: C.hudBg, borderColor: C.hudBorder, color: C.ink }}
        >
          <span>🖼️</span> Reference
        </button>
        <button
          onClick={() => {
            if (room?.config) {
              const canvas = canvasRef.current;
              if (canvas) {
                const rect = canvas.getBoundingClientRect();
                scaleRef.current = 1;
                offsetRef.current = {
                  x: rect.width / 2 - room.config.boardWidth / 2,
                  y: rect.height / 2 - room.config.boardHeight / 2,
                };
              }
            }
          }}
          className="hud-pill px-3 py-2 text-xs font-medium transition-transform hover:scale-105 active:scale-95"
          style={{ background: C.hudBg, borderColor: C.hudBorder, color: C.muted }}
          title="Reset view"
        >
          ⌖ Center
        </button>
        <div className="hud-pill flex items-center gap-2 px-3 py-2" style={{ background: C.hudBg, borderColor: C.hudBorder }}>
          <span className="text-xs" style={{ color: C.muted }}>🎨</span>
          <input
            type="range"
            min="0"
            max="360"
            value={bgHue}
            onChange={(e) => setBgHue(Number(e.target.value))}
            className="hue-slider w-20 sm:w-28"
            title="Adjust background color"
          />
        </div>
      </div>

      {showRef && (
        <div className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-2xl border p-2 shadow-2xl" style={{ background: theme === "dark" ? "#16263D" : "#fff", borderColor: theme === "dark" ? "rgba(245,239,224,0.1)" : "rgba(0,0,0,0.1)" }}>
          <img src={room?.config?.imageUrl} className="w-48 rounded-xl sm:w-56" alt="Reference" />
        </div>
      )}

      {/* Chat sidebar desktop */}
      <div className={`absolute bottom-0 right-0 top-0 z-20 hidden w-72 flex-col border-l transition-transform duration-300 sm:flex ${chatOpen ? "translate-x-0" : "translate-x-full"}`} style={{ background: C.hudBg, backdropFilter: "blur(12px)", borderColor: C.hudBorder }}>
        <div className="flex items-center justify-between border-b p-3" style={{ borderColor: C.hudBorder }}>
          <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Chat</h3>
          <button onClick={() => setChatOpen(false)} className="text-lg" style={{ color: C.muted }}>✕</button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {room?.chat.map((msg) => (
            <div key={msg.id} className="text-xs">
              {msg.system ? (
                <span className="italic" style={{ color: C.muted }}>{msg.text}</span>
              ) : (
                <>
                  <span className="font-medium" style={{ color: msg.senderColor }}>{msg.senderName}:</span>{" "}
                  <span style={{ color: theme === "dark" ? "#C3C9D9" : "#444" }}>{msg.text}</span>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="border-t p-3" style={{ borderColor: C.hudBorder }}>
          <input
            type="text" placeholder="Type…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && chatInput.trim()) { sendChatMessage(chatInput.trim()); setChatInput(""); } }}
            className="field-minimal !text-xs" style={{ borderColor: theme === "dark" ? "rgba(245,239,224,0.16)" : "rgba(0,0,0,0.15)", color: C.ink }}
          />
        </div>
      </div>

      {/* Chat mobile */}
      <div className={`absolute inset-x-0 bottom-0 z-30 flex max-h-[65vh] flex-col rounded-t-3xl border-t transition-transform duration-300 sm:hidden ${chatOpen ? "translate-y-0" : "translate-y-full"}`} style={{ background: C.hudBg, backdropFilter: "blur(12px)", borderColor: C.hudBorder }}>
        <div className="flex items-center justify-between border-b p-4" style={{ borderColor: C.hudBorder }}>
          <h3 className="text-base font-semibold" style={{ color: C.ink }}>Chat</h3>
          <button onClick={() => setChatOpen(false)} className="text-lg" style={{ color: C.muted }}>✕</button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4" style={{ minHeight: "30vh" }}>
          {room?.chat.map((msg) => (
            <div key={msg.id} className="text-sm">
              {msg.system ? (
                <span className="italic" style={{ color: C.muted }}>{msg.text}</span>
              ) : (
                <>
                  <span className="font-medium" style={{ color: msg.senderColor }}>{msg.senderName}:</span>{" "}
                  <span style={{ color: theme === "dark" ? "#C3C9D9" : "#444" }}>{msg.text}</span>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="border-t p-4 pb-6" style={{ borderColor: C.hudBorder }}>
          <input
            type="text" placeholder="Type a message…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && chatInput.trim()) { sendChatMessage(chatInput.trim()); setChatInput(""); } }}
            className="field-minimal" style={{ borderColor: theme === "dark" ? "rgba(245,239,224,0.16)" : "rgba(0,0,0,0.15)", color: C.ink }}
          />
        </div>
      </div>

      {/* Chat FAB */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="absolute right-5 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-xl shadow-lg transition-transform hover:scale-110 active:scale-95"
        style={{ background: C.coral, color: "#fff", boxShadow: "0 8px 24px -6px rgba(255,107,74,0.5)" }}
      >
        💬
      </button>

      {/* Victory Modal */}
      {isCompleted && completionData && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}>
          <div className="modal-pop w-full max-w-md rounded-3xl border p-8 text-center sm:p-10" style={{ background: theme === "dark" ? "#16263D" : "#fff", borderColor: theme === "dark" ? "rgba(245,239,224,0.1)" : "rgba(0,0,0,0.08)" }}>
            <div className="text-5xl">🎉</div>
            <h2 className="mt-4 text-3xl font-semibold" style={{ color: C.ink }}>
              Puzzle <span className="italic" style={{ color: C.coral }}>complete!</span>
            </h2>
            <p className="mt-2" style={{ color: C.muted }}>
              Solved in <span className="jb-mono font-bold" style={{ color: C.gold }}>{formatTime(completionData.durationSeconds)}</span>
            </p>
            <div className="mt-7 flex gap-3">
              <Link href="/create" className="btn-piece btn-piece-primary flex-1 justify-center">New puzzle</Link>
              <Link href="/" className="btn-piece btn-piece-ghost flex-1 justify-center">Home</Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .hue-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
          outline: none;
          cursor: pointer;
          transition: opacity .2s;
        }
        .hue-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #FF6B4A;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
          cursor: pointer;
        }
        .hue-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #FF6B4A;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
          cursor: pointer;
        }

        .pt-app { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .font-display { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
        .jb-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

        .section-label {
          display: flex; align-items: center;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
          margin-bottom: 0.6rem;
        }

        .field-minimal {
          width: 100%; background: transparent; border: none;
          border-bottom: 1.5px solid rgba(245,239,224,0.16);
          padding: 0.5rem 0.1rem 0.6rem; font-size: 1rem; transition: border-color 0.2s ease;
        }
        .field-minimal::placeholder { color: #5C6A85; }
        .field-minimal:focus { outline: none; border-color: #FF6B4A; }

        .btn-piece {
          position: relative; display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.85rem 1.6rem 0.85rem 2rem; border-radius: 14px;
          font-weight: 600; font-size: 0.9rem;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          white-space: nowrap;
        }
        .btn-piece::before {
          content: ""; position: absolute; left: -7px; top: 50%; transform: translateY(-50%);
          width: 15px; height: 15px; border-radius: 50%;
        }
        .btn-piece-primary { background: #FF6B4A; color: #fff; }
        .btn-piece-primary::before { background: #FF6B4A; }
        .btn-piece-primary:hover:not(:disabled) {
          transform: translateY(-2px); box-shadow: 0 12px 28px -10px rgba(255,107,74,0.65);
        }
        .btn-piece-ghost {
          background: transparent; color: #F5EFE0; border: 1.5px solid rgba(245,239,224,0.18);
        }
        .btn-piece-ghost::before { background: #0F1C2E; border: 1.5px solid rgba(245,239,224,0.18); }
        .btn-piece-ghost:hover:not(:disabled) { border-color: rgba(245,239,224,0.4); transform: translateY(-2px); }

        .code-chip {
          position: relative; display: inline-flex; align-items: center; gap: 0.9rem;
          padding: 0.9rem 1.5rem; border-radius: 16px;
          border: 1px solid rgba(245,239,224,0.12); background: #16263D;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .code-chip:hover { border-color: rgba(255,107,74,0.4); transform: translateY(-1px); }
        .copy-flag {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.1em;
          color: #6C7A94; transition: color 0.2s ease;
        }
        .copy-flag-active { color: #34D399; }

        .player-slot, .empty-slot {
          display: flex; align-items: center; gap: 0.7rem;
          padding: 0.6rem 0.8rem; border-radius: 14px;
        }
        .player-slot { background: rgba(245,239,224,0.03); border: 1px solid rgba(245,239,224,0.06); }
        .empty-slot { background: transparent; border: 1px dashed rgba(244,185,66,0.18); animation: dash-pulse 2s ease-in-out infinite; }

        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(245,239,224,0.15); border-radius: 4px; }

        .hud-pill {
          display: inline-flex; align-items: center; gap: 0.45rem;
          padding: 0.5rem 0.85rem; border-radius: 999px;
          backdrop-filter: blur(10px); box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }

        .fade-up { animation: fade-up 0.5s cubic-bezier(0.2,0.8,0.2,1) both; }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes dash-pulse {
          0%, 100% { border-color: rgba(244,185,66,0.14); }
          50% { border-color: rgba(244,185,66,0.4); }
        }

        .modal-pop { animation: modal-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes modal-pop {
          0% { opacity: 0; transform: scale(0.85) translateY(10px); }
          60% { opacity: 1; transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }

        .pulse-piece { animation: pulse-piece 1.4s ease-in-out infinite; }
        @keyframes pulse-piece {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }

        @media (prefers-reduced-motion: reduce) {
          .fade-up, .modal-pop, .pulse-piece, .empty-slot { animation: none !important; opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * ROOM PAGE
 * ────────────────────────────────────────────────────────── */
function RoomContent({ roomCode }: { roomCode: string }) {
  const { room, joinRoom, isConnected } = useRoom();
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const hasJoined = useRef(false);

  useEffect(() => {
    if (!isConnected || hasJoined.current) return;
    if (room && room.code === roomCode) { hasJoined.current = true; return; }
    if (!room && !joining) {
      setJoining(true); hasJoined.current = true;
      const randomName = "Player-" + Math.floor(Math.random() * 1000);
      joinRoom(roomCode, randomName, "🧩").catch(() => {
        router.push("/join?code=" + roomCode);
      });
    }
  }, [isConnected, room, roomCode, router, joinRoom, joining]);

  if (!room || room.code !== roomCode) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: DARK.pageBg }}>
        <div className="space-y-4 text-center">
          <div className="pulse-piece text-4xl">🧩</div>
          <p style={{ color: DARK.muted }}>Connecting to room…</p>
        </div>
      </div>
    );
  }

  if (room.status === "lobby") return <LobbyView roomCode={roomCode} />;
  return <GameView roomCode={roomCode} />;
}

export default function RoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const [roomCode, setRoomCode] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setRoomCode(p.roomCode));
  }, [params]);

  if (!roomCode) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: DARK.pageBg }}>
        <div className="pulse-piece text-4xl">🧩</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col" style={{ background: DARK.pageBg, color: DARK.ink }}>
      <RoomContent roomCode={roomCode} />
    </main>
  );
}