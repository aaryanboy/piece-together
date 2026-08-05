export type PieceEdgeType = 'flat' | 'tab' | 'blank';

export interface PieceEdges {
  top: PieceEdgeType;
  right: PieceEdgeType;
  bottom: PieceEdgeType;
  left: PieceEdgeType;
}

export interface Point {
  x: number;
  y: number;
}

export interface PuzzlePieceData {
  id: number;
  gridX: number;
  gridY: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  edges: PieceEdges;
  lockedBy: string | null;
  lockedByName?: string | null;
  lockedByColor?: string | null;
  groupId: number;
  isPlaced: boolean;
}

export interface PuzzleConfig {
  rows: number;
  cols: number;
  totalPieces: number;
  imageUrl: string;
  imageTitle: string;
  imageWidth: number;
  imageHeight: number;
  boardWidth: number;
  boardHeight: number;
}
