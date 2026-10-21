import { Server, Socket } from 'socket.io';
import { MiniGameState, MinesweeperGameState, RoomState, SudokuGameState } from '../../src/types/room';
import { dbStore } from '../utils/dbStore';
import { roomStore } from '../utils/roomStore';

type SudokuSession = { state: SudokuGameState };
type MinesweeperSession = { state: MinesweeperGameState; mines: boolean[] };
type PlayerSession = SudokuSession | MinesweeperSession;
type RoomSession = { shared?: PlayerSession; players: Record<string, PlayerSession> };

const sessions = new Map<string, RoomSession>();

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function makeSudoku(difficulty: SudokuGameState['difficulty']): SudokuSession {
  const groups = shuffle([0, 1, 2]);
  const rows = shuffle(groups.flatMap((group) => shuffle([0, 1, 2]).map((row) => group * 3 + row)));
  const columns = shuffle(groups.flatMap((group) => shuffle([0, 1, 2]).map((col) => group * 3 + col)));
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const solution = rows.map((row) =>
    columns.map((col) => digits[(row * 3 + Math.floor(row / 3) + col) % 9])
  );
  const puzzle = solution.map((row) => [...row]);
  const blanks = difficulty === 'easy' ? 34 : difficulty === 'medium' ? 44 : 52;
  for (const index of shuffle(Array.from({ length: 81 }, (_, i) => i)).slice(0, blanks)) {
    puzzle[Math.floor(index / 9)][index % 9] = 0;
  }
  return {
    state: {
      game: 'sudoku',
      difficulty,
      puzzle,
      board: puzzle.map((row) => [...row]),
      given: puzzle.map((row) => row.map((value) => value !== 0)),
      status: 'playing',
    },
  };
}

function makeMinesweeper(difficulty: MinesweeperGameState['difficulty']): MinesweeperSession {
  const settings = {
    beginner: { rows: 9, cols: 9, mineCount: 10 },
    intermediate: { rows: 16, cols: 16, mineCount: 40 },
    expert: { rows: 16, cols: 30, mineCount: 99 },
  }[difficulty];
  const { rows, cols, mineCount } = settings;
  const mines = Array.from({ length: rows * cols }, (_, index) => index < mineCount);
  const shuffledMines = shuffle(mines);
  return {
    mines: shuffledMines,
    state: {
      game: 'minesweeper',
      difficulty,
      rows,
      cols,
      mineCount,
      cells: shuffledMines.map(() => ({ revealed: false, flagged: false })),
      status: 'playing',
    },
  };
}

function cloneSession(session: PlayerSession): PlayerSession {
  if ('mines' in session) {
    return { mines: [...session.mines], state: { ...session.state, cells: session.state.cells.map((cell) => ({ ...cell })) } };
  }
  return {
    state: {
      ...session.state,
      puzzle: session.state.puzzle.map((row) => [...row]),
      board: session.state.board.map((row) => [...row]),
      given: session.state.given.map((row) => [...row]),
    },
  };
}

function publicState(session: PlayerSession): MiniGameState {
  return session.state;
}

function saveAndPublish(io: Server, room: RoomState, playerId?: string) {
  roomStore.setRoom(room.code, room);
  dbStore.saveRoom(room);
  const session = sessions.get(room.code);
  if (!session) return;
  if (room.mode === 'competitive') {
    const ids = playerId ? [playerId] : Object.keys(session.players);
    for (const id of ids) {
      const player = room.players[id];
      const playerSession = session.players[id];
      if (player?.socketId && playerSession) {
        io.to(player.socketId).emit('mini_game_state', publicState(playerSession));
      }
    }
  } else if (session.shared) {
    io.to(room.code).emit('mini_game_state', publicState(session.shared));
  }
  io.to(room.code).emit('room_updated', room);
}

function maybeComplete(io: Server, room: RoomState, session: PlayerSession, playerId?: string) {
  session.state.status = 'won';

  const completedAt = Date.now();
  const durationSeconds = room.startedAt ? Math.round((completedAt - room.startedAt) / 1000) : 0;
  room.elapsedSeconds = durationSeconds;

  if (room.mode === 'competitive' && playerId) {
    const place = Object.keys(room.competitiveResults ?? {}).length + 1;
    room.competitiveResults = room.competitiveResults ?? {};
    room.competitiveResults[playerId] = { finishedAt: completedAt, durationSeconds, place };
    const activePlayers = Object.values(room.players).filter((player) => !player.isSpectator);
    const allDone = activePlayers.every((player) =>
      room.competitiveResults?.[player.id] || room.quitPlayers?.includes(player.id)
    );
    if (allDone) {
      room.status = 'completed';
      room.completedAt = completedAt;
    }
  } else {
    room.status = 'completed';
    room.completedAt = completedAt;
  }

  if (room.status === 'completed') {
    io.to(room.code).emit('game_completed', { completedAt, durationSeconds });
  }
}

function updateMineCounts(session: MinesweeperSession) {
  const { rows, cols, cells } = session.state;
  cells.forEach((cell, index) => {
    if (!cell.revealed) {
      delete cell.adjacent;
      if (session.state.status !== 'lost') delete cell.mine;
      return;
    }
    const row = Math.floor(index / cols);
    const col = index % cols;
    let adjacent = 0;
    for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
      for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
        if (session.mines[r * cols + c]) adjacent++;
      }
    }
    cell.adjacent = adjacent;
  });
}

function revealMine(session: MinesweeperSession, index: number) {
  const { rows, cols, cells } = session.state;
  if (index < 0 || index >= cells.length || cells[index].flagged || cells[index].revealed) return;
  if (session.mines[index] && !cells.some((cell) => cell.revealed)) {
    session.mines[index] = false;
    const replacement = session.mines.findIndex((mine, next) => !mine && next !== index);
    if (replacement >= 0) session.mines[replacement] = true;
  }

  const reveal = (cellIndex: number) => {
    if (cellIndex < 0 || cellIndex >= cells.length) return;
    const cell = cells[cellIndex];
    if (cell.revealed || cell.flagged) return;
    if (session.mines[cellIndex]) {
      cell.revealed = true;
      cell.mine = true;
      session.state.status = 'lost';
      cells.forEach((other, i) => {
        if (session.mines[i]) other.mine = true;
      });
      return;
    }
    cell.revealed = true;
    const row = Math.floor(cellIndex / cols);
    const col = cellIndex % cols;
    let adjacent = 0;
    for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
      for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
        if (session.mines[r * cols + c]) adjacent++;
      }
    }
    cell.adjacent = adjacent;
    if (adjacent === 0) {
      for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
          reveal(r * cols + c);
        }
      }
    }
  };

  reveal(index);
  if (session.state.status === 'playing' && cells.filter((cell) => cell.revealed).length === cells.length - session.state.mineCount) {
    session.state.status = 'won';
  }
  updateMineCounts(session);
}

export function clearMiniGame(roomCode: string) {
  sessions.delete(roomCode.toUpperCase());
}

export function startMiniGame(io: Server, room: RoomState) {
  for (const player of Object.values(room.players)) player.isSpectator = false;
  const baseSession = room.game === 'minesweeper'
    ? makeMinesweeper(room.gameDifficulty === 'intermediate' || room.gameDifficulty === 'expert' ? room.gameDifficulty : 'beginner')
    : makeSudoku(room.gameDifficulty === 'easy' || room.gameDifficulty === 'hard' ? room.gameDifficulty : 'medium');
  const session: RoomSession = { players: {} };
  if (room.mode === 'competitive') {
    for (const player of Object.values(room.players)) {
      if (!player.isSpectator) session.players[player.id] = cloneSession(baseSession);
    }
  } else {
    session.shared = baseSession;
  }
  sessions.set(room.code, session);

  room.status = 'playing';
  room.startedAt = Date.now();
  room.completedAt = null;
  room.elapsedSeconds = undefined;
  room.pieces = [];
  room.playerPieces = {};
  room.competitiveResults = {};
  room.quitPlayers = [];
  roomStore.setRoom(room.code, room);
  dbStore.saveRoom(room);

  if (room.mode === 'competitive') {
    for (const [playerId, playerSession] of Object.entries(session.players)) {
      const player = room.players[playerId];
      if (player?.socketId) io.to(player.socketId).emit('mini_game_state', publicState(playerSession));
    }
  } else if (session.shared) {
    io.to(room.code).emit('mini_game_state', publicState(session.shared));
  }
  io.to(room.code).emit('room_updated', room);
}

export function sendMiniGameStateToPlayer(io: Server, room: RoomState, playerId: string) {
  const session = sessions.get(room.code);
  if (!session) return;
  const playerSession = room.mode === 'competitive' ? session.players[playerId] : session.shared;
  const player = room.players[playerId];
  if (player?.socketId && playerSession) {
    io.to(player.socketId).emit('mini_game_state', publicState(playerSession));
  }
}

export function registerMiniGameHandlers(io: Server, socket: Socket) {
  socket.on('mini_game_action', ({ roomCode, action }) => {
    const code = roomCode.toUpperCase();
    const room = roomStore.getRoom(code);
    const player = room && Object.values(room.players).find((entry) => entry.socketId === socket.id);
    const session = sessions.get(code);
    if (!room || !player || player.isSpectator || room.status !== 'playing' || !session) return;

    const playerSession = room.mode === 'competitive' ? session.players[player.id] : session.shared;
    if (!playerSession || playerSession.state.status !== 'playing') return;

    if (action.type === 'sudoku_set' && playerSession.state.game === 'sudoku') {
      const { row, col, value } = action;
      const sudoku = playerSession.state;
      if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row > 8 || col < 0 || col > 8 ||
        (value !== null && (!Number.isInteger(value) || value < 1 || value > 9)) || sudoku.given[row][col]) return;
      if (value !== null) {
        for (let i = 0; i < 9; i++) {
          if ((i !== col && sudoku.board[row][i] === value) ||
            (i !== row && sudoku.board[i][col] === value)) return;
        }
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let r = boxRow; r < boxRow + 3; r++) {
          for (let c = boxCol; c < boxCol + 3; c++) {
            if ((r !== row || c !== col) && sudoku.board[r][c] === value) return;
          }
        }
      }
      sudoku.board[row][col] = value ?? 0;
      if (sudoku.board.every((line) => line.every((cell) => cell !== 0))) {
        maybeComplete(io, room, playerSession, room.mode === 'competitive' ? player.id : undefined);
      }
    } else if (action.type.startsWith('minesweeper_') && playerSession.state.game === 'minesweeper') {
      const mines = playerSession as MinesweeperSession;
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= mines.state.cells.length) return;
      const cell = mines.state.cells[action.index];
      if (action.type === 'minesweeper_flag' && mines.state.status === 'playing' && !cell.revealed) {
        cell.flagged = !cell.flagged;
      } else if (action.type === 'minesweeper_reveal') {
        revealMine(mines, action.index);
        if (mines.state.status === 'won') {
          maybeComplete(io, room, playerSession, room.mode === 'competitive' ? player.id : undefined);
        } else if (mines.state.status === 'lost') {
          if (room.mode === 'competitive') {
            room.quitPlayers = room.quitPlayers ?? [];
            if (!room.quitPlayers.includes(player.id)) room.quitPlayers.push(player.id);
            const activePlayers = Object.values(room.players).filter((entry) => !entry.isSpectator);
            const allDone = activePlayers.every((entry) =>
              room.competitiveResults?.[entry.id] || room.quitPlayers?.includes(entry.id)
            );
            if (allDone) {
              room.status = 'completed';
              room.completedAt = Date.now();
              io.to(code).emit('game_completed', {
                completedAt: room.completedAt,
                durationSeconds: room.startedAt ? Math.round((room.completedAt - room.startedAt) / 1000) : 0,
              });
            }
          } else {
            room.status = 'completed';
            room.completedAt = Date.now();
            io.to(code).emit('game_completed', {
              completedAt: room.completedAt,
              durationSeconds: room.startedAt ? Math.round((room.completedAt - room.startedAt) / 1000) : 0,
            });
          }
        }
      }
    } else {
      return;
    }
    saveAndPublish(io, room, room.mode === 'competitive' ? player.id : undefined);
  });
}
