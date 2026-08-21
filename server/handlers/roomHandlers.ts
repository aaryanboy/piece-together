import { Socket, Server } from 'socket.io';
import { roomStore } from '../utils/roomStore';
import { dbStore } from '../utils/dbStore';
import { generateRoomCode } from '../../src/lib/roomCodeGenerator';
import { generatePuzzlePieces } from '../../src/lib/puzzleGenerator';
import { PLAYER_COLORS, PRESET_IMAGES } from '../../src/lib/constants';
import { RoomState, Player } from '../../src/types/room';
import { PuzzleConfig } from '../../src/types/puzzle';

// Tracks active player disconnect grace period timeouts (stable playerId -> Timeout ID)
export const activeDisconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

export function registerRoomHandlers(io: Server, socket: Socket) {
  // CREATE ROOM
  socket.on('create_room', ({ playerName, avatar, maxPlayers, playerId }, callback) => {
    console.log(`[Server] create_room from socket ${socket.id}: name=${playerName}, maxPlayers=${maxPlayers}, playerId=${playerId}`);
    try {
      const code = generateRoomCode();
      console.log(`[Server] Generated room code: ${code}`);
      const color = PLAYER_COLORS[0];
      const host: Player = {
        id: playerId, // stable playerId
        socketId: socket.id, // transient socket.id
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
        hostId: playerId,
        status: 'lobby',
        maxPlayers: maxPlayers || 6,
        config: defaultConfig,
        pieces: [],
        players: { [playerId]: host },
        chat: [],
        startedAt: null,
        completedAt: null,
        mode: 'cooperative', // default game mode
        playerPieces: {},
        competitiveResults: {},
        quitPlayers: [],
      };

      roomStore.setRoom(code, room);
      dbStore.saveRoom(room);

      socket.join(code);
      console.log(`[Server] ✅ Room ${code} created by ${playerName} (session: ${playerId})`);
      callback({ success: true, roomCode: code });
    } catch (e) {
      console.error(`[Server] ❌ create_room error:`, e);
      callback({ success: false, error: e instanceof Error ? e.message : 'Failed to create room' });
    }
  });

  // JOIN ROOM
  socket.on('join_room', ({ roomCode, playerName, avatar, playerId }, callback) => {
    console.log(`[Server] join_room from socket ${socket.id}: code=${roomCode}, name=${playerName}, playerId=${playerId}`);
    try {
      const upperCode = roomCode.toUpperCase();
      const room = roomStore.getRoom(upperCode);

      if (!room) {
        console.warn(`[Server] ⚠️ Room ${upperCode} not found`);
        return callback({ success: false, error: 'Room not found. Check code and try again.' });
      }

      // 1. Reconnection Check
      const existingPlayer = room.players[playerId];
      if (existingPlayer) {
        console.log(`[Server] Player ${playerName} (${playerId}) reconnected to room ${upperCode}`);
        
        // Cancel pending disconnect timeout
        const timeout = activeDisconnectTimeouts.get(playerId);
        if (timeout) {
          clearTimeout(timeout);
          activeDisconnectTimeouts.delete(playerId);
        }

        existingPlayer.socketId = socket.id;
        existingPlayer.isOffline = false;
        
        // Ensure host association matches if host returned
        if (existingPlayer.isHost) {
          room.hostId = playerId;
        }

        roomStore.setRoom(upperCode, room);
        dbStore.saveRoom(room);

        socket.join(upperCode);
        io.to(upperCode).emit('room_updated', room);

        // System message broadcast
        const systemMessage = {
          id: `sys-${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          senderColor: '#888',
          text: `⚡ ${existingPlayer.name} reconnected to the game.`,
          timestamp: Date.now(),
          system: true,
        };
        room.chat.push(systemMessage);
        io.to(upperCode).emit('chat_message', systemMessage);

        return callback({ success: true, room });
      }

      // 2. Room capacity checks for new players
      const currentPlayers = Object.keys(room.players);
      console.log(`[Server] Room ${upperCode}: ${currentPlayers.length}/${room.maxPlayers} players, status: ${room.status}`);
      if (currentPlayers.length >= room.maxPlayers && !room.players[playerId]) {
        console.warn(`[Server] ⚠️ Room ${upperCode} is full`);
        return callback({ success: false, error: 'Room is full.' });
      }

      // 3. Late joiner logic: join as spectator if game is active in competitive mode
      const isSpectator = room.status === 'playing' && room.mode === 'competitive';
      const assignedColor = PLAYER_COLORS[currentPlayers.length % PLAYER_COLORS.length];
      const newPlayer: Player = {
        id: playerId,
        socketId: socket.id,
        name: playerName || `Player ${currentPlayers.length + 1}`,
        avatar: avatar || '🧩',
        color: assignedColor,
        isHost: room.hostId === playerId,
        cursor: null,
        isSpectator,
      };

      room.players[playerId] = newPlayer;
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
        text: isSpectator
          ? `${newPlayer.name} joined as a spectator`
          : `${newPlayer.name} joined the room`,
        timestamp: Date.now(),
        system: true,
      };
      room.chat.push(systemMessage);
      io.to(upperCode).emit('chat_message', systemMessage);

      console.log(`[Server] ✅ ${playerName} (session: ${playerId}) joined room ${upperCode} (spectator: ${isSpectator})`);
      callback({ success: true, room });
    } catch (e) {
      console.error(`[Server] ❌ join_room error:`, e);
      callback({ success: false, error: e instanceof Error ? e.message : 'Failed to join room' });
    }
  });

  // START GAME
  socket.on('start_game', ({ roomCode }) => {
    const upperCode = roomCode.toUpperCase();
    console.log(`[Server] start_game from socket ${socket.id}: room=${upperCode}`);
    const room = roomStore.getRoom(upperCode);
    if (!room || !room.config) return;

    // Find host player by socket.id
    const hostPlayer = Object.values(room.players).find(p => p.socketId === socket.id);
    if (!hostPlayer || !hostPlayer.isHost) {
      console.warn(`[Server] ⚠️ start_game rejected: sender is not room host`);
      return;
    }

    room.status = 'playing';
    room.startedAt = Date.now();
    room.completedAt = null;

    if (room.mode === 'competitive') {
      room.playerPieces = {};
      room.competitiveResults = {};
      room.quitPlayers = [];

      // Generate a separate board pieces set for each active non-spectator player
      const basePieces = generatePuzzlePieces(room.config);
      
      for (const pid of Object.keys(room.players)) {
        const p = room.players[pid];
        if (p.isSpectator) continue;
        
        // Provide unique scattered coords but keeping the same edge structures for fairness
        room.playerPieces[pid] = basePieces.map(piece => {
          // Re-scatter slightly per-player so it's a scrambler race
          const pieceWidth = room.config!.boardWidth / room.config!.cols;
          const pieceHeight = room.config!.boardHeight / room.config!.rows;
          const scatterZone = Math.floor(Math.random() * 4);
          let currentX = piece.targetX;
          let currentY = piece.targetY;

          if (scatterZone === 0) {
            currentX = -Math.random() * 300 - pieceWidth - 20;
            currentY = Math.random() * (room.config!.boardHeight + 200) - 100;
          } else if (scatterZone === 1) {
            currentX = room.config!.boardWidth + 40 + Math.random() * 300;
            currentY = Math.random() * (room.config!.boardHeight + 200) - 100;
          } else if (scatterZone === 2) {
            currentX = Math.random() * (room.config!.boardWidth + 200) - 100;
            currentY = -Math.random() * 200 - pieceHeight - 50;
          } else {
            currentX = Math.random() * (room.config!.boardWidth + 200) - 100;
            currentY = room.config!.boardHeight + 40 + Math.random() * 200;
          }

          return {
            ...piece,
            currentX,
            currentY,
            isPlaced: false,
            lockedBy: null,
            groupId: piece.id
          };
        });
      }
      room.pieces = []; // Global pieces not used in competitive mode
      console.log(`[Server] ✅ Competitive game started in room ${upperCode}`);

      // Emit game_started custom pieces specifically to each player
      for (const pid of Object.keys(room.players)) {
        const p = room.players[pid];
        const playerSocket = io.sockets.sockets.get(p.socketId);
        if (playerSocket) {
          playerSocket.emit('game_started', {
            config: room.config,
            pieces: p.isSpectator ? [] : (room.playerPieces[pid] || []),
            startedAt: room.startedAt,
          });
        }
      }
    } else {
      // Cooperative mode - single shared pieces set
      room.pieces = generatePuzzlePieces(room.config);
      console.log(`[Server] ✅ Cooperative game started in room ${upperCode}: ${room.pieces.length} pieces`);
      
      io.to(upperCode).emit('game_started', {
        config: room.config,
        pieces: room.pieces,
        startedAt: room.startedAt,
      });
    }

    roomStore.setRoom(upperCode, room);
    dbStore.saveRoom(room);
    io.to(upperCode).emit('room_updated', room);
  });

  // UPDATE SETTINGS
  socket.on('update_settings', ({ roomCode, config }) => {
    const upperCode = roomCode.toUpperCase();
    console.log(`[Server] update_settings from socket ${socket.id}: room=${upperCode}`);
    const room = roomStore.getRoom(upperCode);
    if (!room) return;

    const hostPlayer = Object.values(room.players).find(p => p.socketId === socket.id);
    if (!hostPlayer || !hostPlayer.isHost) {
      console.warn(`[Server] ⚠️ update_settings rejected: not host`);
      return;
    }

    room.config = config;
    roomStore.setRoom(upperCode, room);
    dbStore.saveRoom(room);

    console.log(`[Server] ✅ Settings updated for room ${upperCode}`);
    io.to(upperCode).emit('room_updated', room);
  });

  // CHANGE GAME MODE
  socket.on('change_mode', ({ roomCode, mode }) => {
    const upperCode = roomCode.toUpperCase();
    console.log(`[Server] change_mode to ${mode} from socket ${socket.id} in room ${upperCode}`);
    const room = roomStore.getRoom(upperCode);
    if (!room) return;

    const hostPlayer = Object.values(room.players).find(p => p.socketId === socket.id);
    if (!hostPlayer || !hostPlayer.isHost) {
      console.warn(`[Server] ⚠️ change_mode rejected: not host`);
      return;
    }

    // Guard: Mode changes only allowed in lobby
    if (room.status !== 'lobby') {
      console.warn(`[Server] ⚠️ change_mode rejected: room status is not lobby`);
      return;
    }

    room.mode = mode;
    roomStore.setRoom(upperCode, room);
    dbStore.saveRoom(room);

    console.log(`[Server] ✅ Game mode updated to ${mode} in room ${upperCode}`);
    io.to(upperCode).emit('room_updated', room);
  });

  // QUIT GAME / RESIGN
  socket.on('quit_game', ({ roomCode }) => {
    const upperCode = roomCode.toUpperCase();
    console.log(`[Server] quit_game from socket ${socket.id} in room ${upperCode}`);
    const room = roomStore.getRoom(upperCode);
    if (!room) return;

    const player = Object.values(room.players).find(p => p.socketId === socket.id);
    if (!player || player.isSpectator) return;

    if (room.status !== 'playing' || room.mode !== 'competitive') return;

    if (!room.quitPlayers) room.quitPlayers = [];
    if (!room.quitPlayers.includes(player.id)) {
      room.quitPlayers.push(player.id);
      
      // Unlock all pieces on their board immediately
      const pieces = room.playerPieces?.[player.id];
      if (pieces) {
        for (const p of pieces) {
          p.lockedBy = null;
          p.lockedByName = null;
          p.lockedByColor = null;
        }
      }

      // Send system message
      const systemMessage = {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        senderColor: '#888',
        text: `🏳️ ${player.name} resigned from the race.`,
        timestamp: Date.now(),
        system: true,
      };
      room.chat.push(systemMessage);
      io.to(upperCode).emit('chat_message', systemMessage);

      // Check if all non-spectators have completed or quit
      const activePlayers = Object.values(room.players).filter(p => !p.isSpectator);
      const allDone = activePlayers.length > 0 && activePlayers.every(
        p => (room.competitiveResults?.[p.id] || room.quitPlayers?.includes(p.id))
      );

      if (allDone) {
        room.status = 'completed';
        room.completedAt = Date.now();
        io.to(upperCode).emit('game_completed', {
          completedAt: room.completedAt,
          durationSeconds: room.startedAt ? Math.round((room.completedAt - room.startedAt) / 1000) : 0,
        });
      }

      roomStore.setRoom(upperCode, room);
      dbStore.saveRoom(room);
      io.to(upperCode).emit('room_updated', room);
    }
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
    if (!room) continue;

    const player = Object.values(room.players).find(p => p.socketId === socket.id);
    if (!player) continue;

    // 1. Immediately unlock any pieces they had locked so they are not frozen for other players
    const isCompetitive = room.mode === 'competitive';
    const pieces = isCompetitive ? room.playerPieces?.[player.id] : room.pieces;
    if (pieces) {
      let unlockedAny = false;
      for (const piece of pieces) {
        if (piece.lockedBy === socket.id) {
          piece.lockedBy = null;
          piece.lockedByName = null;
          piece.lockedByColor = null;
          unlockedAny = true;
        }
      }
      
      // If cooperative and pieces were unlocked, notify clients right away so they can grab them
      if (unlockedAny && !isCompetitive) {
        io.to(code).emit('room_updated', room);
      }
    }

    // 2. Mark player offline
    player.isOffline = true;
    io.to(code).emit('room_updated', room);

    // Send system message
    const systemMessage = {
      id: `sys-${Date.now()}`,
      senderId: 'system',
      senderName: 'System',
      senderColor: '#888',
      text: `📡 ${player.name} disconnected. Reconnect window active (10s)…`,
      timestamp: Date.now(),
      system: true,
    };
    room.chat.push(systemMessage);
    io.to(code).emit('chat_message', systemMessage);

    // 3. Start a 10s grace period timeout before purging their state
    const disconnectTimeout = setTimeout(() => {
      activeDisconnectTimeouts.delete(player.id);
      
      const currentRoom = roomStore.getRoom(code);
      if (!currentRoom || !currentRoom.players[player.id]) return;

      // Verify they are still offline (didn't reconnect)
      if (currentRoom.players[player.id].isOffline) {
        console.log(`[Server] Grace period expired. Purging player ${player.name} (${player.id}) from room ${code}`);
        
        delete currentRoom.players[player.id];
        if (currentRoom.playerPieces) {
          delete currentRoom.playerPieces[player.id];
        }

        const remainingPlayerIds = Object.keys(currentRoom.players);
        if (remainingPlayerIds.length === 0) {
          // No players left at all, delete the room
          roomStore.deleteRoom(code);
          console.log(`[Server] Room ${code} empty, deleted.`);
        } else {
          // Reassign host if the host has been purged
          if (currentRoom.hostId === player.id) {
            currentRoom.hostId = remainingPlayerIds[0];
            currentRoom.players[currentRoom.hostId].isHost = true;
            console.log(`[Server] Host reassigned to player ${currentRoom.players[currentRoom.hostId].name}`);
          }

          // In competitive mode, check if all remaining non-spectator players are completed/quit
          if (currentRoom.status === 'playing' && currentRoom.mode === 'competitive') {
            const activePlayers = Object.values(currentRoom.players).filter(p => !p.isSpectator);
            const allDone = activePlayers.length > 0 && activePlayers.every(
              p => (currentRoom.competitiveResults?.[p.id] || currentRoom.quitPlayers?.includes(p.id))
            );

            if (allDone) {
              currentRoom.status = 'completed';
              currentRoom.completedAt = Date.now();
              io.to(code).emit('game_completed', {
                completedAt: currentRoom.completedAt,
                durationSeconds: currentRoom.startedAt ? Math.round((currentRoom.completedAt - currentRoom.startedAt) / 1000) : 0,
              });
            }
          }

          roomStore.setRoom(code, currentRoom);
          dbStore.saveRoom(currentRoom);

          io.to(code).emit('player_left', { playerId: player.id, playerName: player.name });
          io.to(code).emit('room_updated', currentRoom);
        }
      }
    }, 10000);

    activeDisconnectTimeouts.set(player.id, disconnectTimeout);
  }
}
