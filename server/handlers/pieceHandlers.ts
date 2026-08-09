import { Socket, Server } from 'socket.io';
import { roomStore } from '../utils/roomStore';
import { dbStore } from '../utils/dbStore';
import { ChatMessage } from '../../src/types/room';

// Save database debounced map to avoid constant I/O during rapid moves
const dbSaveTimeouts: Map<string, NodeJS.Timeout> = new Map();

function scheduleDbSave(roomCode: string) {
  const existing = dbSaveTimeouts.get(roomCode);
  if (existing) clearTimeout(existing);

  const timeout = setTimeout(() => {
    const room = roomStore.getRoom(roomCode);
    if (room) {
      dbStore.saveRoom(room);
    }
    dbSaveTimeouts.delete(roomCode);
  }, 3000);

  dbSaveTimeouts.set(roomCode, timeout);
}

export function registerPieceHandlers(io: Server, socket: Socket) {
  // LOCK PIECE
  socket.on('lock_piece', ({ roomCode, pieceId }) => {
    const code = roomCode.toUpperCase();
    const room = roomStore.getRoom(code);
    if (!room || !room.pieces) return;

    const piece = room.pieces.find((p) => p.id === pieceId);
    const player = room.players[socket.id];
    if (!piece || !player) return;

    // Already-placed pieces are permanently locked into position — never let
    // anything (including a stale/buggy client) re-grab one over the socket.
    if (piece.isPlaced) return;

    // Spatial lock check
    if (piece.lockedBy && piece.lockedBy !== socket.id) {
      return; // Already locked by someone else
    }

    piece.lockedBy = socket.id;
    piece.lockedByName = player.name;
    piece.lockedByColor = player.color;

    // Lock all pieces in the same group
    if (piece.groupId) {
      for (const p of room.pieces) {
        if (p.groupId === piece.groupId) {
          p.lockedBy = socket.id;
          p.lockedByName = player.name;
          p.lockedByColor = player.color;
        }
      }
    }

    socket.to(code).emit('piece_locked', {
      pieceId,
      lockedBy: socket.id,
      lockedByName: player.name,
      lockedByColor: player.color,
    });
  });

  // UNLOCK PIECE
  socket.on('unlock_piece', ({ roomCode, pieceId }) => {
    const code = roomCode.toUpperCase();
    const room = roomStore.getRoom(code);
    if (!room || !room.pieces) return;

    const piece = room.pieces.find((p) => p.id === pieceId);
    if (!piece) return;

    if (piece.lockedBy === socket.id) {
      piece.lockedBy = null;
      piece.lockedByName = null;
      piece.lockedByColor = null;

      if (piece.groupId) {
        for (const p of room.pieces) {
          if (p.groupId === piece.groupId) {
            p.lockedBy = null;
            p.lockedByName = null;
            p.lockedByColor = null;
          }
        }
      }

      socket.to(code).emit('piece_unlocked', { pieceId });
      scheduleDbSave(code);
    }
  });

  // MOVE PIECE (High frequency - in-memory update + broadcast)
  socket.on('move_piece', ({ roomCode, pieceId, x, y }) => {
    const code = roomCode.toUpperCase();
    const room = roomStore.getRoom(code);
    if (!room || !room.pieces) return;

    const piece = room.pieces.find((p) => p.id === pieceId);
    if (!piece) return;

    // Placed pieces don't move — guards against a stale drag event arriving
    // after a piece has already locked into the board.
    if (piece.isPlaced) return;

    // Move piece and all pieces in its connected group using exact relative target math
    if (piece.groupId) {
      for (const p of room.pieces) {
        if (p.groupId === piece.groupId) {
          p.currentX = x + (p.targetX - piece.targetX);
          p.currentY = y + (p.targetY - piece.targetY);
        }
      }
    } else {
      piece.currentX = x;
      piece.currentY = y;
    }

    socket.to(code).emit('piece_moved', { pieceId, x, y });
  });

  // SNAP PIECES (When pieces lock onto the board target or merge groups)
  socket.on('snap_pieces', ({ roomCode, anchorPieceId, pieceIds, targetX, targetY, groupId, isPlaced, neighborPieceId }) => {
    const code = roomCode.toUpperCase();
    const room = roomStore.getRoom(code);
    if (!room || !room.pieces || !room.config) return;

    const targetPieces = room.pieces.filter((p) => pieceIds.includes(p.id));
    if (targetPieces.length === 0) return;

    // Refuse to move pieces that are already locked into the board.
    if (targetPieces.some((p) => p.isPlaced)) return;

    const pieceWidth = room.config.boardWidth / room.config.cols;
    const pieceHeight = room.config.boardHeight / room.config.rows;
    const snapTolerance = Math.min(pieceWidth, pieceHeight) * 0.35;

    const anchor = targetPieces.find((p) => p.id === anchorPieceId) || targetPieces[0];
    const deltaX = targetX - anchor.currentX;
    const deltaY = targetY - anchor.currentY;

    if (isPlaced) {
      // Board placement — every piece in the group must land within tolerance
      // of ITS OWN correct target.
      const allCorrect = targetPieces.every((p) => {
        const newX = p.currentX + deltaX;
        const newY = p.currentY + deltaY;
        return Math.abs(newX - p.targetX) <= snapTolerance && Math.abs(newY - p.targetY) <= snapTolerance;
      });

      if (!allCorrect) {
        // Unlock on server
        for (const p of targetPieces) {
          p.lockedBy = null;
          p.lockedByName = null;
          p.lockedByColor = null;
        }
        socket.to(code).emit('piece_unlocked', { pieceId: anchor.id });
        socket.emit('snap_rejected', {
          pieceIds,
          reason: 'not-correct-spot',
          pieces: targetPieces
        });
        scheduleDbSave(code);
        return;
      }

      // Snap exactly onto each piece's true target — not the (possibly slightly-off) point client dropped it at.
      for (const p of targetPieces) {
        p.currentX = p.targetX;
        p.currentY = p.targetY;
        p.groupId = groupId;
        p.isPlaced = true;
        p.lockedBy = null;
        p.lockedByName = null;
        p.lockedByColor = null;
      }
    } else {
      // Group-merge — two loose pieces snapping together off the board.
      if (neighborPieceId) {
        const neighbor = room.pieces.find((p) => p.id === neighborPieceId);
        if (neighbor) {
          const isNeighbor =
            (Math.abs(neighbor.gridX - anchor.gridX) === 1 && neighbor.gridY === anchor.gridY) ||
            (Math.abs(neighbor.gridY - anchor.gridY) === 1 && neighbor.gridX === anchor.gridX);

          if (!isNeighbor) {
            for (const p of targetPieces) {
              p.lockedBy = null;
              p.lockedByName = null;
              p.lockedByColor = null;
            }
            socket.to(code).emit('piece_unlocked', { pieceId: anchor.id });
            socket.emit('snap_rejected', {
              pieceIds,
              reason: 'not-neighbors',
              pieces: targetPieces
            });
            scheduleDbSave(code);
            return;
          }
        }
      }

      for (const p of targetPieces) {
        p.currentX = targetX + (p.targetX - anchor.targetX);
        p.currentY = targetY + (p.targetY - anchor.targetY);
        p.groupId = groupId;
        p.isPlaced = false;
        p.lockedBy = null;
        p.lockedByName = null;
        p.lockedByColor = null;
      }
    }

    // Collect all updated pieces in the group
    const updatedPieces = room.pieces.filter((p) => pieceIds.includes(p.id) || p.groupId === groupId);

    // Check overall puzzle completion percentage
    const placedCount = room.pieces.filter((p) => p.isPlaced).length;
    const totalCount = room.pieces.length;
    const progressPercent = Math.round((placedCount / totalCount) * 100);

    io.to(code).emit('pieces_snapped', {
      anchorPieceId: anchor.id,
      pieceIds,
      targetX,
      targetY,
      groupId,
      isPlaced,
      progressPercent,
      pieces: updatedPieces,
    });

    // Check for 100% completion!
    if (placedCount === totalCount && room.status !== 'completed') {
      room.status = 'completed';
      room.completedAt = Date.now();
      const durationSeconds = room.startedAt ? Math.round((room.completedAt - room.startedAt) / 1000) : 0;
      room.elapsedSeconds = durationSeconds;

      io.to(code).emit('game_completed', {
        completedAt: room.completedAt,
        durationSeconds,
      });

      dbStore.saveRoom(room);
    } else {
      scheduleDbSave(code);
    }
  });

  // FIX PLACED PIECES (Auto-align all placed or stuck pieces into exact target coordinates)
  socket.on('fix_placed_pieces', ({ roomCode }) => {
    const code = roomCode.toUpperCase();
    const room = roomStore.getRoom(code);
    if (!room || !room.pieces || !room.config) return;

    const pieceWidth = room.config.boardWidth / room.config.cols;
    const pieceHeight = room.config.boardHeight / room.config.rows;
    const snapTolerance = Math.min(pieceWidth, pieceHeight) * 0.45;

    const fixedPieces: any[] = [];

    for (const p of room.pieces) {
      const distToTarget = Math.hypot(p.currentX - p.targetX, p.currentY - p.targetY);
      if (p.isPlaced || p.lockedBy !== null || distToTarget <= snapTolerance) {
        p.currentX = p.targetX;
        p.currentY = p.targetY;
        p.isPlaced = true;
        p.lockedBy = null;
        p.lockedByName = null;
        p.lockedByColor = null;
        fixedPieces.push(p);
      }
    }

    if (fixedPieces.length === 0) return;

    const placedCount = room.pieces.filter((p) => p.isPlaced).length;
    const totalCount = room.pieces.length;
    const progressPercent = Math.round((placedCount / totalCount) * 100);

    const firstFixed = fixedPieces[0];

    io.to(code).emit('pieces_snapped', {
      anchorPieceId: firstFixed.id,
      pieceIds: fixedPieces.map((p) => p.id),
      targetX: firstFixed.targetX,
      targetY: firstFixed.targetY,
      groupId: firstFixed.groupId || firstFixed.id,
      isPlaced: true,
      progressPercent,
      pieces: fixedPieces,
    });

    if (placedCount === totalCount && room.status !== 'completed') {
      room.status = 'completed';
      room.completedAt = Date.now();
      const durationSeconds = room.startedAt ? Math.round((room.completedAt - room.startedAt) / 1000) : 0;
      room.elapsedSeconds = durationSeconds;

      io.to(code).emit('game_completed', {
        completedAt: room.completedAt,
        durationSeconds,
      });

      dbStore.saveRoom(room);
    } else {
      scheduleDbSave(code);
    }
  });

  // CURSOR MOVE (High frequency multi-cursor)
  socket.on('cursor_move', ({ roomCode, x, y }) => {
    const code = roomCode.toUpperCase();
    const room = roomStore.getRoom(code);
    if (room && room.players[socket.id]) {
      room.players[socket.id].cursor = { x, y };
      socket.to(code).emit('cursor_updated', { playerId: socket.id, x, y });
    }
  });

  // CHAT MESSAGE
  socket.on('send_chat', ({ roomCode, text }) => {
    const code = roomCode.toUpperCase();
    const room = roomStore.getRoom(code);
    if (!room || !room.players[socket.id]) return;

    const player = room.players[socket.id];
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      senderId: socket.id,
      senderName: player.name,
      senderColor: player.color,
      text: text.trim(),
      timestamp: Date.now(),
    };

    room.chat.push(message);
    io.to(code).emit('chat_message', message);
    scheduleDbSave(code);
  });
}