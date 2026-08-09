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
      progressPercent,
      pieces: serverPieces,
    }: {
      anchorPieceId: number;
      pieceIds: number[];
      targetX: number;
      targetY: number;
      groupId: number;
      isPlaced: boolean;
      progressPercent: number;
      pieces?: PuzzlePieceData[];
    }) {
      setProgressPercent(progressPercent);
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

    function onSnapRejected({ pieceIds: _pieceIds, pieces: updatedPieces }: { pieceIds: number[]; pieces: PuzzlePieceData[] }) {
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
  }, [socket]);

  // Handle local drag start
  const handleDragStart = useCallback(
    (pieceId: number) => {
      if (!room) return;
      const target = piecesRef.current.find((p) => p.id === pieceId);
      if (!target || target.isPlaced || (target.lockedBy && target.lockedBy !== socket.id)) return;

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

      if (!activePiece || activePiece.isPlaced) {
        socket.emit('unlock_piece', { roomCode: room.code, pieceId });
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

        socket.emit('snap_pieces', {
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

      // Check distance to neighboring pieces for group snapping (group-to-group)
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

        socket.emit('snap_pieces', {
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
        socket.emit('unlock_piece', { roomCode: room.code, pieceId });
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

    socket.emit('fix_placed_pieces', { roomCode: room.code });
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
