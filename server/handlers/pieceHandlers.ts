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

    const deltaX = x - piece.currentX;
    const deltaY = y - piece.currentY;

    // Move piece and all pieces in its connected group
    if (piece.groupId) {
      for (const p of room.pieces) {
        if (p.groupId === piece.groupId) {
          p.currentX += deltaX;
          p.currentY += deltaY;
        }
      }
    } else {
      piece.currentX = x;
      piece.currentY = y;
    }

    socket.to(code).emit('piece_moved', { pieceId, x, y });
  });

  // SNAP PIECES (When pieces lock onto the board target or merge groups)
  socket.on('snap_pieces', ({ roomCode, pieceIds, targetX, targetY, groupId, isPlaced }) => {
    const code = roomCode.toUpperCase();
    const room = roomStore.getRoom(code);
    if (!room || !room.pieces) return;

    const targetPieces = room.pieces.filter((p) => pieceIds.includes(p.id));
    if (targetPieces.length === 0) return;

    const deltaX = targetX - targetPieces[0].currentX;
    const deltaY = targetY - targetPieces[0].currentY;

    for (const p of targetPieces) {
      p.currentX += deltaX;
      p.currentY += deltaY;
      p.groupId = groupId;
      p.isPlaced = isPlaced;
      p.lockedBy = null;
    }

    // Check overall puzzle completion percentage
    const placedCount = room.pieces.filter((p) => p.isPlaced).length;
    const totalCount = room.pieces.length;
    const progressPercent = Math.round((placedCount / totalCount) * 100);

    io.to(code).emit('pieces_snapped', {
      pieceIds,
      targetX,
      targetY,
      groupId,
      isPlaced,
      progressPercent,
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
