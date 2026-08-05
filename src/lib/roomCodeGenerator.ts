const ADJECTIVES = ['HAPPY', 'CLEVER', 'SWIFT', 'BRIGHT', 'COZY', 'GOLDEN', 'MAGIC', 'SHINY', 'NEON', 'ZEN'];
const NOUNS = ['PUZZLE', 'PIECE', 'CORNER', 'JIGSAW', 'BORDER', 'SOLVER', 'CANVAS', 'SHAPE'];

export function generateRoomCode(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}-${noun}-${num}`;
}
