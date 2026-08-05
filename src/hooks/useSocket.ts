'use client';

import { useRoom } from '../context/RoomContext';

export function useSocket() {
  const { socket, isConnected, error, clearError } = useRoom();
  return { socket, isConnected, error, clearError };
}
