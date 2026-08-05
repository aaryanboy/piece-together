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
    socket.connect();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onRoomUpdated(updatedRoom: RoomState) {
      setRoom(updatedRoom);
      if (socket.id && updatedRoom.players[socket.id]) {
        setPlayer(updatedRoom.players[socket.id]);
      }
    }

    function onGameStarted({ config, pieces, startedAt }: { config: PuzzleConfig; pieces: PuzzlePieceData[]; startedAt: number }) {
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
      setError(message);
    }

    function onChatMessage(message: ChatMessage) {
      setRoom((prev) => {
        if (!prev) return null;
        return { ...prev, chat: [...prev.chat, message] };
      });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_updated', onRoomUpdated);
    socket.on('game_started', onGameStarted);
    socket.on('error_message', onErrorMessage);
    socket.on('chat_message', onChatMessage);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_updated', onRoomUpdated);
      socket.off('game_started', onGameStarted);
      socket.off('error_message', onErrorMessage);
      socket.off('chat_message', onChatMessage);
    };
  }, [socket]);

  const createRoom = (playerName: string, avatar: string, maxPlayers: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      socket.emit('create_room', { playerName, avatar, maxPlayers }, (response) => {
        if (response.success && response.roomCode) {
          resolve(response.roomCode);
        } else {
          setError(response.error || 'Failed to create room');
          reject(new Error(response.error || 'Failed to create room'));
        }
      });
    });
  };

  const joinRoom = (roomCode: string, playerName: string, avatar: string): Promise<RoomState> => {
    return new Promise((resolve, reject) => {
      socket.emit('join_room', { roomCode, playerName, avatar }, (response) => {
        if (response.success && response.room) {
          setRoom(response.room);
          if (socket.id && response.room.players[socket.id]) {
            setPlayer(response.room.players[socket.id]);
          }
          resolve(response.room);
        } else {
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
      socket.emit('start_game', { roomCode: room.code });
    }
  };

  const updateConfig = (config: PuzzleConfig, roomCodeOverride?: string) => {
    const code = roomCodeOverride || room?.code;
    if (code) {
      socket.emit('update_settings', { roomCode: code, config });
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
