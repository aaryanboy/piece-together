/**
 * Generate simple, memorable 4-digit room code (e.g. 4829, 1052).
 */
export function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
