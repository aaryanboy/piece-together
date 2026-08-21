'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRoom } from '../context/RoomContext';
import { PuzzlePieceData } from '../types/puzzle';
import { SNAP_DISTANCE_THRESHOLD } from '../lib/constants';

export function usePuzzleState() {
  const { socket, room } = useRoom();
  const [pieces, setPieces] = useState<PuzzlePieceData[]>([]);
  const [activePieceId, setActivePieceId] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completionData, setCompletionData] = useState<{ durationSeconds: number } | null>(null);

  const piecesRef = useRef<PuzzlePieceData[]>([]);

  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);

  // Derive source pieces from room state
  const sourcePieces = useMemo(() => {
    if (room?.pieces && room.mode !== 'competitive') return room.pieces;
    if (room?.mode === 'competitive') {
      const myId = typeof window !== 'undefined' ? localStorage.getItem('piece-together-player-id') : null;
      if (myId && room.playerPieces?.[myId]) return room.playerPieces[myId];
      // Fallback: game_started event may set room.pieces to player's own pieces
      if (room.pieces && room.pieces.length > 0) return room.pieces;
    }
    return null;
  }, [room?.pieces, room?.playerPieces, room?.mode]);

  // Track last synced source reference to avoid overwriting optimistic updates
  const [lastSyncedSource, setLastSyncedSource] = useState<PuzzlePieceData[] | null>(null);

  // Adjust state during render when source reference changes (React-recommended pattern)
  if (sourcePieces && sourcePieces !== lastSyncedSource) {
    setLastSyncedSource(sourcePieces);
    setPieces(sourcePieces);
  }

  // Derived progress percentage
  const progressPercent = useMemo(() => {
    if (pieces.length === 0) return 0;
    const placed = pieces.filter((p) => p.isPlaced).length;
    return Math.round((placed / pieces.length) * 100);
  }, [pieces]);

  // Socket listeners for real-time piece movements, locks, snaps
  useEffect(() => {
    if (!socket) return;

    const myId = typeof window !== 'undefined' ? localStorage.getItem('piece-together-player-id') : null;

    function onPieceLocked({ pieceId, lockedBy, lockedByName, lockedByColor, playerId }: { pieceId: number; lockedBy: string; lockedByName: string; lockedByColor: string; playerId?: string }) {
      if (room?.mode === 'competitive' && playerId !== myId) return;
      
      setPieces((prev) =>
        prev.map((p) => {
          if (p.id === pieceId || (p.groupId && p.groupId === prev.find((item) => item.id === pieceId)?.groupId)) {
            return { ...p, lockedBy, lockedByName, lockedByColor };
          }
          return p;
        })
      );
    }

    function onPieceUnlocked({ pieceId, playerId }: { pieceId: number; playerId?: string }) {
      if (room?.mode === 'competitive' && playerId !== myId) return;

      setPieces((prev) =>
        prev.map((p) => {
          if (p.id === pieceId || (p.groupId && p.groupId === prev.find((item) => item.id === pieceId)?.groupId)) {
            return { ...p, lockedBy: null, lockedByName: null, lockedByColor: null };
          }
          return p;
        })
      );
    }

    function onPieceMoved({ pieceId, x, y, playerId }: { pieceId: number; x: number; y: number; playerId?: string }) {
      if (room?.mode === 'competitive' && playerId !== myId) return;

      setPieces((prev) => {
        const target = prev.find((p) => p.id === pieceId);
        if (!target || target.isPlaced) return prev;

        return prev.map((p) => {
          if (p.groupId && p.groupId === target.groupId) {
            return {
              ...p,
              currentX: x + (p.targetX - target.targetX),
              currentY: y + (p.targetY - target.targetY),
            };
          }
          if (p.id === pieceId) {
            return { ...p, currentX: x, currentY: y };
          }
          return p;
        });
      });
    }

    function onPiecesSnapped({
      anchorPieceId,
      pieceIds,
      targetX,
      targetY,
      groupId,
      isPlaced,
      playerId,
      pieces: serverPieces,
    }: {
      anchorPieceId: number;
      pieceIds: number[];
      targetX: number;
      targetY: number;
      groupId: number;
      isPlaced: boolean;
      progressPercent: number;
      playerId?: string;
      pieces?: PuzzlePieceData[];
    }) {
      if (room?.mode === 'competitive' && playerId !== myId) return;

      setPieces((prev) => {
        if (serverPieces && serverPieces.length > 0) {
          return prev.map((p) => {
            const match = serverPieces.find((s) => s.id === p.id);
            if (match) {
              return {
                ...p,
                ...match,
                lockedBy: null,
                lockedByName: null,
                lockedByColor: null,
              };
            }
            return p;
          });
        }

        const anchor = prev.find((p) => p.id === anchorPieceId) || prev.find((p) => pieceIds.includes(p.id));
        if (!anchor) return prev;

        return prev.map((p) => {
          if (pieceIds.includes(p.id) || (p.groupId && pieceIds.some((id) => prev.find((item) => item.id === id)?.groupId === p.groupId))) {
            return {
              ...p,
              currentX: isPlaced ? p.targetX : targetX + (p.targetX - anchor.targetX),
              currentY: isPlaced ? p.targetY : targetY + (p.targetY - anchor.targetY),
              groupId,
              isPlaced,
              lockedBy: null,
              lockedByName: null,
              lockedByColor: null,
            };
          }
          return p;
        });
      });
    }

    function onSnapRejected({ pieces: updatedPieces, playerId }: { pieceIds: number[]; pieces: PuzzlePieceData[]; playerId?: string }) {
      if (room?.mode === 'competitive' && playerId !== myId) return;

      setPieces((prev) =>
        prev.map((p) => {
          const match = updatedPieces.find((u) => u.id === p.id);
          if (match) {
            return { ...p, ...match };
          }
          return p;
        })
      );
    }

    function onGameCompleted({ durationSeconds }: { durationSeconds: number }) {
      setIsCompleted(true);
      setCompletionData({ durationSeconds });
    }

    socket.on('piece_locked', onPieceLocked);
    socket.on('piece_unlocked', onPieceUnlocked);
    socket.on('piece_moved', onPieceMoved);
    socket.on('pieces_snapped', onPiecesSnapped);
    socket.on('snap_rejected', onSnapRejected);
    socket.on('game_completed', onGameCompleted);

    return () => {
      socket.off('piece_locked', onPieceLocked);
      socket.off('piece_unlocked', onPieceUnlocked);
      socket.off('piece_moved', onPieceMoved);
      socket.off('pieces_snapped', onPiecesSnapped);
      socket.off('snap_rejected', onSnapRejected);
      socket.off('game_completed', onGameCompleted);
    };
  }, [socket, room?.mode]);

  // Handle local drag start
  const handleDragStart = useCallback(
    (pieceId: number) => {
      if (!room) return;
      const target = piecesRef.current.find((p) => p.id === pieceId);
      if (!target || target.isPlaced || (target.lockedBy && target.lockedBy !== socket?.id)) return;

      setActivePieceId(pieceId);
      socket?.emit('lock_piece', { roomCode: room.code, pieceId });
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
        if (!target || target.isPlaced) return prev;

        return prev.map((p) => {
          if (p.groupId && p.groupId === target.groupId) {
            return {
              ...p,
              currentX: x + (p.targetX - target.targetX),
              currentY: y + (p.targetY - target.targetY),
            };
          }
          if (p.id === pieceId) {
            return { ...p, currentX: x, currentY: y };
          }
          return p;
        });
      });

      socket?.emit('move_piece', { roomCode: room.code, pieceId, x, y });
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

      if (!activePiece || activePiece.isPlaced) {
        socket?.emit('unlock_piece', { roomCode: room.code, pieceId });
        return;
      }

      const activeGroup = allPieces.filter((p) => p.groupId === activePiece.groupId || p.id === pieceId);

      // Check distance to target spot on board
      const distToTarget = Math.hypot(activePiece.currentX - activePiece.targetX, activePiece.currentY - activePiece.targetY);

      if (distToTarget <= SNAP_DISTANCE_THRESHOLD) {
        // Optimistic local snap to board target!
        const groupPieceIds = activeGroup.map((p) => p.id);
        setPieces((prev) =>
          prev.map((p) => {
            if (groupPieceIds.includes(p.id)) {
              return {
                ...p,
                currentX: p.targetX,
                currentY: p.targetY,
                isPlaced: true,
                lockedBy: null,
                lockedByName: null,
                lockedByColor: null,
              };
            }
            return p;
          })
        );

        socket?.emit('snap_pieces', {
          roomCode: room.code,
          anchorPieceId: activePiece.id,
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
      let snapAnchorPiece: PuzzlePieceData | null = null;
      let minNeighborDist = Infinity;

      for (const pA of activeGroup) {
        for (const pB of allPieces) {
          if (pB.id === pA.id || pB.groupId === pA.groupId) continue;

          const isNeighbor =
            (Math.abs(pB.gridX - pA.gridX) === 1 && pB.gridY === pA.gridY) ||
            (Math.abs(pB.gridY - pA.gridY) === 1 && pB.gridX === pA.gridX);

          if (isNeighbor) {
            const expectedOffsetX = pA.targetX - pB.targetX;
            const expectedOffsetY = pA.targetY - pB.targetY;

            const actualOffsetX = pA.currentX - pB.currentX;
            const actualOffsetY = pA.currentY - pB.currentY;

            const dist = Math.hypot(actualOffsetX - expectedOffsetX, actualOffsetY - expectedOffsetY);

            if (dist <= SNAP_DISTANCE_THRESHOLD && dist < minNeighborDist) {
              minNeighborDist = dist;
              mergedNeighbor = pB;
              snapAnchorPiece = pA;
            }
          }
        }
      }

      if (mergedNeighbor && snapAnchorPiece) {
        const targetGroupX = mergedNeighbor.currentX + (snapAnchorPiece.targetX - mergedNeighbor.targetX);
        const targetGroupY = mergedNeighbor.currentY + (snapAnchorPiece.targetY - mergedNeighbor.targetY);
        const targetGroupId = mergedNeighbor.groupId || mergedNeighbor.id;
        const targetIsPlaced = mergedNeighbor.isPlaced;

        const activeGroupPieceIds = activeGroup.map((p) => p.id);

        // Optimistic local update
        setPieces((prev) =>
          prev.map((p) => {
            if (activeGroupPieceIds.includes(p.id)) {
              return {
                ...p,
                currentX: targetIsPlaced ? p.targetX : targetGroupX + (p.targetX - snapAnchorPiece!.targetX),
                currentY: targetIsPlaced ? p.targetY : targetGroupY + (p.targetY - snapAnchorPiece!.targetY),
                groupId: targetGroupId,
                isPlaced: targetIsPlaced,
                lockedBy: null,
                lockedByName: null,
                lockedByColor: null,
              };
            }
            return p;
          })
        );

        socket?.emit('snap_pieces', {
          roomCode: room.code,
          anchorPieceId: snapAnchorPiece.id,
          pieceIds: activeGroupPieceIds,
          targetX: targetGroupX,
          targetY: targetGroupY,
          groupId: targetGroupId,
          isPlaced: targetIsPlaced,
          neighborPieceId: mergedNeighbor.id,
        });
      } else {
        socket?.emit('unlock_piece', { roomCode: room.code, pieceId });
      }
    },
    [socket, room, activePieceId]
  );

  // Auto-align all placed or stuck pieces into exact target coordinates
  const handleFixPlacedPieces = useCallback(() => {
    if (!room) return;

    setPieces((prev) =>
      prev.map((p) => {
        if (p.isPlaced || p.lockedBy !== null) {
          return {
            ...p,
            currentX: p.targetX,
            currentY: p.targetY,
            isPlaced: true,
            lockedBy: null,
            lockedByName: null,
            lockedByColor: null,
          };
        }
        return p;
      })
    );

    socket?.emit('fix_placed_pieces', { roomCode: room.code });
  }, [socket, room]);

  return {
    pieces,
    activePieceId,
    progressPercent,
    isCompleted,
    completionData,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleFixPlacedPieces,
  };
}
