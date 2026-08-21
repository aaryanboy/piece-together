"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { drawPiecePath, generatePuzzlePieces } from "@/lib/puzzleGenerator";
import { PRESET_IMAGES, DIFFICULTY_PRESETS, SNAP_DISTANCE_THRESHOLD } from "@/lib/constants";
import { PuzzleConfig, PuzzlePieceData } from "@/types/puzzle";

const DIFFICULTY_NAMES = ["Easy", "Medium", "Hard", "Extreme", "Insane"];

function difficultyName(index: number) {
  return DIFFICULTY_NAMES[index] ?? DIFFICULTY_NAMES[DIFFICULTY_NAMES.length - 1];
}

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

export default function SoloPage() {
  const [selectedImage, setSelectedImage] = useState(PRESET_IMAGES[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTY_PRESETS[1]);
  const [gameStarted, setGameStarted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const C = DARK_THEME;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [pieces, setPieces] = useState<PuzzlePieceData[]>([]);
  const [activePieceId, setActivePieceId] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showRef, setShowRef] = useState(false);
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false);

  const piecesRef = useRef<PuzzlePieceData[]>([]);

  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);

  // Pan & Zoom states
  const scaleRef = useRef(1);
  const [zoomPercent, setZoomPercent] = useState(100);
  const offsetRef = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const lastPanPos = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; scale: number; mid: { x: number; y: number }; offset: { x: number; y: number } } | null>(null);
  const stackOrderRef = useRef<PuzzlePieceData[]>([]);

  const config: PuzzleConfig = useMemo(() => ({
    rows: selectedDifficulty.rows,
    cols: selectedDifficulty.cols,
    totalPieces: selectedDifficulty.total,
    imageUrl: selectedImage.url,
    imageTitle: selectedImage.title,
    imageWidth: 1200,
    imageHeight: 800,
    boardWidth: 800,
    boardHeight: 560,
  }), [selectedDifficulty, selectedImage]);

  // Load puzzle image
  useEffect(() => {
    if (!config.imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = config.imageUrl;
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
  }, [config.imageUrl]);

  // Start game
  const handleStartGame = () => {
    const newPieces = generatePuzzlePieces(config);
    setPieces(newPieces);
    setProgressPercent(0);
    setIsCompleted(false);
    setElapsed(0);
    setGameStarted(true);
    setImageLoaded(false);
    imgRef.current = null;

    // Reload image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = config.imageUrl;
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
  };

  // Timer
  useEffect(() => {
    if (!gameStarted || isCompleted) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [gameStarted, isCompleted]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Initial center view
  useEffect(() => {
    if (!imageLoaded || !containerRef.current) return;
    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scatterPad = 400;
    const fullW = config.boardWidth + scatterPad * 2;
    const fullH = config.boardHeight + scatterPad * 2;
    scaleRef.current = Math.min((cw * 0.85) / fullW, (ch * 0.85) / fullH, 1);
    setZoomPercent(Math.round(scaleRef.current * 100));
    offsetRef.current = {
      x: cw / 2 - (config.boardWidth * scaleRef.current) / 2,
      y: ch / 2 - (config.boardHeight * scaleRef.current) / 2,
    };
  }, [imageLoaded, config]);

  // Canvas render loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    // Sort pieces
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

      // Draw piece borders
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
  }, [pieces, activePieceId, config, C]);

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

  // Coordinate math
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
    const pw = config.boardWidth / config.cols;
    const ph = config.boardHeight / config.rows;
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

  // Pointer handlers
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
    if (isCompleted) return;
    isDragging.current = true;
    dragOffset.current = { x: pos.x - piece.currentX, y: pos.y - piece.currentY };
    setActivePieceId(piece.id);
  }

  function onPointerMove(e: React.MouseEvent) {
    if (isPanning.current) {
      offsetRef.current.x += e.clientX - lastPanPos.current.x;
      offsetRef.current.y += e.clientY - lastPanPos.current.y;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const pos = getCanvasPos(e);
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
      if (piece && !isCompleted) {
        isDragging.current = true;
        dragOffset.current = { x: wx - piece.currentX, y: wy - piece.currentY };
        setActivePieceId(piece.id);
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

  // Drag move
  const handleDragMove = useCallback((pieceId: number, x: number, y: number) => {
    if (activePieceId !== pieceId) return;
    setPieces((prev) => {
      const target = prev.find((p) => p.id === pieceId);
      if (!target || target.isPlaced) return prev;

      return prev.map((p) => {
        if (p.groupId && p.groupId === target.groupId) {
          return {
            ...p,
            currentX: x + (p.targetX - target.targetX),
            currentY: y + (p.targetY - target.targetY),
          };
        }
        if (p.id === pieceId) {
          return { ...p, currentX: x, currentY: y };
        }
        return p;
      });
    });
  }, [activePieceId]);

  // Drag end with snap logic
  const handleDragEnd = useCallback((pieceId: number) => {
    if (activePieceId !== pieceId) return;
    setActivePieceId(null);

    const allPieces = piecesRef.current;
    const activePiece = allPieces.find((p) => p.id === pieceId);
    if (!activePiece || activePiece.isPlaced) return;

    const activeGroup = allPieces.filter((p) => p.groupId === activePiece.groupId || p.id === pieceId);

    // Check distance to target spot on board
    const distToTarget = Math.hypot(activePiece.currentX - activePiece.targetX, activePiece.currentY - activePiece.targetY);

    if (distToTarget <= SNAP_DISTANCE_THRESHOLD) {
      const groupPieceIds = activeGroup.map((p) => p.id);
      setPieces((prev) =>
        prev.map((p) => {
          if (groupPieceIds.includes(p.id)) {
            return {
              ...p,
              currentX: p.targetX,
              currentY: p.targetY,
              isPlaced: true,
              lockedBy: null,
              lockedByName: null,
              lockedByColor: null,
            };
          }
          return p;
        })
      );

      // Check completion
      const placedCount = allPieces.filter((p) => groupPieceIds.includes(p.id) || p.isPlaced).length;
      const totalCount = allPieces.length;
      setProgressPercent(Math.round((placedCount / totalCount) * 100));
      if (placedCount === totalCount) {
        setIsCompleted(true);
      }
      return;
    }

    // Check distance to neighboring pieces for group snapping
    let mergedNeighbor: PuzzlePieceData | null = null;
    let snapAnchorPiece: PuzzlePieceData | null = null;
    let minNeighborDist = Infinity;

    for (const pA of activeGroup) {
      for (const pB of allPieces) {
        if (pB.id === pA.id || pB.groupId === pA.groupId) continue;

        const isNeighbor =
          (Math.abs(pB.gridX - pA.gridX) === 1 && pB.gridY === pA.gridY) ||
          (Math.abs(pB.gridY - pA.gridY) === 1 && pB.gridX === pA.gridX);

        if (isNeighbor) {
          const expectedOffsetX = pA.targetX - pB.targetX;
          const expectedOffsetY = pA.targetY - pB.targetY;
          const actualOffsetX = pA.currentX - pB.currentX;
          const actualOffsetY = pA.currentY - pB.currentY;
          const dist = Math.hypot(actualOffsetX - expectedOffsetX, actualOffsetY - expectedOffsetY);

          if (dist <= SNAP_DISTANCE_THRESHOLD && dist < minNeighborDist) {
            minNeighborDist = dist;
            mergedNeighbor = pB;
            snapAnchorPiece = pA;
          }
        }
      }
    }

    if (mergedNeighbor && snapAnchorPiece) {
      const targetGroupX = mergedNeighbor.currentX + (snapAnchorPiece.targetX - mergedNeighbor.targetX);
      const targetGroupY = mergedNeighbor.currentY + (snapAnchorPiece.targetY - mergedNeighbor.targetY);
      const targetGroupId = mergedNeighbor.groupId || mergedNeighbor.id;
      const targetIsPlaced = mergedNeighbor.isPlaced;
      const activeGroupPieceIds = activeGroup.map((p) => p.id);

      setPieces((prev) =>
        prev.map((p) => {
          if (activeGroupPieceIds.includes(p.id)) {
            return {
              ...p,
              currentX: targetIsPlaced ? p.targetX : targetGroupX + (p.targetX - snapAnchorPiece!.targetX),
              currentY: targetIsPlaced ? p.targetY : targetGroupY + (p.targetY - snapAnchorPiece!.targetY),
              groupId: targetGroupId,
              isPlaced: targetIsPlaced,
              lockedBy: null,
              lockedByName: null,
              lockedByColor: null,
            };
          }
          return p;
        })
      );

      // Check completion
      const placedCount = allPieces.filter((p) => p.isPlaced || activeGroupPieceIds.includes(p.id)).length;
      const totalCount = allPieces.length;
      setProgressPercent(Math.round((placedCount / totalCount) * 100));
      if (placedCount === totalCount) {
        setIsCompleted(true);
      }
    }
  }, [activePieceId]);

  // Fix placed pieces
  const handleFixPlacedPieces = () => {
    setPieces((prev) =>
      prev.map((p) => {
        if (p.isPlaced || p.lockedBy !== null) {
          return {
            ...p,
            currentX: p.targetX,
            currentY: p.targetY,
            isPlaced: true,
            lockedBy: null,
            lockedByName: null,
            lockedByColor: null,
          };
        }
        return p;
      })
    );
  };

  const handleCenterView = () => {
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const scatterPad = 400;
      const fullW = config.boardWidth + scatterPad * 2;
      const fullH = config.boardHeight + scatterPad * 2;
      scaleRef.current = Math.min((cw * 0.85) / fullW, (ch * 0.85) / fullH, 1);
      setZoomPercent(Math.round(scaleRef.current * 100));
      offsetRef.current = {
        x: cw / 2 - (config.boardWidth * scaleRef.current) / 2,
        y: ch / 2 - (config.boardHeight * scaleRef.current) / 2,
      };
    }
  };

  const handleZoomChange = (delta: number) => {
    const newScale = Math.min(4, Math.max(0.25, scaleRef.current + delta));
    if (containerRef.current) {
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

  const placedPiecesCount = useMemo(() => pieces.filter((p) => p.isPlaced).length, [pieces]);
  const totalPiecesCount = pieces.length;

  // Setup screen
  if (!gameStarted) {
    return (
      <main className="pt-app relative flex min-h-dvh h-auto w-full flex-col overflow-y-auto bg-[#0F1C2E] text-[#F5EFE0] pb-32">
        <div className="pointer-events-none fixed -left-24 -top-32 h-105 w-105 rounded-full bg-[#FF6B4A]/10 blur-[110px]" />
        <div className="pointer-events-none fixed -bottom-24 -right-16 h-95 w-95 rounded-full bg-[#F4B942]/8 blur-[100px]" />

        <Link href="/" className="group absolute left-5 top-5 z-20 flex items-center gap-2 sm:left-8 sm:top-6">
          <span className="text-2xl transition-transform group-hover:scale-110">🧩</span>
          <span className="font-display text-base font-bold tracking-wide text-[#F5EFE0]">Piece Together</span>
        </Link>

        <div className="relative z-10 flex flex-1 items-center justify-center px-4 pt-24 sm:px-10 md:pt-16">
          <div className="w-full max-w-4xl">
            <div className="mb-6 text-center md:mb-8">
              <span className="jb-mono text-xs uppercase tracking-[0.28em] text-[#F4B942]">Solo Mode</span>
              <h1 className="font-display mt-1.5 text-3xl font-bold leading-tight sm:text-4xl">
                Play <span className="italic text-[#FF6B4A]">solo</span>
              </h1>
              <p className="mt-2 text-sm text-[#A8ADC4]">No room needed — just pick a puzzle and start piecing!</p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.15fr_0.85fr] md:gap-10">
              <div className="flex flex-col gap-6">
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
                </div>

                <button
                  onClick={handleStartGame}
                  className="btn-piece btn-piece-primary w-full justify-center py-4 text-base font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  🎮 Start Solo Puzzle
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

  // Game screen
  return (
    <div className="relative flex h-dvh w-full overflow-hidden select-none" style={{ backgroundColor: C.pageBg, color: C.textPrimary }}>
      {/* Left sidebar */}
      <div
        className={`z-30 flex flex-col gap-4 p-5 transition-transform duration-300 ${
          mobileStatsOpen ? "fixed inset-y-0 left-0 w-80 shadow-2xl translate-x-0" : "hidden sm:flex sm:w-80 sm:relative sm:translate-x-0"
        }`}
        style={{ backgroundColor: C.pageBg }}
      >
        <div className="flex items-center justify-between sm:hidden pb-1 border-b" style={{ borderColor: C.cardBorder }}>
          <span className="text-xs font-bold uppercase tracking-wider">Puzzle Details</span>
          <button onClick={() => setMobileStatsOpen(false)} className="text-sm font-bold px-2 py-1">✕</button>
        </div>

        <Link href="/" className="flex items-center gap-2 rounded-2xl p-4 shadow-sm transition-transform hover:scale-[1.02]" style={{ backgroundColor: C.headerGreen, color: C.headerText }}>
          <span className="text-2xl">🧩</span>
          <div className="flex flex-col text-left">
            <span className="font-display text-base font-bold tracking-wide leading-none">Piece Together</span>
            <span className="text-[10px] font-bold text-[#F59E0B] mt-0.5">SOLO MODE</span>
          </div>
        </Link>

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

        <div className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
          <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: C.textMuted }}>Time</span>
          <div className="mt-1 text-2xl font-bold font-mono">{formatTime(elapsed)}</div>
        </div>

        <div className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider" style={{ color: C.textMuted }}>
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: C.pageBg }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%`, backgroundColor: C.headerGreen }} />
          </div>
        </div>

        {config?.imageUrl && (
          <div className="flex flex-col gap-2 rounded-2xl border p-3 shadow-sm" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
            <span className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: C.textMuted }}>Preview</span>
            <div className="aspect-video w-full overflow-hidden rounded-xl border" style={{ borderColor: C.cardBorder }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={config.imageUrl} alt="Puzzle preview" className="h-full w-full object-cover" />
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-around rounded-2xl border p-2 shadow-sm" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
          <Link href="/" className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5">
            <span>🏠</span> Home
          </Link>
          <button onClick={() => setShowRef((v) => !v)} className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5">
            <span>🖼️</span> Gallery
          </button>
        </div>
      </div>

      {/* Main canvas */}
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

        {/* RIGHT SIDEBAR ASSISTANT CARD */}
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

        {/* BOTTOM FLOATING CONTROL BAR */}
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
        {showRef && config?.imageUrl && (
          <div className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-2xl border p-3 shadow-2xl backdrop-blur-md max-w-[90vw]" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
            <div className="flex items-center justify-between pb-2 border-b mb-2" style={{ borderColor: C.cardBorder }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.textPrimary }}>Reference Image</span>
              <button onClick={() => setShowRef(false)} className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5">✕</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={config.imageUrl} alt="Reference" className="max-h-60 max-w-xs sm:max-w-sm rounded-xl object-contain" />
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex flex-col items-center text-center rounded-3xl border p-8 shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-300" style={{ backgroundColor: C.cardBg, borderColor: C.cardBorder }}>
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ color: C.textPrimary }}>Puzzle Completed!</h2>
            <p className="text-sm mb-6" style={{ color: C.textMuted }}>
              Congratulations! You completed the puzzle in <span className="font-semibold font-mono">{formatTime(elapsed)}</span>.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={handleStartGame}
                className="flex-1 rounded-xl py-3.5 text-sm font-bold text-center text-white shadow-md transition-transform hover:scale-105"
                style={{ backgroundColor: C.headerGreen }}
              >
                🔄 Play Again
              </button>
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