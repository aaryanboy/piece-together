"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RoomProvider, useRoom } from "@/context/RoomContext";
import { usePuzzleState } from "@/hooks/usePuzzleState";
import { drawPiecePath } from "@/lib/puzzleGenerator";
import { PuzzlePieceData } from "@/types/puzzle";
import { ChatMessage, Player } from "@/types/room";

/* Brand tokens used across canvas drawing (kept as consts so the palette
   only has to change in one place if it ever does) */
const C = {
  bg: "#0F1C2E",
  panel: "#16263D",
  coral: "#FF6B4A",
  gold: "#F4B942",
  paper: "#F5EFE0",
  muted: "#A8ADC4",
  mint: "#34D399",
};

/* ──────────────────────────────────────────────────────────
 * LOBBY VIEW
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
    <div className="flex flex-1 items-center justify-center px-6 py-10 sm:py-14">
      <div className="w-full max-w-2xl space-y-5">
        {/* Room Code */}
        <div className="fade-up text-center" style={{ animationDelay: "0ms" }}>
          <p className="section-label !mb-3 justify-center">Room code</p>
          <button onClick={copyCode} className="code-chip group">
            <span className="jb-mono text-2xl font-bold tracking-[0.2em] text-[#F5EFE0] sm:text-3xl">
              {roomCode}
            </span>
            <span className={`copy-flag ${copied ? "copy-flag-active" : ""}`}>
              {copied ? "Copied" : "Copy"}
            </span>
          </button>
          <p className="mt-2.5 text-xs text-[#6C7A94]">Share this code with friends to join</p>
        </div>

        {/* Puzzle preview */}
        {room.config && (
          <div className="fade-up flex items-center gap-4" style={{ animationDelay: "70ms" }}>
            <img
              src={room.config.imageUrl}
              alt={room.config.imageTitle}
              className="h-16 w-24 flex-shrink-0 rounded-xl border border-white/10 object-cover"
            />
            <div>
              <p className="text-sm font-medium text-[#F5EFE0]">{room.config.imageTitle}</p>
              <p className="jb-mono mt-0.5 text-[11px] uppercase tracking-wide text-[#8A96AE]">
                {room.config.totalPieces} pcs · {room.config.rows}×{room.config.cols} · up to{" "}
                {room.maxPlayers} players
              </p>
            </div>
          </div>
        )}

        {/* Players */}
        <div className="fade-up" style={{ animationDelay: "140ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <label className="section-label !mb-0">
              Players ({players.length}/{room.maxPlayers})
            </label>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: isConnected ? C.mint : C.coral }}
              />
              <span className="jb-mono text-[10px] uppercase tracking-wider text-[#6C7A94]">
                {isConnected ? "Live" : "Reconnecting…"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {players.map((p) => (
              <div key={p.id} className="player-slot">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-base"
                  style={{ backgroundColor: p.color + "30", border: `2px solid ${p.color}` }}
                >
                  {p.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#F5EFE0]">{p.name}</p>
                  {p.isHost && (
                    <span className="jb-mono text-[9.5px] uppercase tracking-wider text-[#F4B942]">
                      Host
                    </span>
                  )}
                </div>
              </div>
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`empty-${i}`} className="empty-slot">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-white/10 text-sm text-[#5C6A85]">
                  ?
                </div>
                <span className="jb-mono text-[11px] text-[#5C6A85]">Waiting…</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="fade-up" style={{ animationDelay: "210ms" }}>
          <label className="section-label">Chat</label>
          <div className="chat-scroll h-28 space-y-1.5 overflow-y-auto pr-1">
            {room.chat.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#5C6A85]">No messages yet — say hello 👋</p>
            ) : (
              room.chat.map((msg) => (
                <div key={msg.id} className="text-xs">
                  {msg.system ? (
                    <span className="italic text-[#5C6A85]">{msg.text}</span>
                  ) : (
                    <>
                      <span className="font-medium" style={{ color: msg.senderColor }}>
                        {msg.senderName}:
                      </span>{" "}
                      <span className="text-[#C3C9D9]">{msg.text}</span>
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
            />
            <button onClick={handleSendChat} className="jb-mono text-xs uppercase tracking-wider text-[#FF6B4A] hover:text-[#FF8768]">
              Send
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="fade-up flex gap-3 pt-1" style={{ animationDelay: "280ms" }}>
          <button onClick={handleLeave} className="btn-piece btn-piece-ghost flex-1 justify-center">
            Leave room
          </button>
          {isHost ? (
            <button
              onClick={() => startGame()}
              disabled={players.length < 1}
              className="btn-piece btn-piece-primary flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start game
            </button>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-[14px] border border-white/10 text-center text-sm text-[#8A96AE]">
              Waiting for host…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * GAME VIEW — Canvas Puzzle Board
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

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [showRef, setShowRef] = useState(false);
  const [ghostVisible, setGhostVisible] = useState(true);

  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{
    dist: number;
    scale: number;
    mid: { x: number; y: number };
    offset: { x: number; y: number };
  } | null>(null);
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

  useEffect(() => {
    if (!socket) return;
    const onSnap = () => playSnapSound();
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
    socket.on("game_completed", onComplete);
    return () => {
      socket.off("pieces_snapped", onSnap);
      socket.off("game_completed", onComplete);
    };
  }, [socket, playSnapSound, playCompletionSound]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number }>>({});
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | undefined>(undefined);
  // Mirrors the exact draw order each frame — hit-testing reads this instead of the
  // raw `pieces` array, so clicking/tapping always grabs whatever is visually on top.
  const stackOrderRef = useRef<PuzzlePieceData[]>([]);

  // Track when each piece last transitioned into place, for the snap-pop animation
  const placedAtRef = useRef<Record<string, number>>({});
  const prevPlacedRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    pieces.forEach((p) => {
      const wasPlaced = prevPlacedRef.current[p.id];
      if (p.isPlaced && !wasPlaced) placedAtRef.current[p.id] = Date.now();
      prevPlacedRef.current[p.id] = p.isPlaced;
    });
  }, [pieces]);

  // Load puzzle image
  useEffect(() => {
    if (!room?.config?.imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = room.config.imageUrl;
  }, [room?.config?.imageUrl]);

  // Listen for cursor updates from other players
  useEffect(() => {
    if (!socket) return;
    function onCursorUpdated({ playerId, x, y }: { playerId: string; x: number; y: number }) {
      setCursors((prev) => ({ ...prev, [playerId]: { x, y } }));
    }
    socket.on("cursor_updated", onCursorUpdated);
    return () => {
      socket.off("cursor_updated", onCursorUpdated);
    };
  }, [socket]);

  // Canvas render loop
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

    // Draw board outline (target area)
    const boardX = 300;
    const boardY = 150;
    ctx.strokeStyle = "rgba(244,185,66,0.22)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(boardX, boardY, config.boardWidth, config.boardHeight);
    ctx.setLineDash([]);

    // Faint guide of the finished image, so the target is always visible
    if (ghostVisible) {
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.drawImage(img, boardX, boardY, config.boardWidth, config.boardHeight);
      ctx.restore();
    }

    // Draw grid lines on board
    const pw = config.boardWidth / config.cols;
    const ph = config.boardHeight / config.rows;
    ctx.strokeStyle = "rgba(244,185,66,0.07)";
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

    // Draw pieces (unplaced first, placed on top)
    const sortedPieces = [...pieces].sort((a, b) => {
      if (a.isPlaced !== b.isPlaced) return a.isPlaced ? -1 : 1;
      if (a.id === activePieceId) return 1;
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
      // Lift the piece currently being dragged slightly, for tactile feedback
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

      ctx.restore();

      if (!piece.isPlaced) {
        ctx.save();
        ctx.translate(piece.currentX, piece.currentY);
        applyPop(popScale);
        drawPiecePath(ctx, piece, pw, ph);
        ctx.shadowColor = piece.id === activePieceId ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.3)";
        ctx.shadowBlur = piece.id === activePieceId ? 14 : 6;
        ctx.shadowOffsetX = piece.id === activePieceId ? 4 : 2;
        ctx.shadowOffsetY = piece.id === activePieceId ? 4 : 2;
        ctx.fillStyle = "rgba(0,0,0,0.01)";
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(piece.currentX, piece.currentY);
      applyPop(popScale);
      drawPiecePath(ctx, piece, pw, ph);
      if (piece.lockedBy && piece.lockedBy !== socket.id) {
        ctx.strokeStyle = piece.lockedByColor || C.gold;
        ctx.lineWidth = 2.5;
      } else if (piece.id === activePieceId) {
        ctx.strokeStyle = C.coral;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "rgba(255,107,74,0.45)";
        ctx.shadowBlur = 12;
      } else if (piece.isPlaced) {
        ctx.strokeStyle = popT < 1 ? C.gold : "rgba(52, 211, 153, 0.45)";
        ctx.lineWidth = popT < 1 ? 2 : 1;
      } else {
        ctx.strokeStyle = "rgba(245, 239, 224, 0.16)";
        ctx.lineWidth = 1;
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw other players' cursors
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
  }, [pieces, activePieceId, room, cursors, socket, ghostVisible]);

  // Animation loop
  useEffect(() => {
    function tick() {
      renderCanvas();
      animFrameRef.current = requestAnimationFrame(tick);
    }
    if (imageLoaded) {
      animFrameRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [imageLoaded, renderCanvas]);

  // Mouse / pointer handlers
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
    // A little forgiveness around each piece's box — makes small pieces (and finger taps) easier to grab.
    const pad = Math.min(pw, ph) * 0.12;

    // Search the *actual on-screen draw order*, topmost first — not the raw pieces array,
    // whose order has no relationship to what's visually stacked on top.
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

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(3, Math.max(0.3, scaleRef.current * delta));
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = (mx - offsetRef.current.x) / scaleRef.current;
    const wy = (my - offsetRef.current.y) / scaleRef.current;
    scaleRef.current = newScale;
    offsetRef.current.x = mx - wx * newScale;
    offsetRef.current.y = my - wy * newScale;
  }

  function onPointerDown(e: React.MouseEvent) {
    if (e.button === 2 || e.button === 1) {
      isPanning.current = true;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const pos = getCanvasPos(e);
    const piece = findPieceAt(pos.x, pos.y);
    if (!piece) return;
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

    if (room) {
      socket.emit("cursor_move", { roomCode: room.code, x: pos.x, y: pos.y });
    }

    if (!isDragging.current || activePieceId === null) return;

    const newX = pos.x - dragOffset.current.x;
    const newY = pos.y - dragOffset.current.y;
    handleDragMove(activePieceId, newX, newY);
  }

  function onPointerUp() {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }
    if (isDragging.current && activePieceId !== null) {
      handleDragEnd(activePieceId);
    }
    isDragging.current = false;
  }

  // Touch handlers — single finger drags a piece or pans, two fingers pinch-zoom + pan
  function touchDist(t1: React.Touch, t2: React.Touch) {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  }
  function touchMid(t1: React.Touch, t2: React.Touch, rect: DOMRect) {
    return { x: (t1.clientX + t2.clientX) / 2 - rect.left, y: (t1.clientY + t2.clientY) / 2 - rect.top };
  }

  function onTouchStart(e: React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 2) {
      isDragging.current = false;
      isPanning.current = false;
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 2 && pinchRef.current) {
      const d = touchDist(e.touches[0], e.touches[1]);
      const mid = touchMid(e.touches[0], e.touches[1], rect);
      const p = pinchRef.current;
      const newScale = Math.min(3, Math.max(0.3, p.scale * (d / p.dist)));
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
      if (isDragging.current && activePieceId !== null) {
        handleDragEnd(activePieceId);
      }
      isDragging.current = false;
      isPanning.current = false;
    }
  }

  // Timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!room?.startedAt || room.status === "completed") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - room.startedAt!) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.startedAt, room?.status]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const playerList = room ? Object.values(room.players) : [];

  return (
    <div className="pt-app relative flex h-dvh flex-col bg-[#0F1C2E] text-[#F5EFE0]">
      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#12213A] px-3 py-2.5 sm:px-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/" className="group flex items-center gap-1.5">
            <span className="text-lg transition-transform group-hover:scale-110">🧩</span>
            <span className="font-display hidden text-sm font-semibold sm:inline">Piece Together</span>
          </Link>
          <span className="jb-mono rounded-md bg-white/[0.06] px-2 py-1 text-[11px] tracking-wider text-[#8A96AE]">
            {roomCode}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/[0.08] sm:w-24">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg, #FF6B4A, #F4B942)" }}
              />
            </div>
            <span className="jb-mono text-[11px] text-[#8A96AE]">{progressPercent}%</span>
          </div>

          <span className="jb-mono text-sm text-[#C3C9D9]">{formatTime(elapsed)}</span>

          <div className="hidden -space-x-2 sm:flex">
            {playerList.map((p) => (
              <div
                key={p.id}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#12213A] text-xs"
                style={{ backgroundColor: p.color + "40" }}
                title={p.name}
              >
                {p.avatar}
              </div>
            ))}
          </div>
          <span className="jb-mono text-[11px] text-[#8A96AE] sm:hidden">{playerList.length}p</span>
        </div>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden bg-[#0F1C2E]">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none cursor-crosshair"
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* Reference Image + guide toggle */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
        <button onClick={() => setShowRef(!showRef)} className="ref-pill">
          🖼️ Reference
        </button>
        <button
          onClick={() => setGhostVisible((v) => !v)}
          className="ref-pill"
          data-active={ghostVisible}
          title="Toggle faint image guide on the board"
        >
          {ghostVisible ? "👁️ Guide on" : "👁️ Guide off"}
        </button>
        {showRef && (
          <div className="absolute bottom-11 left-0 rounded-xl border border-white/10 bg-[#16263D] p-2 shadow-2xl">
            <img src={room?.config?.imageUrl} className="w-40 rounded-lg sm:w-48" />
          </div>
        )}
      </div>

      {/* Chat — desktop sidebar */}
      <div
        className={`absolute bottom-0 right-0 top-0 z-20 hidden w-72 flex-col border-l border-white/10 bg-[#12213A] transition-transform duration-300 sm:flex ${
          chatOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-3">
          <h3 className="text-sm font-semibold text-[#F5EFE0]">Chat</h3>
          <button onClick={() => setChatOpen(false)} className="text-[#8A96AE] hover:text-white">
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {room?.chat.map((msg) => (
            <div key={msg.id} className="text-xs">
              {msg.system ? (
                <span className="italic text-[#5C6A85]">{msg.text}</span>
              ) : (
                <>
                  <span className="font-medium" style={{ color: msg.senderColor }}>
                    {msg.senderName}:
                  </span>{" "}
                  <span className="text-[#C3C9D9]">{msg.text}</span>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 p-3">
          <input
            type="text"
            placeholder="Type…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && chatInput.trim()) {
                sendChatMessage(chatInput.trim());
                setChatInput("");
              }
            }}
            className="field-minimal !text-xs"
          />
        </div>
      </div>

      {/* Chat — mobile bottom sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 flex max-h-[65vh] flex-col rounded-t-3xl border-t border-white/10 bg-[#12213A] transition-transform duration-300 sm:hidden ${
          chatOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h3 className="font-display text-base font-semibold text-[#F5EFE0]">Chat</h3>
          <button onClick={() => setChatOpen(false)} className="text-[#8A96AE] hover:text-white">
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4" style={{ minHeight: "30vh" }}>
          {room?.chat.map((msg) => (
            <div key={msg.id} className="text-sm">
              {msg.system ? (
                <span className="italic text-[#5C6A85]">{msg.text}</span>
              ) : (
                <>
                  <span className="font-medium" style={{ color: msg.senderColor }}>
                    {msg.senderName}:
                  </span>{" "}
                  <span className="text-[#C3C9D9]">{msg.text}</span>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 p-4 pb-6">
          <input
            type="text"
            placeholder="Type a message…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && chatInput.trim()) {
                sendChatMessage(chatInput.trim());
                setChatInput("");
              }
            }}
            className="field-minimal"
          />
        </div>
      </div>

      <button onClick={() => setChatOpen(!chatOpen)} className="chat-fab">
        💬
      </button>

      {/* Victory Modal */}
      {isCompleted && completionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <div className="modal-pop w-full max-w-md rounded-3xl border border-white/10 bg-[#16263D] p-8 text-center sm:p-10">
            <div className="text-5xl">🎉</div>
            <h2 className="font-display mt-4 text-3xl font-semibold">
              Puzzle <span className="italic text-[#FF6B4A]">complete!</span>
            </h2>
            <p className="mt-2 text-[#A8ADC4]">
              Solved in{" "}
              <span className="jb-mono font-bold text-[#F4B942]">{formatTime(completionData.durationSeconds)}</span>
            </p>
            <div className="mt-7 flex gap-3">
              <Link href="/create" className="btn-piece btn-piece-primary flex-1 justify-center">
                New puzzle
              </Link>
              <Link href="/" className="btn-piece btn-piece-ghost flex-1 justify-center">
                Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * ROOM PAGE — State-driven Lobby ↔ Game
 * ────────────────────────────────────────────────────────── */
function RoomContent({ roomCode }: { roomCode: string }) {
  const { room, joinRoom, isConnected, socket } = useRoom();
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const hasJoined = useRef(false);

  useEffect(() => {
    if (!isConnected || hasJoined.current) return;

    if (room && room.code === roomCode) {
      hasJoined.current = true;
      return;
    }

    if (!room && !joining) {
      setJoining(true);
      hasJoined.current = true;
      joinRoom(roomCode, `Player-${Math.floor(Math.random() * 1000)}`, "🧩").catch(() => {
        router.push(`/join?code=${roomCode}`);
      });
    }
  }, [isConnected, room, roomCode, router, joinRoom, joining]);

  if (!room || room.code !== roomCode) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="pulse-piece text-4xl">🧩</div>
          <p className="text-[#8A96AE]">Connecting to room…</p>
        </div>
      </div>
    );
  }

  if (room.status === "lobby") {
    return <LobbyView roomCode={roomCode} />;
  }

  return <GameView roomCode={roomCode} />;
}

export default function RoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const [roomCode, setRoomCode] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setRoomCode(p.roomCode));
  }, [params]);

  if (!roomCode) {
    return (
      <main className="pt-app flex min-h-screen items-center justify-center bg-[#0F1C2E]">
        <div className="pulse-piece text-4xl">🧩</div>
      </main>
    );
  }

  return (
    <main className="pt-app flex min-h-screen flex-col bg-[#0F1C2E] text-[#F5EFE0]">
      <RoomContent roomCode={roomCode} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .pt-app { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .font-display { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
        .jb-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

        .section-label {
          display: flex;
          align-items: center;
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
          padding: 0.5rem 0.1rem 0.6rem;
          font-size: 1rem;
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
          font-size: 0.9rem;
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
        .btn-piece-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px -10px rgba(255,107,74,0.65);
        }
        .btn-piece-ghost {
          background: transparent;
          color: #F5EFE0;
          border: 1.5px solid rgba(245,239,224,0.18);
        }
        .btn-piece-ghost::before {
          background: #0F1C2E;
          border: 1.5px solid rgba(245,239,224,0.18);
        }
        .btn-piece-ghost:hover:not(:disabled) { border-color: rgba(245,239,224,0.4); transform: translateY(-2px); }

        .code-chip {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.9rem;
          padding: 0.9rem 1.5rem;
          border-radius: 16px;
          border: 1px solid rgba(245,239,224,0.12);
          background: #16263D;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .code-chip:hover { border-color: rgba(255,107,74,0.4); transform: translateY(-1px); }
        .copy-flag {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #6C7A94;
          transition: color 0.2s ease;
        }
        .copy-flag-active { color: #34D399; }

        .player-slot, .empty-slot {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.6rem 0.8rem;
          border-radius: 14px;
          background: rgba(245,239,224,0.03);
          border: 1px solid rgba(245,239,224,0.06);
        }
        .empty-slot {
          background: transparent;
          border-style: dashed;
          border-color: rgba(244,185,66,0.18);
          animation: dash-pulse 2s ease-in-out infinite;
        }

        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(245,239,224,0.15); border-radius: 4px; }

        .ref-pill {
          border-radius: 999px;
          padding: 0.5rem 0.9rem;
          font-size: 12px;
          background: rgba(22,38,61,0.9);
          border: 1px solid rgba(245,239,224,0.12);
          color: #C3C9D9;
          backdrop-filter: blur(6px);
          transition: border-color 0.2s ease;
        }
        .ref-pill:hover { border-color: rgba(255,107,74,0.4); color: #F5EFE0; }
        .ref-pill[data-active="true"] { border-color: rgba(244,185,66,0.5); color: #F5EFE0; }

        .chat-fab {
          position: fixed;
          right: 14px;
          bottom: 14px;
          z-index: 25;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          font-size: 20px;
          background: #FF6B4A;
          box-shadow: 0 10px 24px -8px rgba(255,107,74,0.6);
          transition: transform 0.2s ease;
        }
        .chat-fab:hover { transform: scale(1.08); }
        .chat-fab:active { transform: scale(0.95); }

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
    </main>
  );
}