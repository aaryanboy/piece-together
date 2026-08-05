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
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl space-y-6">
        {/* Room Code Banner */}
        <div className="glass-panel rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-slate-400">Room Code</p>
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-slate-800/80 border border-white/10 hover:border-indigo-500/40 transition-all group"
          >
            <span className="font-mono text-2xl font-bold tracking-widest text-gradient">
              {roomCode}
            </span>
            <span className="text-slate-500 group-hover:text-indigo-400 transition-colors text-sm">
              {copied ? "✓ Copied!" : "📋 Copy"}
            </span>
          </button>
          <p className="text-xs text-slate-500">
            Share this code with friends to join
          </p>
        </div>

        {/* Settings Preview */}
        {room.config && (
          <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
            <img
              src={room.config.imageUrl}
              alt={room.config.imageTitle}
              className="w-20 h-14 rounded-lg object-cover border border-white/10"
            />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-white">{room.config.imageTitle}</p>
              <p className="text-xs text-slate-400">
                {room.config.totalPieces} pieces ({room.config.rows}×{room.config.cols}) • Up to{" "}
                {room.maxPlayers} players
              </p>
            </div>
          </div>
        )}

        {/* Players */}
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              Players ({players.length}/{room.maxPlayers})
            </h2>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-400"}`}
              />
              <span className="text-xs text-slate-500">
                {isConnected ? "Live" : "Reconnecting..."}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-white/5"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: p.color + "30", border: `2px solid ${p.color}` }}
                >
                  {p.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  {p.isHost && (
                    <span className="text-[10px] text-indigo-400 uppercase tracking-wider">
                      Host
                    </span>
                  )}
                </div>
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: room.maxPlayers - players.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-white/5 opacity-30"
              >
                <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center text-sm">
                  ?
                </div>
                <span className="text-xs text-slate-500">Waiting...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Chat</h2>
          <div className="h-32 overflow-y-auto space-y-1.5 pr-1">
            {room.chat.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-4">
                No messages yet. Say hello! 👋
              </p>
            ) : (
              room.chat.map((msg) => (
                <div key={msg.id} className="text-xs">
                  {msg.system ? (
                    <span className="text-slate-500 italic">{msg.text}</span>
                  ) : (
                    <>
                      <span className="font-medium" style={{ color: msg.senderColor }}>
                        {msg.senderName}:
                      </span>{" "}
                      <span className="text-slate-300">{msg.text}</span>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              className="flex-1 bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
            <button
              onClick={handleSendChat}
              className="px-4 py-2 rounded-xl bg-indigo-600/30 border border-indigo-500/30 text-sm text-indigo-300 hover:bg-indigo-600/50 transition-all"
            >
              Send
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleLeave}
            className="flex-1 py-3 rounded-2xl font-medium text-slate-400 glass-card hover:text-white transition-all"
          >
            Leave Room
          </button>
          {isHost && (
            <button
              onClick={() => startGame()}
              disabled={players.length < 1}
              className="flex-1 py-3 rounded-2xl font-semibold text-white bg-gradient-glow shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
            >
              🎮 Start Game
            </button>
          )}
          {!isHost && (
            <div className="flex-1 py-3 rounded-2xl text-center text-sm text-slate-400 glass-card">
              Waiting for host to start...
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

  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
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
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
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
      // Fire confetti burst
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
      });
      const duration = 2000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    };
    socket.on('pieces_snapped', onSnap);
    socket.on('game_completed', onComplete);
    return () => {
      socket.off('pieces_snapped', onSnap);
      socket.off('game_completed', onComplete);
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
    ctx.strokeStyle = "rgba(99, 102, 241, 0.15)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(boardX, boardY, config.boardWidth, config.boardHeight);
    ctx.setLineDash([]);

    // Draw grid lines on board
    const pw = config.boardWidth / config.cols;
    const ph = config.boardHeight / config.rows;
    ctx.strokeStyle = "rgba(99, 102, 241, 0.06)";
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
      if (a.id === activePieceId) return 1; // Active piece on top
      return 0;
    });

    for (const piece of sortedPieces) {
      ctx.save();
      ctx.translate(piece.currentX, piece.currentY);

      const tabOverflow = Math.max(pw, ph) * 0.26;

      // Create clipping path (tabs extend beyond 0,0 → pw,ph)
      drawPiecePath(ctx, piece, pw, ph);
      ctx.clip();

      // Draw image slice with tab overflow
      const srcPw = img.naturalWidth / config.cols;
      const srcPh = img.naturalHeight / config.rows;
      const srcOverflowX = tabOverflow * (img.naturalWidth / config.boardWidth);
      const srcOverflowY = tabOverflow * (img.naturalHeight / config.boardHeight);
      const sx = (piece.gridX * srcPw) - srcOverflowX;
      const sy = (piece.gridY * srcPh) - srcOverflowY;
      const sw = srcPw + srcOverflowX * 2;
      const sh = srcPh + srcOverflowY * 2;
      ctx.drawImage(img, sx, sy, sw, sh, -tabOverflow, -tabOverflow, pw + tabOverflow * 2, ph + tabOverflow * 2);

      ctx.restore();

      // Draw shadow for unplaced pieces before border
      if (!piece.isPlaced) {
        ctx.save();
        ctx.translate(piece.currentX, piece.currentY);
        drawPiecePath(ctx, piece, pw, ph);
        ctx.shadowColor = piece.id === activePieceId ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = piece.id === activePieceId ? 12 : 6;
        ctx.shadowOffsetX = piece.id === activePieceId ? 4 : 2;
        ctx.shadowOffsetY = piece.id === activePieceId ? 4 : 2;
        ctx.fillStyle = 'rgba(0,0,0,0.01)';
        ctx.fill();
        ctx.restore();
      }

      // Draw piece border
      ctx.save();
      ctx.translate(piece.currentX, piece.currentY);
      drawPiecePath(ctx, piece, pw, ph);
      if (piece.lockedBy && piece.lockedBy !== socket.id) {
        ctx.strokeStyle = piece.lockedByColor || "#f59e0b";
        ctx.lineWidth = 2.5;
      } else if (piece.id === activePieceId) {
        ctx.strokeStyle = "#818cf8";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "rgba(129, 140, 248, 0.4)";
        ctx.shadowBlur = 10;
      } else if (piece.isPlaced) {
        ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
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

        // Cursor triangle
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

        // Name label
        ctx.font = "11px system-ui";
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
  }, [pieces, activePieceId, room, cursors, socket]);

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

    // Search in reverse order (top-most first)
    for (let i = pieces.length - 1; i >= 0; i--) {
      const piece = pieces[i];
      if (piece.isPlaced) continue;
      if (
        x >= piece.currentX &&
        x <= piece.currentX + pw &&
        y >= piece.currentY &&
        y <= piece.currentY + ph
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
    dragOffset.current = {
      x: pos.x - piece.currentX,
      y: pos.y - piece.currentY,
    };
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

    // Broadcast cursor to others
    if (room) {
      socket.emit("cursor_move", { roomCode: room.code, x: pos.x, y: pos.y });
    }

    if (!isDragging.current || activePieceId === null) return;

    const newX = pos.x - dragOffset.current.x;
    const newY = pos.y - dragOffset.current.y;
    handleDragMove(activePieceId, newX, newY);
  }

  function onPointerUp(e?: React.MouseEvent) {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    if (isDragging.current && activePieceId !== null) {
      handleDragEnd(activePieceId);
    }
    isDragging.current = false;
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

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 glass-panel border-b border-white/5">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl">🧩</span>
            <span className="text-sm font-bold text-gradient hidden sm:inline">
              Piece Together
            </span>
          </Link>
          <span className="text-xs font-mono text-slate-500 bg-slate-800/60 px-2 py-1 rounded">
            {roomCode}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-400">{progressPercent}%</span>
          </div>

          {/* Timer */}
          <span className="text-sm font-mono text-slate-300">⏱ {formatTime(elapsed)}</span>

          {/* Player avatars */}
          <div className="flex -space-x-2">
            {room &&
              Object.values(room.players).map((p) => (
                <div
                  key={p.id}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 border-slate-900"
                  style={{ backgroundColor: p.color + "40" }}
                  title={p.name}
                >
                  {p.avatar}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden grid-bg cursor-crosshair"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onWheel={onWheel}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* Reference Image */}
      <div className="absolute left-3 bottom-3 group z-10">
        <button onClick={() => setShowRef(!showRef)} className="glass-panel rounded-xl p-2 text-xs text-slate-400 hover:text-white transition-all">
          🖼️ Reference
        </button>
        {showRef && (
          <div className="absolute bottom-10 left-0 glass-panel rounded-xl p-2 shadow-2xl">
            <img src={room?.config?.imageUrl} className="w-48 rounded-lg border border-white/10" />
          </div>
        )}
      </div>

      {/* Chat Sidebar */}
      <div className={`absolute right-0 top-0 bottom-0 w-72 glass-panel border-l border-white/10 flex flex-col transition-transform duration-300 z-20 ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Chat</h3>
          <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {room?.chat.map((msg) => (
            <div key={msg.id} className="text-xs">
              {msg.system ? (
                <span className="text-slate-500 italic">{msg.text}</span>
              ) : (
                <>
                  <span className="font-medium" style={{ color: msg.senderColor }}>
                    {msg.senderName}:
                  </span>{" "}
                  <span className="text-slate-300">{msg.text}</span>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-white/10 flex gap-2">
          <input
            type="text"
            placeholder="Type..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && chatInput.trim()) {
                sendChatMessage(chatInput.trim());
                setChatInput("");
              }
            }}
            className="flex-1 bg-slate-800/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>
      <button onClick={() => setChatOpen(!chatOpen)} className="absolute right-3 bottom-3 glass-panel p-3 rounded-full text-lg hover:scale-110 transition-transform z-10 shadow-lg">
        💬
      </button>

      {/* Victory Modal */}
      {isCompleted && completionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-panel rounded-3xl p-10 text-center space-y-6 max-w-md animate-[scaleIn_0.3s_ease-out]">
            <div className="text-6xl">🎉</div>
            <h2 className="text-3xl font-bold text-gradient">Puzzle Complete!</h2>
            <p className="text-slate-300">
              Solved in{" "}
              <span className="font-mono font-bold text-indigo-400">
                {formatTime(completionData.durationSeconds)}
              </span>
            </p>
            <div className="flex gap-3">
              <Link
                href="/create"
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-glow hover:scale-[1.03] transition-all"
              >
                New Puzzle
              </Link>
              <Link
                href="/"
                className="flex-1 py-3 rounded-xl font-medium text-slate-300 glass-card hover:text-white transition-all"
              >
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

  // Auto-join if we navigated here directly or refreshed
  useEffect(() => {
    if (!isConnected || hasJoined.current) return;

    if (room && room.code === roomCode) {
      hasJoined.current = true;
      return;
    }

    if (!room && !joining) {
      setJoining(true);
      hasJoined.current = true;
      joinRoom(roomCode, `Player-${Math.floor(Math.random() * 1000)}`, "🧩")
        .catch(() => {
          router.push(`/join?code=${roomCode}`);
        });
    }
  }, [isConnected, room, roomCode, router, joinRoom, joining]);

  if (!room || room.code !== roomCode) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-pulse">🧩</div>
          <p className="text-slate-400">Connecting to room...</p>
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
      <main className="flex-1 flex items-center justify-center">
        <div className="text-4xl animate-pulse">🧩</div>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen">
      <RoomContent roomCode={roomCode} />
    </main>
  );
}
