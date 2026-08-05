'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSocket, TypedSocket } from '../lib/socket';
import { RoomState, Player, ChatMessage } from '../types/room';
import { PuzzleConfig, PuzzlePieceData } from '../types/puzzle';

interface RoomContextType {
  socket: TypedSocket;
  isConnected: boolean;
  room: RoomState | null;
  player: Player | null;
  error: string | null;
  createRoom: (playerName: string, avatar: string, maxPlayers: number) => Promise<string>;
  joinRoom: (roomCode: string, playerName: string, avatar: string) => Promise<RoomState>;
  leaveRoom: () => void;
  startGame: () => void;
  updateConfig: (config: PuzzleConfig, roomCodeOverride?: string) => void;
  sendChatMessage: (text: string) => void;
  clearError: () => void;
}

const RoomContext = createContext<RoomContextType | null>(null);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket] = useState<TypedSocket>(() => getSocket());
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[RoomContext] Connecting socket...');
    socket.connect();

    function onConnect() {
      console.log('[RoomContext] ✅ Socket connected, id:', socket.id);
      setIsConnected(true);
    }

    function onDisconnect(reason: string) {
      console.warn('[RoomContext] ❌ Socket disconnected, reason:', reason);
      setIsConnected(false);
    }

    function onConnectError(err: Error) {
      console.error('[RoomContext] ❌ Socket connect_error:', err.message);
    }

    function onRoomUpdated(updatedRoom: RoomState) {
      console.log('[RoomContext] 📦 room_updated received:', updatedRoom.code, 'status:', updatedRoom.status, 'players:', Object.keys(updatedRoom.players).length);
      setRoom(updatedRoom);
      if (socket.id && updatedRoom.players[socket.id]) {
        setPlayer(updatedRoom.players[socket.id]);
      }
    }

    function onGameStarted({ config, pieces, startedAt }: { config: PuzzleConfig; pieces: PuzzlePieceData[]; startedAt: number }) {
      console.log('[RoomContext] 🎮 game_started received, pieces:', pieces.length, 'config:', config.rows, 'x', config.cols);
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'playing',
          config,
          pieces,
          startedAt,
        };
      });
    }

    function onErrorMessage({ message }: { message: string }) {
      console.error('[RoomContext] ⚠️ error_message from server:', message);
      setError(message);
    }

    function onChatMessage(message: ChatMessage) {
      console.log('[RoomContext] 💬 chat_message:', message.senderName, ':', message.text);
      setRoom((prev) => {
        if (!prev) return null;
        return { ...prev, chat: [...prev.chat, message] };
      });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('room_updated', onRoomUpdated);
    socket.on('game_started', onGameStarted);
    socket.on('error_message', onErrorMessage);
    socket.on('chat_message', onChatMessage);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('room_updated', onRoomUpdated);
      socket.off('game_started', onGameStarted);
      socket.off('error_message', onErrorMessage);
      socket.off('chat_message', onChatMessage);
    };
  }, [socket]);

  const createRoom = (playerName: string, avatar: string, maxPlayers: number): Promise<string> => {
    console.log('[RoomContext] 🚀 createRoom called:', { playerName, avatar, maxPlayers });
    console.log('[RoomContext] Socket connected?', socket.connected, 'Socket ID:', socket.id);
    if (!socket.connected) {
      console.error('[RoomContext] ❌ Cannot create room: socket not connected!');
      const err = new Error('Socket is not connected. Please wait and try again.');
      setError(err.message);
      return Promise.reject(err);
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[RoomContext] ❌ create_room timed out after 10s');
        reject(new Error('Room creation timed out. Is the server running?'));
      }, 10000);

      socket.emit('create_room', { playerName, avatar, maxPlayers }, (response) => {
        clearTimeout(timeout);
        console.log('[RoomContext] 📨 create_room callback received:', response);
        if (response.success && response.roomCode) {
          console.log('[RoomContext] ✅ Room created:', response.roomCode);
          resolve(response.roomCode);
        } else {
          console.error('[RoomContext] ❌ Room creation failed:', response.error);
          setError(response.error || 'Failed to create room');
          reject(new Error(response.error || 'Failed to create room'));
        }
      });
    });
  };

  const joinRoom = (roomCode: string, playerName: string, avatar: string): Promise<RoomState> => {
    console.log('[RoomContext] 🔗 joinRoom called:', { roomCode, playerName, avatar });
    console.log('[RoomContext] Socket connected?', socket.connected, 'Socket ID:', socket.id);
    if (!socket.connected) {
      console.error('[RoomContext] ❌ Cannot join room: socket not connected!');
      const err = new Error('Socket is not connected. Please wait and try again.');
      setError(err.message);
      return Promise.reject(err);
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[RoomContext] ❌ join_room timed out after 10s');
        reject(new Error('Join room timed out. Is the server running?'));
      }, 10000);

      socket.emit('join_room', { roomCode, playerName, avatar }, (response) => {
        clearTimeout(timeout);
        console.log('[RoomContext] 📨 join_room callback received:', response);
        if (response.success && response.room) {
          console.log('[RoomContext] ✅ Joined room:', response.room.code);
          setRoom(response.room);
          if (socket.id && response.room.players[socket.id]) {
            setPlayer(response.room.players[socket.id]);
          }
          resolve(response.room);
        } else {
          console.error('[RoomContext] ❌ Join room failed:', response.error);
          setError(response.error || 'Failed to join room');
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  };

  const leaveRoom = () => {
    if (room) {
      socket.emit('leave_room', { roomCode: room.code });
      setRoom(null);
      setPlayer(null);
    }
  };

  const startGame = () => {
    if (room) {
      console.log('[RoomContext] ▶️ startGame emitting for room:', room.code);
      socket.emit('start_game', { roomCode: room.code });
    } else {
      console.warn('[RoomContext] ⚠️ startGame called but no room set');
    }
  };

  const updateConfig = (config: PuzzleConfig, roomCodeOverride?: string) => {
    const code = roomCodeOverride || room?.code;
    if (code) {
      console.log('[RoomContext] ⚙️ updateConfig for room:', code, 'image:', config.imageTitle);
      socket.emit('update_settings', { roomCode: code, config });
    } else {
      console.warn('[RoomContext] ⚠️ updateConfig called but no room code available');
    }
  };

  const sendChatMessage = (text: string) => {
    if (room && text.trim()) {
      socket.emit('send_chat', { roomCode: room.code, text });
    }
  };

  const clearError = () => setError(null);

  return (
    <RoomContext.Provider
      value={{
        socket,
        isConnected,
        room,
        player,
        error,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        updateConfig,
        sendChatMessage,
        clearError,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};
