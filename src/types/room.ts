import { PuzzleConfig, PuzzlePieceData } from './puzzle';

export interface Player {
  id: string; // Stable session ID (survives reconnects)
  socketId: string; // Current active transient socket connection ID
  name: string;
  avatar: string;
  color: string;
  isHost: boolean;
  cursor: { x: number; y: number } | null;
  isOffline?: boolean;
  isSpectator?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  system?: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'completed';
  maxPlayers: number;
  config: PuzzleConfig | null;
  pieces: PuzzlePieceData[];
  players: Record<string, Player>;
  chat: ChatMessage[];
  startedAt: number | null;
  completedAt: number | null;
  elapsedSeconds?: number;
  
  // Competitive mode state
  mode?: 'cooperative' | 'competitive';
  playerPieces?: Record<string, PuzzlePieceData[]>;
  competitiveResults?: Record<string, { finishedAt: number; durationSeconds: number; place: number }>;
  quitPlayers?: string[];
}

