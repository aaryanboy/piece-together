import { RoomState, Player, ChatMessage } from './room';
import { PuzzleConfig, PuzzlePieceData } from './puzzle';

export interface ClientToServerEvents {
  create_room: (data: { playerName: string; avatar: string; maxPlayers: number; playerId: string }, callback: (response: { success: boolean; roomCode?: string; error?: string }) => void) => void;
  join_room: (data: { roomCode: string; playerName: string; avatar: string; playerId: string }, callback: (response: { success: boolean; room?: RoomState; error?: string }) => void) => void;
  leave_room: (data: { roomCode: string }) => void;
  update_settings: (data: { roomCode: string; config: PuzzleConfig }) => void;
  start_game: (data: { roomCode: string }) => void;
  change_mode: (data: { roomCode: string; mode: 'cooperative' | 'competitive' }) => void;
  quit_game: (data: { roomCode: string }) => void;
  
  // Gameplay Events
  lock_piece: (data: { roomCode: string; pieceId: number }) => void;
  unlock_piece: (data: { roomCode: string; pieceId: number }) => void;
  move_piece: (data: { roomCode: string; pieceId: number; x: number; y: number; groupIds?: number[] }) => void;
  snap_pieces: (data: { roomCode: string; anchorPieceId: number; pieceIds: number[]; targetX: number; targetY: number; groupId: number; isPlaced: boolean; neighborPieceId?: number }) => void;
  fix_placed_pieces: (data: { roomCode: string }) => void;
  cursor_move: (data: { roomCode: string; x: number; y: number }) => void;
  send_chat: (data: { roomCode: string; text: string }) => void;
}

export interface ServerToClientEvents {
  room_updated: (room: RoomState) => void;
  player_joined: (player: Player) => void;
  player_left: (data: { playerId: string; playerName: string }) => void;
  game_started: (data: { config: PuzzleConfig; pieces: PuzzlePieceData[]; startedAt: number }) => void;
  
  // Real-time piece & cursor events
  piece_locked: (data: { pieceId: number; lockedBy: string; lockedByName: string; lockedByColor: string; playerId?: string }) => void;
  piece_unlocked: (data: { pieceId: number; playerId?: string }) => void;
  piece_moved: (data: { pieceId: number; x: number; y: number; playerId?: string; groupIds?: number[] }) => void;
  pieces_snapped: (data: { anchorPieceId: number; pieceIds: number[]; targetX: number; targetY: number; groupId: number; isPlaced: boolean; progressPercent: number; playerId?: string; pieces?: PuzzlePieceData[] }) => void;
  // Server rejected a snap attempt because a piece wasn't within tolerance of its
  // own correct target (board placement) or its correct neighbor offset (group merge).
  snap_rejected: (data: { pieceIds: number[]; reason: 'not-correct-spot' | 'not-neighbors'; playerId?: string; pieces: PuzzlePieceData[] }) => void;
  game_completed: (data: { completedAt: number; durationSeconds: number }) => void;
  cursor_updated: (data: { playerId: string; x: number; y: number }) => void;
  chat_message: (message: ChatMessage) => void;
  error_message: (data: { message: string }) => void;
}

