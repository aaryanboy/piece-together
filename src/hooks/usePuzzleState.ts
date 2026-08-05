'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRoom } from '../context/RoomContext';
import { PuzzlePieceData } from '../types/puzzle';
import { SNAP_DISTANCE_THRESHOLD } from '../lib/constants';

export function usePuzzleState() {
  const { socket, room } = useRoom();
  const [pieces, setPieces] = useState<PuzzlePieceData[]>([]);
  const [activePieceId, setActivePieceId] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completionData, setCompletionData] = useState<{ durationSeconds: number } | null>(null);

  const piecesRef = useRef<PuzzlePieceData[]>([]);
  piecesRef.current = pieces;

  // Sync pieces from room state
  useEffect(() => {
    if (room?.pieces) {
      setPieces(room.pieces);
      const placed = room.pieces.filter((p) => p.isPlaced).length;
      const total = room.pieces.length;
      if (total > 0) {
        setProgressPercent(Math.round((placed / total) * 100));
      }
    }
  }, [room?.pieces]);

  // Socket listeners for real-time piece movements, locks, snaps
  useEffect(() => {
    if (!socket) return;

    function onPieceLocked({ pieceId, lockedBy, lockedByName, lockedByColor }: { pieceId: number; lockedBy: string; lockedByName: string; lockedByColor: string }) {
      setPieces((prev) =>
        prev.map((p) => {
          if (p.id === pieceId || (p.groupId && p.groupId === prev.find((item) => item.id === pieceId)?.groupId)) {
            return { ...p, lockedBy, lockedByName, lockedByColor };
          }
          return p;
        })
      );
    }

    function onPieceUnlocked({ pieceId }: { pieceId: number }) {
      setPieces((prev) =>
        prev.map((p) => {
          if (p.id === pieceId || (p.groupId && p.groupId === prev.find((item) => item.id === pieceId)?.groupId)) {
            return { ...p, lockedBy: null, lockedByName: null, lockedByColor: null };
          }
          return p;
        })
      );
    }

    function onPieceMoved({ pieceId, x, y }: { pieceId: number; x: number; y: number }) {
      setPieces((prev) => {
        const target = prev.find((p) => p.id === pieceId);
        if (!target) return prev;

        const deltaX = x - target.currentX;
        const deltaY = y - target.currentY;

        return prev.map((p) => {
          if (p.groupId && p.groupId === target.groupId) {
            return { ...p, currentX: p.currentX + deltaX, currentY: p.currentY + deltaY };
          }
          if (p.id === pieceId) {
            return { ...p, currentX: x, currentY: y };
          }
          return p;
        });
      });
    }

    function onPiecesSnapped({ pieceIds, targetX, targetY, groupId, isPlaced, progressPercent }: { pieceIds: number[]; targetX: number; targetY: number; groupId: number; isPlaced: boolean; progressPercent: number }) {
      setProgressPercent(progressPercent);
      setPieces((prev) => {
        const anchor = prev.find((p) => pieceIds.includes(p.id));
        if (!anchor) return prev;

        const deltaX = targetX - anchor.currentX;
        const deltaY = targetY - anchor.currentY;

        return prev.map((p) => {
          if (pieceIds.includes(p.id) || (p.groupId && pieceIds.some((id) => prev.find((item) => item.id === id)?.groupId === p.groupId))) {
            return {
              ...p,
              currentX: p.currentX + deltaX,
              currentY: p.currentY + deltaY,
              groupId,
              isPlaced,
              lockedBy: null,
            };
          }
          return p;
        });
      });
    }

    function onGameCompleted({ durationSeconds }: { durationSeconds: number }) {
      setIsCompleted(true);
      setCompletionData({ durationSeconds });
    }

    socket.on('piece_locked', onPieceLocked);
    socket.on('piece_unlocked', onPieceUnlocked);
    socket.on('piece_moved', onPieceMoved);
    socket.on('pieces_snapped', onPiecesSnapped);
    socket.on('game_completed', onGameCompleted);

    return () => {
      socket.off('piece_locked', onPieceLocked);
      socket.off('piece_unlocked', onPieceUnlocked);
      socket.off('piece_moved', onPieceMoved);
      socket.off('pieces_snapped', onPiecesSnapped);
      socket.off('game_completed', onGameCompleted);
    };
  }, [socket]);

  // Handle local drag start
  const handleDragStart = useCallback(
    (pieceId: number) => {
      if (!room) return;
      const target = piecesRef.current.find((p) => p.id === pieceId);
      if (!target || (target.lockedBy && target.lockedBy !== socket.id)) return;

      setActivePieceId(pieceId);
      socket.emit('lock_piece', { roomCode: room.code, pieceId });
    },
    [socket, room]
  );

  // Handle local drag movement
  const handleDragMove = useCallback(
    (pieceId: number, x: number, y: number) => {
      if (!room || activePieceId !== pieceId) return;

      // Optimistic local update
      setPieces((prev) => {
        const target = prev.find((p) => p.id === pieceId);
        if (!target) return prev;

        const deltaX = x - target.currentX;
        const deltaY = y - target.currentY;

        return prev.map((p) => {
          if (p.groupId && p.groupId === target.groupId) {
            return { ...p, currentX: p.currentX + deltaX, currentY: p.currentY + deltaY };
          }
          if (p.id === pieceId) {
            return { ...p, currentX: x, currentY: y };
          }
          return p;
        });
      });

      socket.emit('move_piece', { roomCode: room.code, pieceId, x, y });
    },
    [socket, room, activePieceId]
  );

  // Handle local drag release / snap check
  const handleDragEnd = useCallback(
    (pieceId: number) => {
      if (!room || activePieceId !== pieceId) return;
      setActivePieceId(null);

      const allPieces = piecesRef.current;
      const activePiece = allPieces.find((p) => p.id === pieceId);

      if (!activePiece) {
        socket.emit('unlock_piece', { roomCode: room.code, pieceId });
        return;
      }

      // Check distance to target spot on board
      const distToTarget = Math.hypot(activePiece.currentX - activePiece.targetX, activePiece.currentY - activePiece.targetY);

      if (distToTarget <= SNAP_DISTANCE_THRESHOLD) {
        // Snap to board target!
        const groupPieceIds = allPieces
          .filter((p) => p.groupId === activePiece.groupId || p.id === pieceId)
          .map((p) => p.id);

        socket.emit('snap_pieces', {
          roomCode: room.code,
          pieceIds: groupPieceIds,
          targetX: activePiece.targetX,
          targetY: activePiece.targetY,
          groupId: activePiece.groupId,
          isPlaced: true,
        });
        return;
      }

      // Check distance to neighboring pieces for group snapping
      let mergedNeighbor: PuzzlePieceData | null = null;

      for (const other of allPieces) {
        if (other.id === activePiece.id || (other.groupId && other.groupId === activePiece.groupId)) continue;

        // Check if neighboring grid tile
        const isNeighbor =
          (Math.abs(other.gridX - activePiece.gridX) === 1 && other.gridY === activePiece.gridY) ||
          (Math.abs(other.gridY - activePiece.gridY) === 1 && other.gridX === activePiece.gridX);

        if (isNeighbor) {
          const expectedOffsetX = (activePiece.gridX - other.gridX) * activePiece.width;
          const expectedOffsetY = (activePiece.gridY - other.gridY) * activePiece.height;

          const actualOffsetX = activePiece.currentX - other.currentX;
          const actualOffsetY = activePiece.currentY - other.currentY;

          const dist = Math.hypot(actualOffsetX - expectedOffsetX, actualOffsetY - expectedOffsetY);

          if (dist <= SNAP_DISTANCE_THRESHOLD) {
            mergedNeighbor = other;
            break;
          }
        }
      }

      if (mergedNeighbor) {
        // Merge piece group into neighbor's group
        const targetGroupX = mergedNeighbor.currentX + (activePiece.gridX - mergedNeighbor.gridX) * activePiece.width;
        const targetGroupY = mergedNeighbor.currentY + (activePiece.gridY - mergedNeighbor.gridY) * activePiece.height;

        const activeGroupPieceIds = allPieces
          .filter((p) => p.groupId === activePiece.groupId || p.id === pieceId)
          .map((p) => p.id);

        socket.emit('snap_pieces', {
          roomCode: room.code,
          pieceIds: activeGroupPieceIds,
          targetX: targetGroupX,
          targetY: targetGroupY,
          groupId: mergedNeighbor.groupId,
          isPlaced: mergedNeighbor.isPlaced,
        });
      } else {
        // Release lock
        socket.emit('unlock_piece', { roomCode: room.code, pieceId });
      }
    },
    [socket, room, activePieceId]
  );

  return {
    pieces,
    activePieceId,
    progressPercent,
    isCompleted,
    completionData,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
