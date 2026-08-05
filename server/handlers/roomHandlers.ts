import { Socket, Server } from 'socket.io';
import { roomStore } from '../utils/roomStore';
import { dbStore } from '../utils/dbStore';
import { generateRoomCode } from '../../src/lib/roomCodeGenerator';
import { generatePuzzlePieces } from '../../src/lib/puzzleGenerator';
import { PLAYER_COLORS, PRESET_IMAGES } from '../../src/lib/constants';
import { RoomState, Player } from '../../src/types/room';
import { PuzzleConfig } from '../../src/types/puzzle';

export function registerRoomHandlers(io: Server, socket: Socket) {
  // CREATE ROOM
  socket.on('create_room', ({ playerName, avatar, maxPlayers }, callback) => {
    console.log(`[Server] create_room from socket ${socket.id}: name=${playerName}, maxPlayers=${maxPlayers}`);
    try {
      const code = generateRoomCode();
      console.log(`[Server] Generated room code: ${code}`);
      const color = PLAYER_COLORS[0];
      const host: Player = {
        id: socket.id,
        name: playerName || 'Puzzle Master',
        avatar: avatar || '🧩',
        color,
        isHost: true,
        cursor: null,
      };

      const defaultConfig: PuzzleConfig = {
        rows: 5,
        cols: 5,
        totalPieces: 25,
        imageUrl: PRESET_IMAGES[0].url,
        imageTitle: PRESET_IMAGES[0].title,
        imageWidth: 1000,
        imageHeight: 700,
        boardWidth: 800,
        boardHeight: 560,
      };

      const room: RoomState = {
        code,
        hostId: socket.id,
        status: 'lobby',
        maxPlayers: maxPlayers || 6,
        config: defaultConfig,
        pieces: [],
        players: { [socket.id]: host },
        chat: [],
        startedAt: null,
        completedAt: null,
      };

      roomStore.setRoom(code, room);
      dbStore.saveRoom(room);

      socket.join(code);
      console.log(`[Server] ✅ Room ${code} created by ${playerName} (${socket.id})`);
      callback({ success: true, roomCode: code });
    } catch (e: any) {
      console.error(`[Server] ❌ create_room error:`, e);
      callback({ success: false, error: e.message || 'Failed to create room' });
    }
  });

  // JOIN ROOM
  socket.on('join_room', ({ roomCode, playerName, avatar }, callback) => {
    console.log(`[Server] join_room from socket ${socket.id}: code=${roomCode}, name=${playerName}`);
    try {
      const upperCode = roomCode.toUpperCase();
      let room = roomStore.getRoom(upperCode);

      if (!room) {
        console.warn(`[Server] ⚠️ Room ${upperCode} not found`);
        return callback({ success: false, error: 'Room not found. Check code and try again.' });
      }

      const currentPlayers = Object.keys(room.players);
      console.log(`[Server] Room ${upperCode}: ${currentPlayers.length}/${room.maxPlayers} players, status: ${room.status}`);
      if (currentPlayers.length >= room.maxPlayers && !room.players[socket.id]) {
        console.warn(`[Server] ⚠️ Room ${upperCode} is full`);
        return callback({ success: false, error: 'Room is full.' });
      }

      const assignedColor = PLAYER_COLORS[currentPlayers.length % PLAYER_COLORS.length];
      const newPlayer: Player = {
        id: socket.id,
        name: playerName || `Player ${currentPlayers.length + 1}`,
        avatar: avatar || '🧩',
        color: assignedColor,
        isHost: room.hostId === socket.id,
        cursor: null,
      };

      room.players[socket.id] = newPlayer;
      roomStore.setRoom(upperCode, room);
      dbStore.saveRoom(room);

      socket.join(upperCode);
      socket.to(upperCode).emit('player_joined', newPlayer);
      io.to(upperCode).emit('room_updated', room);

      // System chat broadcast
      const systemMessage = {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        senderColor: '#888',
        text: `${newPlayer.name} joined the room`,
        timestamp: Date.now(),
        system: true,
      };
      room.chat.push(systemMessage);
      io.to(upperCode).emit('chat_message', systemMessage);

      console.log(`[Server] ✅ ${playerName} (${socket.id}) joined room ${upperCode}`);
      callback({ success: true, room });
    } catch (e: any) {
      console.error(`[Server] ❌ join_room error:`, e);
      callback({ success: false, error: e.message || 'Failed to join room' });
    }
  });

  // START GAME
  socket.on('start_game', ({ roomCode }) => {
    const upperCode = roomCode.toUpperCase();
    console.log(`[Server] start_game from socket ${socket.id}: room=${upperCode}`);
    const room = roomStore.getRoom(upperCode);
    if (!room || room.hostId !== socket.id || !room.config) {
      console.warn(`[Server] ⚠️ start_game rejected: room=${!!room}, isHost=${room?.hostId === socket.id}, hasConfig=${!!room?.config}`);
      return;
    }

    room.status = 'playing';
    room.startedAt = Date.now();
    room.completedAt = null;

    // Generate puzzle pieces layout
    room.pieces = generatePuzzlePieces(room.config);
    console.log(`[Server] ✅ Game started in room ${upperCode}: ${room.pieces.length} pieces generated`);

    roomStore.setRoom(upperCode, room);
    dbStore.saveRoom(room);

    io.to(upperCode).emit('game_started', {
      config: room.config,
      pieces: room.pieces,
      startedAt: room.startedAt,
    });
    io.to(upperCode).emit('room_updated', room);
  });

  // UPDATE SETTINGS
  socket.on('update_settings', ({ roomCode, config }) => {
    const upperCode = roomCode.toUpperCase();
    console.log(`[Server] update_settings from socket ${socket.id}: room=${upperCode}, image=${config?.imageTitle}`);
    const room = roomStore.getRoom(upperCode);
    if (!room || room.hostId !== socket.id) {
      console.warn(`[Server] ⚠️ update_settings rejected: room=${!!room}, isHost=${room?.hostId === socket.id}`);
      return;
    }

    room.config = config;
    roomStore.setRoom(upperCode, room);
    dbStore.saveRoom(room);

    console.log(`[Server] ✅ Settings updated for room ${upperCode}`);
    io.to(upperCode).emit('room_updated', room);
  });

  // LEAVE ROOM
  socket.on('leave_room', ({ roomCode }) => {
    const upperCode = roomCode.toUpperCase();
    handlePlayerDisconnect(io, socket, upperCode);
  });
}

export function handlePlayerDisconnect(io: Server, socket: Socket, specificRoomCode?: string) {
  const roomsToProcess = specificRoomCode ? [specificRoomCode] : Array.from(socket.rooms);

  for (const code of roomsToProcess) {
    if (code === socket.id) continue;

    const room = roomStore.getRoom(code);
    if (!room || !room.players[socket.id]) continue;

    const player = room.players[socket.id];
    delete room.players[socket.id];

    // Unlock any pieces locked by this disconnected player
    if (room.pieces) {
      for (const piece of room.pieces) {
        if (piece.lockedBy === socket.id) {
          piece.lockedBy = null;
          piece.lockedByName = null;
          piece.lockedByColor = null;
        }
      }
    }

    const remainingPlayerIds = Object.keys(room.players);
    if (remainingPlayerIds.length === 0) {
      // Room empty, delete from memory (keep in DB for history/reconnect if needed)
      roomStore.deleteRoom(code);
    } else {
      // Reassign host if host left
      if (room.hostId === socket.id) {
        room.hostId = remainingPlayerIds[0];
        room.players[room.hostId].isHost = true;
      }

      roomStore.setRoom(code, room);
      dbStore.saveRoom(room);

      io.to(code).emit('player_left', { playerId: socket.id, playerName: player.name });
      io.to(code).emit('room_updated', room);
    }
  }
}
