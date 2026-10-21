import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { roomStore } from './utils/roomStore';
import { dbStore } from './utils/dbStore';
import { registerRoomHandlers, handlePlayerDisconnect } from './handlers/roomHandlers';
import { registerPieceHandlers } from './handlers/pieceHandlers';
import { registerMiniGameHandlers } from './handlers/miniGameHandlers';
import { ClientToServerEvents, ServerToClientEvents } from '../src/types/events';

const app = express();
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : '*';
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Rehydrate active rooms from SQLite/JSON persistence on startup
try {
  const savedRooms = dbStore.loadAllRooms();
  for (const room of savedRooms) {
    // Reset transient player status on server restart
    room.players = {};
    if (room.game && room.game !== 'jigsaw' && room.status !== 'lobby') {
      room.status = 'lobby';
      room.startedAt = null;
      room.completedAt = null;
      room.elapsedSeconds = undefined;
      room.competitiveResults = {};
      room.quitPlayers = [];
    }
    roomStore.setRoom(room.code, room);
    dbStore.saveRoom(room);
  }
  console.log(`[Server] Rehydrated ${savedRooms.length} rooms from storage.`);
} catch (err) {
  console.error('[Server] Failed to rehydrate rooms:', err);
}

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: roomStore.getAllRooms().length,
    timestamp: new Date().toISOString(),
  });
});

io.on('connection', (socket) => {
  console.log(`[Socket Connected] Socket ID: ${socket.id}`);

  registerRoomHandlers(io, socket);
  registerPieceHandlers(io, socket);
  registerMiniGameHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] Socket ID: ${socket.id}`);
    handlePlayerDisconnect(io, socket);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Socket.io Server running on port ${PORT}`);
});
