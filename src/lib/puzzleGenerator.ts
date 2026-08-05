import { PuzzleConfig, PuzzlePieceData, PieceEdgeType, PieceEdges } from '../types/puzzle';

/**
 * Generate edge matrix and initial scattered pieces for a given grid configuration
 */
export function generatePuzzlePieces(config: PuzzleConfig): PuzzlePieceData[] {
  const { rows, cols, boardWidth, boardHeight } = config;
  const pieceWidth = boardWidth / cols;
  const pieceHeight = boardHeight / rows;

  // Board offset centered on canvas workspace
  const boardOffsetX = 300;
  const boardOffsetY = 150;

  // 1. Generate edge definitions
  // horizontalEdges[r][c] is the edge between (r, c) and (r, c+1)
  const horizontalEdges: PieceEdgeType[][] = Array.from({ length: rows }, () => Array(cols - 1).fill('flat'));
  // verticalEdges[r][c] is the edge between (r, c) and (r+1, c)
  const verticalEdges: PieceEdgeType[][] = Array.from({ length: rows - 1 }, () => Array(cols).fill('flat'));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      horizontalEdges[r][c] = Math.random() < 0.5 ? 'tab' : 'blank';
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      verticalEdges[r][c] = Math.random() < 0.5 ? 'tab' : 'blank';
    }
  }

  const pieces: PuzzlePieceData[] = [];
  let pieceId = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const top: PieceEdgeType = r === 0 ? 'flat' : (verticalEdges[r - 1][c] === 'tab' ? 'blank' : 'tab');
      const right: PieceEdgeType = c === cols - 1 ? 'flat' : horizontalEdges[r][c];
      const bottom: PieceEdgeType = r === rows - 1 ? 'flat' : verticalEdges[r][c];
      const left: PieceEdgeType = c === 0 ? 'flat' : (horizontalEdges[r][c - 1] === 'tab' ? 'blank' : 'tab');

      const edges: PieceEdges = { top, right, bottom, left };

      const targetX = boardOffsetX + c * pieceWidth;
      const targetY = boardOffsetY + r * pieceHeight;

      // Scatter piece randomly around the board
      const scatterZone = Math.floor(Math.random() * 4);
      let currentX = targetX;
      let currentY = targetY;

      if (scatterZone === 0) {
        // Left zone
        currentX = Math.random() * (boardOffsetX - pieceWidth - 20) + 10;
        currentY = Math.random() * (boardHeight + 200) + 50;
      } else if (scatterZone === 1) {
        // Right zone
        currentX = boardOffsetX + boardWidth + 40 + Math.random() * 200;
        currentY = Math.random() * (boardHeight + 200) + 50;
      } else if (scatterZone === 2) {
        // Top zone
        currentX = Math.random() * (boardWidth + 400);
        currentY = Math.random() * 80 + 20;
      } else {
        // Bottom zone
        currentX = Math.random() * (boardWidth + 400);
        currentY = boardOffsetY + boardHeight + 40 + Math.random() * 150;
      }

      const currentId = pieceId++;

      pieces.push({
        id: currentId,
        gridX: c,
        gridY: r,
        currentX,
        currentY,
        targetX,
        targetY,
        width: pieceWidth,
        height: pieceHeight,
        edges,
        lockedBy: null,
        groupId: currentId, // Initially each piece is in its own group
        isPlaced: false,
      });
    }
  }

  return pieces;
}

/**
 * Draw classic Bézier curve jigsaw path on a Canvas2D Context
 */
export function drawPiecePath(
  ctx: CanvasRenderingContext2D,
  piece: PuzzlePieceData,
  w: number,
  h: number,
  tabSizePercent = 0.2
) {
  const tabW = w * tabSizePercent;
  const tabH = h * tabSizePercent;

  ctx.beginPath();
  ctx.moveTo(0, 0);

  // TOP EDGE
  if (piece.edges.top === 'flat') {
    ctx.lineTo(w, 0);
  } else {
    const dir = piece.edges.top === 'tab' ? -1 : 1;
    ctx.lineTo(w * 0.35, 0);
    ctx.bezierCurveTo(w * 0.35, dir * tabH, w * 0.45, dir * tabH * 1.3, w * 0.5, dir * tabH * 1.3);
    ctx.bezierCurveTo(w * 0.55, dir * tabH * 1.3, w * 0.65, dir * tabH, w * 0.65, 0);
    ctx.lineTo(w, 0);
  }

  // RIGHT EDGE
  if (piece.edges.right === 'flat') {
    ctx.lineTo(w, h);
  } else {
    const dir = piece.edges.right === 'tab' ? 1 : -1;
    ctx.lineTo(w, h * 0.35);
    ctx.bezierCurveTo(w + dir * tabW, h * 0.35, w + dir * tabW * 1.3, h * 0.45, w + dir * tabW * 1.3, h * 0.5);
    ctx.bezierCurveTo(w + dir * tabW * 1.3, h * 0.55, w + dir * tabW, h * 0.65, w, h * 0.65);
    ctx.lineTo(w, h);
  }

  // BOTTOM EDGE
  if (piece.edges.bottom === 'flat') {
    ctx.lineTo(0, h);
  } else {
    const dir = piece.edges.bottom === 'tab' ? 1 : -1;
    ctx.lineTo(w * 0.65, h);
    ctx.bezierCurveTo(w * 0.65, h + dir * tabH, w * 0.55, h + dir * tabH * 1.3, w * 0.5, h + dir * tabH * 1.3);
    ctx.bezierCurveTo(w * 0.45, h + dir * tabH * 1.3, w * 0.35, h + dir * tabH, w * 0.35, h);
    ctx.lineTo(0, h);
  }

  // LEFT EDGE
  if (piece.edges.left === 'flat') {
    ctx.lineTo(0, 0);
  } else {
    const dir = piece.edges.left === 'tab' ? -1 : 1;
    ctx.lineTo(0, h * 0.65);
    ctx.bezierCurveTo(dir * tabW, h * 0.65, dir * tabW * 1.3, h * 0.55, dir * tabW * 1.3, h * 0.5);
    ctx.bezierCurveTo(dir * tabW * 1.3, h * 0.45, dir * tabW, h * 0.35, 0, h * 0.35);
    ctx.lineTo(0, 0);
  }

  ctx.closePath();
}
