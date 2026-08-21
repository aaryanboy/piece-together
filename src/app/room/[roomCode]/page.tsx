"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRoom } from "@/context/RoomContext";
import { usePuzzleState } from "@/hooks/usePuzzleState";
import { drawPiecePath } from "@/lib/puzzleGenerator";
import { PuzzleConfig, PuzzlePieceData } from "@/types/puzzle";
import { Player } from "@/types/room";

/* ──────────────────────────────────────────────────────────
 * THEME COLOR PALETTES & TYPE DEFINITION
 * Default is NIGHT MODE (Dark Theme) per user request
 * ────────────────────────────────────────────────────────── */
interface ThemeColors {
  pageBg: string;
  boardBg: string;
  boardBorder: string;
  boardOutline: string;
  grid: string;
  matDots: string;
  cardBg: string;
  cardBorder: string;
  headerGreen: string;
  headerText: string;
  textPrimary: string;
  textMuted: string;
  accentGold: string;
  pieceBorder: string;
  pieceSeam: string;
  shadowColor: string;
  dragShadowColor: string;
}

const DARK_THEME: ThemeColors = {
  pageBg: "#0F1720",
  boardBg: "#16222F",
  boardBorder: "#253446",
  boardOutline: "rgba(244,185,66,0.22)",
  grid: "rgba(244,185,66,0.06)",
  matDots: "rgba(255,255,255,0.03)",
  cardBg: "#192533",
  cardBorder: "#26364A",
  headerGreen: "#20382E",
  headerText: "#F3F4F6",
  textPrimary: "#F3F4F6",
  textMuted: "#9CA3AF",
  accentGold: "#F59E0B",
  pieceBorder: "rgba(255,255,255,0.2)",
  pieceSeam: "rgba(0,0,0,0.45)",
  shadowColor: "rgba(0,0,0,0.35)",
  dragShadowColor: "rgba(0,0,0,0.60)",
};

const LIGHT_THEME: ThemeColors = {
  pageBg: "#F4F0E8",
  boardBg: "#EFE9DF",
  boardBorder: "#D8CEBF",
  boardOutline: "rgba(45,71,57,0.2)",
  grid: "rgba(45,71,57,0.06)",
  matDots: "rgba(45,71,57,0.03)",
  cardBg: "#FFFFFF",
  cardBorder: "#E4DCD0",
  headerGreen: "#2D4739",
  headerText: "#FFFFFF",
  textPrimary: "#1F2937",
  textMuted: "#6B7280",
  accentGold: "#D97706",
  pieceBorder: "rgba(0,0,0,0.25)",
  pieceSeam: "rgba(0,0,0,0.20)",
  shadowColor: "rgba(0,0,0,0.18)",
  dragShadowColor: "rgba(0,0,0,0.38)",
};

export default function RoomPage() {
  const { room, socket, player } = useRoom();

  const {
    pieces,
    activePieceId,
    progressPercent,
    isCompleted,
    completionData,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleFixPlacedPieces: triggerFixPieces,
  } = usePuzzleState();

  // Stable session states
  const localPlayerId = typeof window !== 'undefined' ? localStorage.getItem('piece-together-player-id') || "" : "";
  const isSpectator = !!player?.isSpectator;
  const isCompletedSelf = room?.mode === 'competitive' ? !!room?.competitiveResults?.[localPlayerId] : isCompleted;
  const isInteractive = room?.status === 'playing' && !isSpectator && !isCompletedSelf && !room?.quitPlayers?.includes(localPlayerId);

  // DEFAULT TO NIGHT MODE (Dark Theme) per user request
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const C = theme === "dark" ? DARK_THEME : LIGHT_THEME;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Pan & Zoom states
  const scaleRef = useRef(1);
  const [zoomPercent, setZoomPercent] = useState(100);
  const offsetRef = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const lastPanPos = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; scale: number; mid: { x: number; y: number }; offset: { x: number; y: number } } | null>(null);

  // Stack order, cursors & UI state
  const stackOrderRef = useRef<PuzzlePieceData[]>([]);
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number }>>({});
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false);
  const [mobileOpponentsOpen, setMobileOpponentsOpen] = useState(false);
  const [mobileLeaderboardOpen, setMobileLeaderboardOpen] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Trigger celebratory confetti on completion
  useEffect(() => {
    if (isCompletedSelf && !isSpectator) {
      import("canvas-confetti").then((mod) => {
        const confetti = mod.default;
        confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
      });
    }
  }, [isCompletedSelf, isSpectator]);

  // Audio effects
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playSnapSound = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }, [getAudioCtx]);

  // Load puzzle image
  useEffect(() => {
    if (!room?.config?.imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = room.config.imageUrl;
    img.onload = () => {
      imgRef.current = img;
      setLoadedImage(img);
      setImageLoaded(true);
    };
  }, [room?.config?.imageUrl]);

  // Initial center view — zoom out wide enough to show scattered pieces around the board
  useEffect(() => {
    if (!imageLoaded || !room?.config || !containerRef.current) return;
    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scatterPad = 400; // pieces scatter up to ~400px beyond the board edges
    const fullW = room.config.boardWidth + scatterPad * 2;
    const fullH = room.config.boardHeight + scatterPad * 2;
    scaleRef.current = Math.min((cw * 0.85) / fullW, (ch * 0.85) / fullH, 1);
    setZoomPercent(Math.round(scaleRef.current * 100));
    offsetRef.current = {
      x: cw / 2 - (room.config.boardWidth * scaleRef.current) / 2,
      y: ch / 2 - (room.config.boardHeight * scaleRef.current) / 2,
    };
  }, [imageLoaded, room?.config]);

  // Socket cursor & snap events
  useEffect(() => {
    if (!socket) return;

    const myId = typeof window !== 'undefined' ? localStorage.getItem('piece-together-player-id') : null;

    function onCursorUpdated({ playerId, x, y }: { playerId: string; x: number; y: number }) {
      if (playerId === myId) return;
      setCursors((prev) => ({ ...prev, [playerId]: { x, y } }));
    }

    function onPiecesSnapped(data: { pieceId?: number; playerId?: string }) {
      if (!data.playerId || data.playerId === myId) {
        playSnapSound();
      }
    }

    socket.on("cursor_updated", onCursorUpdated);
    socket.on("pieces_snapped", onPiecesSnapped);

    return () => {
      socket.off("cursor_updated", onCursorUpdated);
      socket.off("pieces_snapped", onPiecesSnapped);
    };
  }, [socket, playSnapSound]);

  // Canvas render loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !room?.config) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
    const matPad = 28;

    // Board background & wooden trim
    ctx.save();
    ctx.fillStyle = C.boardBorder;
    ctx.beginPath();
    ctx.roundRect(boardX - matPad - 6, boardY - matPad - 6, config.boardWidth + (matPad + 6) * 2, config.boardHeight + (matPad + 6) * 2, 24);
    ctx.fill();

    ctx.fillStyle = C.boardBg;
    ctx.beginPath();
    ctx.roundRect(boardX - matPad, boardY - matPad, config.boardWidth + matPad * 2, config.boardHeight + matPad * 2, 18);
    ctx.fill();

    ctx.fillStyle = C.matDots;
    for (let i = 0; i < config.boardWidth + matPad * 2; i += 20) {
      for (let j = 0; j < config.boardHeight + matPad * 2; j += 20) {
        if ((i + j) % 40 === 0) ctx.fillRect(boardX - matPad + i, boardY - matPad + j, 1.5, 1.5);
      }
    }
    ctx.restore();

    // Board outline dashed line
    ctx.save();
    ctx.strokeStyle = C.boardOutline;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(boardX, boardY, config.boardWidth, config.boardHeight);
    ctx.setLineDash([]);
    ctx.restore();

    // Board grid
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

    // Sort pieces: placed first, then unplaced, active piece on top
    const sortedPieces = [...pieces].sort((a, b) => {
      if (a.isPlaced !== b.isPlaced) return a.isPlaced ? -1 : 1;
      if (a.id === activePieceId) return 1;
      if (b.id === activePieceId) return -1;
      return 0;
    });
    stackOrderRef.current = sortedPieces;

    const tabOverflow = Math.max(pw, ph) * 0.26;
    const srcPw = img.naturalWidth / config.cols;
    const srcPh = img.naturalHeight / config.rows;
    const srcOverflowX = tabOverflow * (img.naturalWidth / config.boardWidth);
    const srcOverflowY = tabOverflow * (img.naturalHeight / config.boardHeight);

    // Draw pieces
    for (const piece of sortedPieces) {
      const isDraggingThis = piece.id === activePieceId;
      const isLockedOther = piece.lockedBy && piece.lockedBy !== socket?.id;

      ctx.save();
      ctx.translate(piece.currentX, piece.currentY);

      if (isDraggingThis) {
        ctx.scale(1.04, 1.04);
      }

      drawPiecePath(ctx, piece, pw, ph);
      ctx.clip();

      const sx = piece.gridX * srcPw - srcOverflowX;
      const sy = piece.gridY * srcPh - srcOverflowY;
      const sw = srcPw + srcOverflowX * 2;
      const sh = srcPh + srcOverflowY * 2;
      ctx.drawImage(img, sx, sy, sw, sh, -tabOverflow, -tabOverflow, pw + tabOverflow * 2, ph + tabOverflow * 2);
      ctx.restore();

      // Draw piece borders & realistic shadows
      ctx.save();
      ctx.translate(piece.currentX, piece.currentY);

      if (isDraggingThis) {
        ctx.scale(1.04, 1.04);
        ctx.shadowColor = C.dragShadowColor;
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;
        ctx.strokeStyle = "#FF6B4A";
        ctx.lineWidth = 2.5;
      } else if (isLockedOther) {
        ctx.strokeStyle = piece.lockedByColor || C.accentGold;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = piece.lockedByColor || C.accentGold;
        ctx.shadowBlur = 8;
      } else if (piece.isPlaced) {
        ctx.strokeStyle = C.pieceSeam;
        ctx.lineWidth = 1.2;
        ctx.shadowColor = "rgba(0,0,0,0.12)";
        ctx.shadowBlur = 2;
        ctx.shadowOffsetY = 1;
      } else {
        ctx.strokeStyle = C.pieceBorder;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = C.shadowColor;
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 4;
      }

      drawPiecePath(ctx, piece, pw, ph);
      ctx.stroke();
      ctx.restore();
    }

    // Render multiplayer cursors (only in coop)
    if (room.players && room.mode !== 'competitive') {
      for (const [pid, pos] of Object.entries(cursors)) {
        if (pid === socket?.id) continue;
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
        ctx.font = "11px system-ui, sans-serif";
        const nameWidth = ctx.measureText(p.name).width;
        ctx.fillStyle = p.color + "dd";
        ctx.beginPath();
        ctx.roundRect(12, 14, nameWidth + 10, 18, 4);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(p.name, 17, 27);
        ctx.restore();
      }
    }
  }, [pieces, activePieceId, room, cursors, socket, C]);

  useEffect(() => {
    let animId: number;
    function tick() {
      renderCanvas();
      animId = requestAnimationFrame(tick);
    }
    if (imageLoaded) {
      animId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animId);
  }, [imageLoaded, renderCanvas]);

  // Coordinate math for canvas
  function getCanvasPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
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
    const pad = 3;
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

  // Zoom with scroll wheel
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
    setZoomPercent(Math.round(newScale * 100));
    offsetRef.current.x = mx - wx * newScale;
    offsetRef.current.y = my - wy * newScale;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheelZoom, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheelZoom);
  }, []);

  // Pointer & Drag Handlers
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
    // Block picking up pieces if not interactive
    if (!isInteractive) return;

    if (piece.lockedBy && piece.lockedBy !== socket?.id) return;
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
    if (room && socket) socket.emit("cursor_move", { roomCode: room.code, x: pos.x, y: pos.y });
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
    if (isDragging.current && activePieceId !== null) handleDragEnd(activePieceId);
    isDragging.current = false;
  }

  // Touch handlers
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
      if (piece && isInteractive && !(piece.lockedBy && piece.lockedBy !== socket?.id)) {
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
      const newScale = Math.min(4, Math.max(0.25, p.scale * (d / p.dist)));
      const wx = (p.mid.x - p.offset.x) / p.scale;
      const wy = (p.mid.y - p.offset.y) / p.scale;
      scaleRef.current = newScale;
      setZoomPercent(Math.round(newScale * 100));
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

  // Timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!room?.startedAt || room.status === "completed") return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - room.startedAt!) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [room?.startedAt, room?.status]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const totalPiecesCount = pieces.length;
  const placedPiecesCount = useMemo(() => pieces.filter((p) => p.isPlaced).length, [pieces]);

  // Center view helper — same wide zoom that shows scattered pieces
  const handleCenterView = () => {
    if (room?.config && containerRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const scatterPad = 400;
      const fullW = room.config.boardWidth + scatterPad * 2;
      const fullH = room.config.boardHeight + scatterPad * 2;
      scaleRef.current = Math.min((cw * 0.85) / fullW, (ch * 0.85) / fullH, 1);
      setZoomPercent(Math.round(scaleRef.current * 100));
      offsetRef.current = {
        x: cw / 2 - (room.config.boardWidth * scaleRef.current) / 2,
        y: ch / 2 - (room.config.boardHeight * scaleRef.current) / 2,
      };
    }
  };

  const handleZoomChange = (delta: number) => {
    const newScale = Math.min(4, Math.max(0.25, scaleRef.current + delta));
    if (containerRef.current && room?.config) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const wx = (cw / 2 - offsetRef.current.x) / scaleRef.current;
      const wy = (ch / 2 - offsetRef.current.y) / scaleRef.current;
      scaleRef.current = newScale;
      setZoomPercent(Math.round(newScale * 100));
      offsetRef.current.x = cw / 2 - wx * newScale;
      offsetRef.current.y = ch / 2 - wy * newScale;
    }
  };

  const playerList = useMemo(() => (room?.players ? Object.values(room.players) : []), [room]);
  const isHost = player?.isHost;

  const handleStartGame = () => {
    if (room && socket) {
      socket.emit("start_game", { roomCode: room.code });
    }
  };

  const copyCodeToClipboard = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleFixPlacedPieces = () => {
    if (isInteractive) triggerFixPieces();
  };

  const handleQuitGame = () => {
    if (!room || !socket) return;
    const confirmQuit = window.confirm("Are you sure you want to resign from the puzzle race?");
    if (confirmQuit) {
      socket.emit("quit_game", { roomCode: room.code });
    }
  };

  const leaderboard = useMemo(() => {
    if (!room) return [];
    
    return Object.values(room.players)
      .filter(p => !p.isSpectator) // exclude spectators
      .map(p => {
        const result = room.competitiveResults?.[p.id];
        const isQuit = room.quitPlayers?.includes(p.id);
        
        let placed = 0;
        let total = room.config?.totalPieces || 0;
        
        if (p.id === localPlayerId) {
          placed = pieces.filter(pPiece => pPiece.isPlaced).length;
          total = pieces.length || total;
        } else {
          const oppPieces = room.playerPieces?.[p.id] || [];
          placed = oppPieces.filter(pPiece => pPiece.isPlaced).length;
          total = oppPieces.length || total;
        }
        
        const left = total - placed;
        const pct = total > 0 ? Math.round((placed / total) * 100) : 0;
        
        return {
          player: p,
          result,
          isQuit,
          left,
          pct,
        };
      })
      .sort((a, b) => {
        // 1. Finished players first, sorted by place
        if (a.result && !b.result) return -1;
        if (!a.result && b.result) return 1;
        if (a.result && b.result) return a.result.place - b.result.place;

        // 2. Resigned players last
        if (a.isQuit && !b.isQuit) return 1;
        if (!a.isQuit && b.isQuit) return -1;
        if (a.isQuit && b.isQuit) return 0;

        // 3. Active players sorted by remaining pieces (fewer left = higher rank)
        return a.left - b.left;
      });
  }, [room, pieces, localPlayerId]);

  const isLobby = room?.status === "lobby";

  // Loading state — room data hasn't synced from the server yet
  if (!room) {
    return (
      <div className="flex h-dvh w-full items-center justify-center" style={{ backgroundColor: "#0F1720" }}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-5xl animate-pulse">🧩</span>
          <span className="text-lg font-bold text-[#F3F4F6]">Connecting to room…</span>
          <span className="text-sm text-[#9CA3AF]">Please wait while we sync with the server.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh w-full overflow-hidden select-none" style={{ backgroundColor: C.pageBg, color: C.textPrimary }}>
      {/* ──────────────────────────────────────────────────────────
       * WAITING LOBBY VIEW (Shown when room status is 'lobby')
       * ────────────────────────────────────────────────────────── */}
      {isLobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1720]/95 backdrop-blur-md overflow-y-auto">
          <div className="flex flex-col items-center text-center w-full max-w-lg rounded-3xl border border-[#26364A] bg-[#192533] p-6 sm:p-8 shadow-2xl my-auto">
            {/* Top Game Logo */}
            <Link href="/" className="flex items-center gap-2 mb-6 hover:scale-105 transition-transform">
              <span className="text-3xl">🧩</span>
              <span className="font-display text-xl font-bold tracking-wide text-[#F3F4F6]">
                Piece Together
              </span>
            </Link>

            {/* Room Code Card */}
            <div className="w-full rounded-2xl border border-[#26364A] bg-[#0F1720] p-4 mb-6">
              <span className="text-xs uppercase font-bold tracking-widest text-[#9CA3AF]">Room Code</span>
              <div className="flex items-center justify-center gap-3 mt-1">
                <span className="font-mono text-4xl font-extrabold text-[#F59E0B] tracking-[0.25em]">
                  {room?.code}
                </span>
                <button
                  onClick={copyCodeToClipboard}
                  className="rounded-xl bg-[#20382E] px-3 py-2 text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
                >
                  {copiedCode ? "✓ Copied!" : "📋 Copy"}
                </button>
              </div>
            </div>

            {/* Puzzle Details Summary */}
            {room?.config && (
              <div className="w-full flex items-center gap-4 rounded-2xl border border-[#26364A] bg-[#16222F] p-3 mb-6">
                <div className="h-16 w-24 rounded-xl overflow-hidden border border-[#26364A] shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={room.config.imageUrl} alt="Puzzle" className="h-full w-full object-cover" />
                </div>
                <div className="text-left truncate">
                  <h3 className="font-bold text-sm text-[#F3F4F6] truncate">{room.config.imageTitle}</h3>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{room.config.cols}×{room.config.rows} ({room.config.totalPieces} Pieces)</p>
                </div>
              </div>
            )}

            {/* Game Mode Selector */}
            <div className="w-full rounded-2xl border border-[#26364A] bg-[#16222F] p-4 mb-6 text-left">
              <span className="text-xs uppercase font-bold tracking-widest text-[#9CA3AF] block mb-2.5">Game Mode</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => isHost && socket?.emit('change_mode', { roomCode: room.code, mode: 'cooperative' })}
                  disabled={!isHost || room.status !== 'lobby'}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    room.mode === 'cooperative' || !room.mode
                      ? 'bg-[#20382E] border-[#34D399] text-white font-bold'
                      : 'bg-[#0F1720] border-[#26364A] text-[#9CA3AF] hover:bg-[#16222F]/50'
                  }`}
                >
                  <span className="text-xl">🧩</span>
                  <span className="text-xs font-bold mt-1">Play Together</span>
                  <span className="text-[10px] opacity-75 mt-0.5">Shared Board</span>
                </button>
                <button
                  onClick={() => isHost && socket?.emit('change_mode', { roomCode: room.code, mode: 'competitive' })}
                  disabled={!isHost || room.status !== 'lobby'}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    room.mode === 'competitive'
                      ? 'bg-[#4C3B1C] border-[#F59E0B] text-white font-bold'
                      : 'bg-[#0F1720] border-[#26364A] text-[#9CA3AF] hover:bg-[#16222F]/50'
                  }`}
                >
                  <span className="text-xl">⚔️</span>
                  <span className="text-xs font-bold mt-1">Competition</span>
                  <span className="text-[10px] opacity-75 mt-0.5">Individual Race</span>
                </button>
              </div>
              {!isHost && (
                <p className="text-[10px] text-[#9CA3AF] mt-2 text-center">
                  * Only the Host can change the game mode.
                </p>
              )}
            </div>

            {/* Connected Players List */}
            <div className="w-full mb-8">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-3">
                <span>Players</span>
                <span>{playerList.length} / {room?.maxPlayers || 6}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {playerList.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5 rounded-xl border border-[#26364A] bg-[#16222F] p-2.5 text-left">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm border border-white/10" style={{ backgroundColor: p.color + "40" }}>
                      {p.avatar}
                    </div>
                    <div className="truncate text-xs">
                      <span className="font-semibold text-[#F3F4F6] truncate block">{p.name}</span>
                      {p.isHost && <span className="text-[10px] font-bold text-[#F59E0B]">HOST</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Start Game Action Button */}
            {isHost ? (
              <button
                onClick={handleStartGame}
                className="w-full rounded-2xl py-4 px-8 text-lg font-extrabold text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: "#20382E" }}
              >
                🎮 Start Game
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sm font-semibold text-[#F59E0B] animate-pulse">
                <span>⏳</span> Waiting for host to start game…
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
       * LEFT SIDEBAR PANEL (Desktop + Mobile Drawer)
       * ────────────────────────────────────────────────────────── */}
      <div
        className={`z-30 flex flex-col gap-4 p-5 transition-transform duration-300 ${
          mobileStatsOpen ? "fixed inset-y-0 left-0 w-80 shadow-2xl translate-x-0" : "hidden sm:flex sm:w-80 sm:relative sm:translate-x-0"
        }`}
        style={{ backgroundColor: C.pageBg }}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between sm:hidden pb-1 border-b" style={{ borderColor: C.cardBorder }}>
          <span className="text-xs font-bold uppercase tracking-wider">Puzzle Details</span>
          <button onClick={() => setMobileStatsOpen(false)} className="text-sm font-bold px-2 py-1">✕</button>
        </div>

        {/* Game Brand Logo Header */}
        <Link href="/" className="flex items-center gap-2 rounded-2xl p-4 shadow-sm transition-transform hover:scale-[1.02]" style={{ backgroundColor: C.headerGreen, color: C.headerText }}>
          <span className="text-2xl">🧩</span>
          <div className="flex flex-col text-left">
            <span className="font-display text-base font-bold tracking-wide leading-none">Piece Together</span>
          </div>
        </Link>

        {/* Stats Card: Pieces */}
        <div className="flex items-center justify-between rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: C.textMuted }}>Pieces</span>
            <div className="mt-1 text-2xl font-bold font-mono">
              {placedPiecesCount} <span className="text-sm font-normal" style={{ color: C.textMuted }}>/ {totalPiecesCount}</span>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: C.pageBg, color: C.textPrimary }}>
            🧩
          </div>
        </div>

        {/* Stats Card: Time */}
        <div className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
          <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: C.textMuted }}>Time</span>
          <div className="mt-1 text-2xl font-bold font-mono">
            {formatTime(elapsed)}
          </div>
        </div>

        {/* Stats Card: Progress */}
        <div className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider" style={{ color: C.textMuted }}>
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: C.pageBg }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%`, backgroundColor: C.headerGreen }} />
          </div>
        </div>

        {/* Resign / Quit Button for Competitive Mode */}
        {room?.mode === 'competitive' && room.status === 'playing' && !isSpectator && !isCompletedSelf && !room.quitPlayers?.includes(localPlayerId) && (
          <button
            onClick={handleQuitGame}
            className="rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 hover:scale-[1.02] active:scale-[0.98] py-3.5 px-4 text-xs font-bold text-red-400 transition-all shadow-sm w-full mt-1.5"
          >
            🏳️ Resign from Race
          </button>
        )}

        {/* Preview Thumbnail Card */}
        {room?.config?.imageUrl && (
          <div className="flex flex-col gap-2 rounded-2xl border p-3 shadow-sm" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
            <span className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: C.textMuted }}>Preview</span>
            <div className="aspect-video w-full overflow-hidden rounded-xl border" style={{ borderColor: C.cardBorder }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={room.config.imageUrl} alt="Puzzle preview" className="h-full w-full object-cover" />
            </div>
          </div>
        )}

        {/* Bottom Nav Bar (ONLY ONE FIX BUTTON in app) */}
        <div className="mt-auto flex items-center justify-around rounded-2xl border p-2 shadow-sm" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
          <Link href="/" className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5">
            <span>🏠</span> Home
          </Link>
          <button onClick={() => setShowRef((v) => !v)} className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5">
            <span>🖼️</span> Gallery
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
       * CENTER CANVAS CONTAINER (Competitive or Cooperative)
       * ────────────────────────────────────────────────────────── */}
      {room?.mode === 'competitive' ? (
        <div className="flex-1 flex h-full w-full overflow-hidden">
          {/* Main player workspace (left side) */}
          <div ref={containerRef} className="relative flex-1 h-full overflow-hidden border-r border-[#26364A]">
            <canvas
              ref={canvasRef}
              className="h-full w-full touch-none cursor-grab active:cursor-grabbing"
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

            {/* Leaderboard HUD (Desktop only) */}
            <div className="absolute top-4 left-4 z-20 hidden sm:flex flex-col gap-2 rounded-2xl border p-3 shadow-md bg-[#192533]/90 border-[#26364A] backdrop-blur-md w-60">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A96AE] flex items-center justify-between">
                <span>🏆 Leaderboard</span>
                {room.status === 'playing' && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px]">RACE ACTIVE</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5 mt-1 max-h-48 overflow-y-auto">
                {leaderboard.map((item, idx) => (
                  <div key={item.player.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[#F59E0B] font-bold w-4 text-right">
                        {item.result ? `#${item.result.place}` : `${idx + 1}`}
                      </span>
                      <span className="truncate max-w-25 font-semibold" style={{ color: item.player.color }}>
                        {item.player.name}
                        {item.player.id === localPlayerId && " (You)"}
                      </span>
                      {item.player.isOffline && <span className="text-[8px] px-1 rounded bg-red-500/20 text-red-400 font-mono">offline</span>}
                    </div>
                    <span className="font-mono text-[10px] font-bold text-right shrink-0">
                      {item.result ? (
                        <span className="text-amber-400">Done ({item.result.durationSeconds}s)</span>
                      ) : item.isQuit ? (
                        <span className="text-red-400">Resigned</span>
                      ) : (
                        <span style={{ color: item.player.color }}>Left: {item.left}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Leaderboard Drawer */}
            {mobileLeaderboardOpen && (
              <div className="absolute inset-0 z-30 sm:hidden bg-[#0F1720]/60 backdrop-blur-sm flex items-start justify-center pt-16 px-4">
                <div className="w-full max-w-sm rounded-2xl border border-[#26364A] bg-[#192533]/95 shadow-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8A96AE]">🏆 Leaderboard</span>
                    <button onClick={() => setMobileLeaderboardOpen(false)} className="text-sm font-bold px-2 py-1 rounded hover:bg-white/5">✕</button>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
                    {leaderboard.map((item, idx) => (
                      <div key={item.player.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[#F59E0B] font-bold w-4 text-right">
                            {item.result ? `#${item.result.place}` : `${idx + 1}`}
                          </span>
                          <span className="truncate max-w-32 font-semibold" style={{ color: item.player.color }}>
                            {item.player.name}
                            {item.player.id === localPlayerId && " (You)"}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-right shrink-0">
                          {item.result ? (
                            <span className="text-amber-400">Done ({item.result.durationSeconds}s)</span>
                          ) : item.isQuit ? (
                            <span className="text-red-400">Resigned</span>
                          ) : (
                            <span style={{ color: item.player.color }}>Left: {item.left}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Spectator HUD notice */}
            {isSpectator && (
              <div className="absolute top-16 left-4 z-20 rounded-xl px-3 py-1.5 text-xs font-bold bg-[#16222F]/90 border border-[#26364A] text-[#9CA3AF] shadow-md">
                👁️ Spectating Game
              </div>
            )}

            {/* Locked finished self overlay */}
            {isCompletedSelf && !isSpectator && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-[#0F1720]/45 backdrop-blur-xs pointer-events-none">
                <div className="pointer-events-auto rounded-3xl border border-[#26364A] bg-[#192533]/95 p-6 shadow-2xl text-center max-w-sm">
                  <div className="text-4xl mb-2">🏆</div>
                  <h3 className="text-lg font-bold text-[#F3F4F6] mb-1">Board Completed!</h3>
                  <p className="text-xs text-[#9CA3AF] mb-3">
                    You finished in <span className="font-semibold text-[#F59E0B]">place #{room.competitiveResults?.[localPlayerId]?.place}</span>!
                  </p>
                  <p className="text-[11px] text-[#8A96AE]">
                    Feel free to pan around your board or watch other players finish in real-time.
                  </p>
                </div>
              </div>
            )}
            
            {/* Spectator overlay */}
            {isSpectator && (
              <div className="absolute inset-x-0 bottom-16 z-10 flex justify-center p-4 pointer-events-none">
                <div className="pointer-events-auto rounded-full border border-[#26364A] bg-[#192533]/90 px-4 py-2 shadow-lg text-center text-xs font-bold text-[#9CA3AF]">
                  👁️ You are spectating this puzzle race.
                </div>
              </div>
            )}

            {/* Mobile top action row */}
            <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between sm:hidden">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setMobileStatsOpen(true)}
                  className="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold shadow-md backdrop-blur-md"
                  style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}
                >
                  📊
                </button>
                <button
                  onClick={() => setMobileLeaderboardOpen(true)}
                  className="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold shadow-md backdrop-blur-md"
                  style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}
                >
                  🏆
                </button>
                <button
                  onClick={() => setMobileOpponentsOpen(true)}
                  className="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold shadow-md backdrop-blur-md"
                  style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}
                >
                  👥
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleFixPlacedPieces}
                  className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold text-white shadow-md transition-transform active:scale-95"
                  style={{ backgroundColor: C.headerGreen }}
                >
                  ✨
                </button>
                <button
                  onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                  className="flex h-9 w-9 items-center justify-center rounded-full border shadow-md"
                  style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}
                >
                  {theme === "dark" ? "☀️" : "🌙"}
                </button>
              </div>
            </div>

            {/* TOP CENTER HUD TIMER PILL (Desktop) */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-3 rounded-full border px-5 py-2 shadow-md backdrop-blur-md" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
                <span className="font-mono text-base font-bold">{formatTime(elapsed)}</span>
                <div className="h-4 w-px bg-current opacity-20" />
                <span className="text-xs font-semibold font-mono" style={{ color: C.textMuted }}>{progressPercent}%</span>
              </div>

              <button
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                className="flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition-transform hover:scale-105"
                style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}
                title="Toggle theme"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            </div>

            {/* RIGHT SIDEBAR ASSISTANT CARD ("Piece Snap & Single Error Fixer") */}
            <div className="absolute top-4 right-4 z-20 hidden md:flex flex-col gap-3 w-64 rounded-2xl border p-4 shadow-lg backdrop-blur-md" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.textPrimary }}>Piece Snap</span>

              <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>
                Pieces snap automatically when placed close to their target or neighboring pieces.
              </p>

              <button
                onClick={handleFixPlacedPieces}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: C.headerGreen }}
                title="Automatically check and snap misaligned or stuck pieces into place"
              >
                <span>✨</span> Fix Misaligned Pieces
              </button>
            </div>

            {/* BOTTOM FLOATING CONTROL BAR (Reference, Center, Zoom) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-3 rounded-full border px-3 py-2 sm:px-4 shadow-lg backdrop-blur-md max-w-[94vw] overflow-x-auto" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
              <button
                onClick={() => setShowRef((v) => !v)}
                className="flex items-center gap-1 sm:gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span>🖼️</span> Ref
              </button>

              <button
                onClick={handleCenterView}
                className="flex items-center gap-1 sm:gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span>🎯</span> Center
              </button>

              <div className="h-4 w-px bg-current opacity-20" />

              {/* Zoom controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs font-bold">
                <button
                  onClick={() => handleZoomChange(-0.15)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ borderColor: C.cardBorder }}
                >
                  −
                </button>
                <span className="w-9 sm:w-10 text-center">{zoomPercent}%</span>
                <button
                  onClick={() => handleZoomChange(0.15)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ borderColor: C.cardBorder }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Reference Image Modal */}
            {showRef && room?.config?.imageUrl && (
              <div className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-2xl border p-3 shadow-2xl backdrop-blur-md max-w-[90vw]" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
                <div className="flex items-center justify-between pb-2 border-b mb-2" style={{ borderColor: C.cardBorder }}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.textPrimary }}>Reference Image</span>
                  <button onClick={() => setShowRef(false)} className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5">✕</button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={room.config.imageUrl} alt="Reference" className="max-h-60 max-w-xs sm:max-w-sm rounded-xl object-contain" />
              </div>
            )}
          </div>

          {/* Opponents column (right side) — Desktop only */}
          {room.playerPieces && Object.keys(room.playerPieces).filter(pid => pid !== localPlayerId).length > 0 ? (
            <div className="hidden sm:flex w-64 sm:w-72 md:w-80 flex-col gap-4 overflow-y-auto p-4 bg-[#16222F]/40 border-l border-[#26364A] shrink-0">
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: C.cardBorder }}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8A96AE]">Opponent Feeds</h3>
                <span className="text-[10px] font-mono text-[#8A96AE]">{Object.keys(room.playerPieces).filter(pid => pid !== localPlayerId).length} active</span>
              </div>
              <div className="flex flex-col gap-4">
                {Object.keys(room.playerPieces).map(pid => {
                  if (pid === localPlayerId) return null;
                  const p = room.players[pid];
                  if (!p || p.isSpectator) return null;
                  return (
                    <OpponentMiniBoard
                      key={pid}
                      playerId={pid}
                      player={p}
                      config={room.config}
                      image={loadedImage}
                      themeColors={C}
                      result={room.competitiveResults?.[pid]}
                      isQuit={room.quitPlayers?.includes(pid)}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex w-64 sm:w-72 md:w-80 flex-col items-center justify-center p-6 bg-[#16222F]/20 border-l border-[#26364A] shrink-0 text-center text-xs text-[#9CA3AF] italic">
              No active opponents in race
            </div>
          )}

          {/* Mobile Opponents Drawer */}
          {mobileOpponentsOpen && (
            <div className="absolute inset-0 z-30 sm:hidden bg-[#0F1720]/60 backdrop-blur-sm flex items-start justify-center pt-16 px-4">
              <div className="w-full max-w-sm rounded-2xl border border-[#26364A] bg-[#192533]/95 shadow-2xl p-4 max-h-[70vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8A96AE]">👥 Opponent Feeds</span>
                  <button onClick={() => setMobileOpponentsOpen(false)} className="text-sm font-bold px-2 py-1 rounded hover:bg-white/5">✕</button>
                </div>
                <div className="flex flex-col gap-4">
                  {Object.keys(room.playerPieces || {}).map(pid => {
                    if (pid === localPlayerId) return null;
                    const p = room.players[pid];
                    if (!p || p.isSpectator) return null;
                    return (
                      <OpponentMiniBoard
                        key={pid}
                        playerId={pid}
                        player={p}
                        config={room.config}
                        image={loadedImage}
                        themeColors={C}
                        result={room.competitiveResults?.[pid]}
                        isQuit={room.quitPlayers?.includes(pid)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div ref={containerRef} className="relative flex-1 h-full overflow-hidden">
          <canvas
            ref={canvasRef}
            className="h-full w-full touch-none cursor-grab active:cursor-grabbing"
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

          {/* Mobile top action row */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between sm:hidden">
            <button
              onClick={() => setMobileStatsOpen(true)}
              className="flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold shadow-md backdrop-blur-md"
              style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}
            >
              📊 Details
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFixPlacedPieces}
                className="flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-bold text-white shadow-md transition-transform active:scale-95"
                style={{ backgroundColor: C.headerGreen }}
              >
                ✨ Fix Board
              </button>
              <button
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                className="flex h-9 w-9 items-center justify-center rounded-full border shadow-md"
                style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            </div>
          </div>

          {/* TOP CENTER HUD TIMER PILL (Desktop) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-3 rounded-full border px-5 py-2 shadow-md backdrop-blur-md" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
              <span className="font-mono text-base font-bold">{formatTime(elapsed)}</span>
              <div className="h-4 w-px bg-current opacity-20" />
              <span className="text-xs font-semibold font-mono" style={{ color: C.textMuted }}>{progressPercent}%</span>
            </div>

            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition-transform hover:scale-105"
              style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}
              title="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>

          {/* RIGHT SIDEBAR ASSISTANT CARD ("Piece Snap & Single Error Fixer") */}
          <div className="absolute top-4 right-4 z-20 hidden md:flex flex-col gap-3 w-64 rounded-2xl border p-4 shadow-lg backdrop-blur-md" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.textPrimary }}>Piece Snap</span>

            <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>
              Pieces snap automatically when placed close to their target or neighboring pieces.
            </p>

            <button
              onClick={handleFixPlacedPieces}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: C.headerGreen }}
              title="Automatically check and snap misaligned or stuck pieces into place"
            >
              <span>✨</span> Fix Misaligned Pieces
            </button>
          </div>

          {/* BOTTOM FLOATING CONTROL BAR (Reference, Center, Zoom) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-3 rounded-full border px-3 py-2 sm:px-4 shadow-lg backdrop-blur-md max-w-[94vw] overflow-x-auto" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
            <button
              onClick={() => setShowRef((v) => !v)}
              className="flex items-center gap-1 sm:gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              <span>🖼️</span> Ref
            </button>

            <button
              onClick={handleCenterView}
              className="flex items-center gap-1 sm:gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              <span>🎯</span> Center
            </button>

            <div className="h-4 w-px bg-current opacity-20" />

            {/* Zoom controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs font-bold">
              <button
                onClick={() => handleZoomChange(-0.15)}
                className="flex h-7 w-7 items-center justify-center rounded-full border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: C.cardBorder }}
              >
                −
              </button>
              <span className="w-9 sm:w-10 text-center">{zoomPercent}%</span>
              <button
                onClick={() => handleZoomChange(0.15)}
                className="flex h-7 w-7 items-center justify-center rounded-full border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: C.cardBorder }}
              >
                +
              </button>
            </div>
          </div>

          {/* Reference Image Modal */}
          {showRef && room?.config?.imageUrl && (
            <div className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-2xl border p-3 shadow-2xl backdrop-blur-md max-w-[90vw]" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
              <div className="flex items-center justify-between pb-2 border-b mb-2" style={{ borderColor: C.cardBorder }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.textPrimary }}>Reference Image</span>
                <button onClick={() => setShowRef(false)} className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5">✕</button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={room.config.imageUrl} alt="Reference" className="max-h-60 max-w-xs sm:max-w-sm rounded-xl object-contain" />
            </div>
          )}
        </div>
      )}

      {/* Completion Modal */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex flex-col items-center text-center rounded-3xl border p-8 shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-300" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ color: C.textPrimary }}>Puzzle Completed!</h2>
            {room?.mode === 'competitive' ? (
              <div className="w-full flex flex-col gap-2 mb-6 text-left mt-3">
                <span className="text-xs uppercase font-bold tracking-widest text-[#9CA3AF] block border-b pb-1.5 mb-1" style={{ borderColor: C.cardBorder }}>Final Results</span>
                {leaderboard.map((item, idx) => (
                  <div key={item.player.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[#F59E0B] font-extrabold w-5 text-right font-mono">
                        {item.result ? `#${item.result.place}` : `${idx + 1}`}
                      </span>
                      <span className="font-bold text-[#F3F4F6] truncate max-w-35" style={{ color: item.player.color }}>
                        {item.player.name}
                        {item.player.id === localPlayerId && " (You)"}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-semibold">
                      {item.result ? (
                        <span className="text-amber-400 font-bold">{item.result.durationSeconds}s</span>
                      ) : item.isQuit ? (
                        <span className="text-red-400">Resigned</span>
                      ) : (
                        <span className="text-gray-400">Unfinished</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm mb-6" style={{ color: C.textMuted }}>
                Congratulations! You completed the puzzle in <span className="font-semibold font-mono">{completionData ? formatTime(completionData.durationSeconds) : formatTime(elapsed)}</span>.
              </p>
            )}
            <div className="flex gap-3 w-full">
              <Link href="/" className="flex-1 rounded-xl py-3.5 text-sm font-bold text-center text-white shadow-md transition-transform hover:scale-105" style={{ backgroundColor: C.headerGreen }}>
                Return Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * OPPONENT MINI-BOARD CANVAS RENDER COMPONENT
 * ────────────────────────────────────────────────────────── */
interface OpponentMiniBoardProps {
  playerId: string;
  player: Player;
  config: PuzzleConfig | null;
  image: HTMLImageElement | null;
  themeColors: ThemeColors;
  result?: { finishedAt: number; durationSeconds: number; place: number };
  isQuit?: boolean;
}

function OpponentMiniBoard({
  playerId,
  player,
  config,
  image,
  themeColors,
  result,
  isQuit,
}: OpponentMiniBoardProps) {
  const { socket, room } = useRoom();
  const [pieces, setPieces] = useState<PuzzlePieceData[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync initial board pieces from room
  useEffect(() => {
    const initial = room?.playerPieces?.[playerId];
    if (initial && initial.length > 0) {
      const timer = setTimeout(() => {
        setPieces(initial);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [room?.playerPieces, playerId]);

  // Subscribe to real-time socket events for this opponent board
  useEffect(() => {
    if (!socket) return;

    function onPieceLocked(data: { pieceId: number; lockedBy: string; lockedByName: string; lockedByColor: string; playerId?: string }) {
      if (data.playerId !== playerId) return;
      setPieces((prev) =>
        prev.map((p) => {
          if (p.id === data.pieceId || (p.groupId && p.groupId === prev.find((item) => item.id === data.pieceId)?.groupId)) {
            return { ...p, lockedBy: data.lockedBy, lockedByName: data.lockedByName, lockedByColor: data.lockedByColor };
          }
          return p;
        })
      );
    }

    function onPieceUnlocked(data: { pieceId: number; playerId?: string }) {
      if (data.playerId !== playerId) return;
      setPieces((prev) =>
        prev.map((p) => {
          if (p.id === data.pieceId || (p.groupId && p.groupId === prev.find((item) => item.id === data.pieceId)?.groupId)) {
            return { ...p, lockedBy: null, lockedByName: null, lockedByColor: null };
          }
          return p;
        })
      );
    }

    function onPieceMoved(data: { pieceId: number; x: number; y: number; playerId?: string }) {
      if (data.playerId !== playerId) return;
      setPieces((prev) => {
        const target = prev.find((p) => p.id === data.pieceId);
        if (!target || target.isPlaced) return prev;

        return prev.map((p) => {
          if (p.groupId && p.groupId === target.groupId) {
            return {
              ...p,
              currentX: data.x + (p.targetX - target.targetX),
              currentY: data.y + (p.targetY - target.targetY),
            };
          }
          if (p.id === data.pieceId) {
            return { ...p, currentX: data.x, currentY: data.y };
          }
          return p;
        });
      });
    }

    function onPiecesSnapped(data: {
      anchorPieceId: number;
      pieceIds: number[];
      targetX: number;
      targetY: number;
      groupId: number;
      isPlaced: boolean;
      progressPercent: number;
      playerId?: string;
      pieces?: PuzzlePieceData[];
    }) {
      if (data.playerId !== playerId) return;

      setPieces((prev) => {
        if (data.pieces && data.pieces.length > 0) {
          return prev.map((p) => {
            const match = data.pieces!.find((s) => s.id === p.id);
            if (match) {
              return {
                ...p,
                ...match,
                lockedBy: null,
                lockedByName: null,
                lockedByColor: null,
              };
            }
            return p;
          });
        }

        const anchor = prev.find((p) => p.id === data.anchorPieceId) || prev.find((p) => data.pieceIds.includes(p.id));
        if (!anchor) return prev;

        return prev.map((p) => {
          if (data.pieceIds.includes(p.id) || (p.groupId && data.pieceIds.some((id) => prev.find((item) => item.id === id)?.groupId === p.groupId))) {
            return {
              ...p,
              currentX: data.isPlaced ? p.targetX : data.targetX + (p.targetX - anchor.targetX),
              currentY: data.isPlaced ? p.targetY : data.targetY + (p.targetY - anchor.targetY),
              groupId: data.groupId,
              isPlaced: data.isPlaced,
              lockedBy: null,
              lockedByName: null,
              lockedByColor: null,
            };
          }
          return p;
        });
      });
    }

    function onSnapRejected(data: { pieceIds: number[]; reason: string; playerId?: string; pieces: PuzzlePieceData[] }) {
      if (data.playerId !== playerId) return;
      setPieces((prev) =>
        prev.map((p) => {
          const match = data.pieces.find((u) => u.id === p.id);
          if (match) {
            return { ...p, ...match };
          }
          return p;
        })
      );
    }

    socket.on('piece_locked', onPieceLocked);
    socket.on('piece_unlocked', onPieceUnlocked);
    socket.on('piece_moved', onPieceMoved);
    socket.on('pieces_snapped', onPiecesSnapped);
    socket.on('snap_rejected', onSnapRejected);

    return () => {
      socket.off('piece_locked', onPieceLocked);
      socket.off('piece_unlocked', onPieceUnlocked);
      socket.off('piece_moved', onPieceMoved);
      socket.off('pieces_snapped', onPiecesSnapped);
      socket.off('snap_rejected', onSnapRejected);
    };
  }, [socket, playerId]);

  // Redraw mini canvas whenever state updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !config || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const margin = 80;
    const fitWidth = config.boardWidth + margin * 2;
    const fitHeight = config.boardHeight + margin * 2;
    const scale = Math.min(rect.width / fitWidth, rect.height / fitHeight);

    const offsetX = (rect.width - config.boardWidth * scale) / 2;
    const offsetY = (rect.height - config.boardHeight * scale) / 2;

    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offsetX * dpr, offsetY * dpr);

    // Wooden Trim board background
    ctx.save();
    ctx.fillStyle = themeColors.boardBorder;
    ctx.beginPath();
    ctx.roundRect(-20, -20, config.boardWidth + 40, config.boardHeight + 40, 16);
    ctx.fill();

    ctx.fillStyle = themeColors.boardBg;
    ctx.beginPath();
    ctx.roundRect(-10, -10, config.boardWidth + 20, config.boardHeight + 20, 12);
    ctx.fill();
    ctx.restore();

    // Board outline
    ctx.save();
    ctx.strokeStyle = themeColors.boardOutline;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, config.boardWidth, config.boardHeight);
    ctx.restore();

    // Draw opponent board grid
    const pw = config.boardWidth / config.cols;
    const ph = config.boardHeight / config.rows;
    ctx.save();
    ctx.strokeStyle = themeColors.grid;
    ctx.lineWidth = 1;
    for (let r = 1; r < config.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * ph);
      ctx.lineTo(config.boardWidth, r * ph);
      ctx.stroke();
    }
    for (let c = 1; c < config.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * pw, 0);
      ctx.lineTo(c * pw, config.boardHeight);
      ctx.stroke();
    }
    ctx.restore();

    // Draw pieces
    if (pieces.length > 0) {
      const tabOverflow = Math.max(pw, ph) * 0.26;
      const srcPw = image.naturalWidth / config.cols;
      const srcPh = image.naturalHeight / config.rows;
      const srcOverflowX = tabOverflow * (image.naturalWidth / config.boardWidth);
      const srcOverflowY = tabOverflow * (image.naturalHeight / config.boardHeight);

      // Sort: placed pieces first
      const sorted = [...pieces].sort((a, b) => (a.isPlaced === b.isPlaced ? 0 : a.isPlaced ? -1 : 1));

      for (const piece of sorted) {
        ctx.save();
        ctx.translate(piece.currentX, piece.currentY);
        drawPiecePath(ctx, piece, pw, ph);
        ctx.clip();
        const sx = piece.gridX * srcPw - srcOverflowX;
        const sy = piece.gridY * srcPh - srcOverflowY;
        const sw = srcPw + srcOverflowX * 2;
        const sh = srcPh + srcOverflowY * 2;
        ctx.drawImage(image, sx, sy, sw, sh, -tabOverflow, -tabOverflow, pw + tabOverflow * 2, ph + tabOverflow * 2);
        ctx.restore();

        // Border seam
        ctx.save();
        ctx.translate(piece.currentX, piece.currentY);
        ctx.strokeStyle = piece.isPlaced ? themeColors.pieceSeam : themeColors.pieceBorder;
        ctx.lineWidth = piece.isPlaced ? 1.0 : 1.4;
        drawPiecePath(ctx, piece, pw, ph);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [pieces, config, image, themeColors]);

  const pct = useMemo(() => {
    const placed = pieces.filter(p => p.isPlaced).length;
    const total = pieces.length || 1;
    return Math.round((placed / total) * 100);
  }, [pieces]);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border p-3 bg-[#192533] border-[#26364A] shadow-md relative overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: player.color + "40", border: `1px solid ${player.color}`, color: player.color }}>
            {player.avatar}
          </div>
          <span className="font-bold text-[#F3F4F6] truncate max-w-30">{player.name}</span>
          {player.isOffline && <span className="text-[10px] text-red-400 animate-pulse font-mono">OFFLINE</span>}
        </div>
        <div className="flex items-center gap-1.5 font-bold">
          {result ? (
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] border border-amber-500/30">
              🏆 #{result.place} ({result.durationSeconds}s)
            </span>
          ) : isQuit ? (
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] border border-red-500/30">
              🏳️ Resigned
            </span>
          ) : (
            <span className="font-mono text-[#F59E0B]">{pct}%</span>
          )}
        </div>
      </div>

      {/* Mini canvas */}
      <div className="w-full aspect-4/3 rounded-xl overflow-hidden bg-[#0F1720] border border-[#26364A]">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Progress bar */}
      {!result && !isQuit && (
        <div className="h-1.5 w-full bg-[#0F1720] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: player.color }} />
        </div>
      )}
    </div>
  );
}