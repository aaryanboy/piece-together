"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoom } from "@/context/RoomContext";
import { RoomState, SudokuGameState } from "@/types/room";
import { TypedSocket } from "@/lib/socket";

function sendSudokuValue(
  socket: TypedSocket,
  room: RoomState | null,
  canPlay: boolean,
  state: SudokuGameState,
  row: number,
  col: number,
  value: number | null,
) {
  if (!room || !canPlay || state.given[row][col]) return;
  socket.emit("mini_game_action", { roomCode: room.code, action: { type: "sudoku_set", row, col, value } });
}

export default function MiniGameRoom() {
  const router = useRouter();
  const { room, player, socket, miniGameState, leaveRoom, returnToLobby, sendChatMessage } = useRoom();
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [flagMode, setFlagMode] = useState(false);
  const [chatText, setChatText] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const localId = player?.id ?? "";
  const isSpectator = !!player?.isSpectator;
  const hasFinished = room?.mode === "competitive" && !!room.competitiveResults?.[localId];
  const hasQuit = !!room?.quitPlayers?.includes(localId);
  const canPlay = !!room && !!player && !isSpectator && !hasFinished && !hasQuit && room.status === "playing";
  const firstEmptyCell = useMemo(() => {
    if (!miniGameState || miniGameState.game !== "sudoku") return null;
    const index = miniGameState.given.flat().findIndex((isGiven) => !isGiven);
    return index < 0 ? null : { row: Math.floor(index / 9), col: index % 9 };
  }, [miniGameState]);
  const activeSudokuCell = selectedCell ?? firstEmptyCell;

  useEffect(() => {
    if (!room?.startedAt || room.status === "completed") return;
    const timer = window.setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - room.startedAt!) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [room?.startedAt, room?.status]);

  useEffect(() => {
    if (!miniGameState || miniGameState.game !== "sudoku") return;
    const sudokuState = miniGameState;
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (!activeSudokuCell) return;
      const key = /^[1-9]$/.test(event.key) ? event.key : /^Numpad[1-9]$/.test(event.code) ? event.code.slice(-1) : event.key;
      const value = /^[1-9]$/.test(key) ? Number(key) : key === "Backspace" || key === "Delete" ? null : undefined;
      if (value === undefined) return;
      event.preventDefault();
      sendSudokuValue(socket, room, canPlay, sudokuState, activeSudokuCell.row, activeSudokuCell.col, value);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [miniGameState, activeSudokuCell, socket, room, canPlay]);

  const title = room?.game === "sudoku" ? "Sudoku" : "Minesweeper";
  const playerCount = room ? Object.values(room.players).filter((entry) => !entry.isOffline).length : 0;

  const sudokuConflicts = useMemo(() => {
    if (!miniGameState || miniGameState.game !== "sudoku") return new Set<string>();
    const { board } = miniGameState;
    const conflicts = new Set<string>();
    const markConflicts = (cells: Array<[number, number]>) => {
      const positionsByValue = new Map<number, string[]>();
      for (const [row, col] of cells) {
        const value = board[row][col];
        if (!value) continue;
        const positions = positionsByValue.get(value) ?? [];
        positions.push(`${row}-${col}`);
        positionsByValue.set(value, positions);
      }
      for (const positions of positionsByValue.values()) {
        if (positions.length > 1) positions.forEach((position) => conflicts.add(position));
      }
    };

    for (let index = 0; index < 9; index++) {
      markConflicts(Array.from({ length: 9 }, (_, position) => [index, position]));
      markConflicts(Array.from({ length: 9 }, (_, position) => [position, index]));
    }
    for (let boxRow = 0; boxRow < 9; boxRow += 3) {
      for (let boxCol = 0; boxCol < 9; boxCol += 3) {
        markConflicts(Array.from({ length: 9 }, (_, position) => [
          boxRow + Math.floor(position / 3),
          boxCol + position % 3,
        ]));
      }
    }
    return conflicts;
  }, [miniGameState]);

  if (!room || !player) {
    return <main className="mini-game-page flex min-h-dvh items-center justify-center">Rejoining game…</main>;
  }

  function revealMine(index: number, forceFlag = false) {
    if (!canPlay) return;
    const type = forceFlag || flagMode ? "minesweeper_flag" : "minesweeper_reveal";
    socket.emit("mini_game_action", { roomCode: room.code, action: { type, index } });
  }

  function leaveGame() {
    leaveRoom();
    router.push("/");
  }

  const timeLabel = `${Math.floor(elapsed / 60).toString().padStart(2, "0")}:${(elapsed % 60).toString().padStart(2, "0")}`;
  const endState = miniGameState?.game === "minesweeper" && miniGameState.status === "lost"
    ? "Boom! This board hit a mine."
    : hasFinished || (miniGameState?.game === "sudoku" && miniGameState.status === "won") ||
        (miniGameState?.game === "minesweeper" && miniGameState.status === "won")
      ? "Puzzle complete!"
      : hasQuit
        ? "You left the race."
        : null;

  return (
    <main className="mini-game-page min-h-dvh px-3 pb-6 pt-3 sm:px-6 sm:pt-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="mini-game-header flex flex-wrap items-center justify-between gap-3 border p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-3xl">{room.game === "sudoku" ? "🔢" : "💣"}</span>
            <div className="min-w-0">
              <h1 className="mini-game-title truncate text-lg font-bold sm:text-xl">{title}</h1>
              <p className="mini-game-muted text-xs">
                Room {room.code} · {room.mode === "competitive" ? "Race mode" : "Shared board"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="mini-game-timer px-3 py-2 font-mono text-sm">{timeLabel}</span>
            <button onClick={leaveGame} className="mini-game-quiet-button min-h-10 border px-3 text-sm font-semibold">
              Leave
            </button>
          </div>
        </header>

        <section className="mini-game-header flex flex-wrap items-center justify-between gap-2 border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mini-game-muted text-xs font-bold uppercase tracking-wider">Players · {playerCount}</span>
            {Object.values(room.players).map((roomPlayer) => (
              <span key={roomPlayer.id} className="mini-game-player px-3 py-1 text-xs" style={{ "--player-color": roomPlayer.color } as React.CSSProperties}>
                {roomPlayer.avatar} {roomPlayer.name}{roomPlayer.id === localId ? " (you)" : ""}
                {roomPlayer.isOffline ? " · offline" : ""}
              </span>
            ))}
          </div>
          <span className="mini-game-muted text-xs">{room.mode === "competitive" ? "Same challenge, separate boards" : "Everyone plays one board together"}</span>
        </section>

        {miniGameState?.game === "sudoku" && (
          <section className="mini-game-card mx-auto w-full max-w-xl border p-3 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="mini-game-title font-display text-xl font-bold sm:text-2xl">A little logic. A lot of teamwork.</h2>
                <p className="mini-game-muted mt-1 text-xs capitalize">{miniGameState.difficulty} · 9 × 9</p>
              </div>
              <div className="mini-game-muted text-right text-xs">
                <div className="mini-game-accent font-mono text-lg font-bold">
                  {miniGameState.board.flat().filter(Boolean).length}/81
                </div>
                filled
              </div>
            </div>
            <div role="grid" aria-label="Sudoku board" className="sudoku-board mx-auto grid aspect-square w-full max-w-[min(100%,28rem)] grid-cols-9 overflow-hidden border-2">
              {miniGameState.board.flatMap((row, rowIndex) => row.map((value, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;
                const selected = activeSudokuCell?.row === rowIndex && activeSudokuCell?.col === colIndex;
                const peer = activeSudokuCell && (activeSudokuCell.row === rowIndex || activeSudokuCell.col === colIndex ||
                  (Math.floor(activeSudokuCell.row / 3) === Math.floor(rowIndex / 3) && Math.floor(activeSudokuCell.col / 3) === Math.floor(colIndex / 3)));
                return (
                  <button
                    key={key}
                    type="button"
                    role="gridcell"
                    aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}${value ? `, ${value}` : ", empty"}`}
                    onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                    disabled={!canPlay}
                    className={`sudoku-cell aspect-square min-w-0 text-base font-bold transition-colors sm:text-xl ${
                      colIndex % 3 === 2 && colIndex < 8 ? "sudoku-box-right" : ""
                    } ${rowIndex % 3 === 2 && rowIndex < 8 ? "sudoku-box-bottom" : ""} ${
                      sudokuConflicts.has(key) ? "is-conflict" :
                      selected ? "is-selected" :
                      value && activeSudokuCell && miniGameState.board[activeSudokuCell.row][activeSudokuCell.col] === value ? "is-match" :
                      peer ? "is-peer" : ""
                    } ${miniGameState.given[rowIndex][colIndex] ? "is-given" : value ? "is-entered" : ""}`}
                  >
                    {value || ""}
                  </button>
                );
              }))}
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                <button key={value} type="button" disabled={!canPlay || !activeSudokuCell || miniGameState.given[activeSudokuCell.row][activeSudokuCell.col]} onClick={() => activeSudokuCell && sendSudokuValue(socket, room, canPlay, miniGameState, activeSudokuCell.row, activeSudokuCell.col, value)}
                  className="mini-game-control min-h-11 border text-lg font-bold transition-colors disabled:opacity-40">
                  {value}
                </button>
              ))}
              <button type="button" disabled={!canPlay || !activeSudokuCell || miniGameState.given[activeSudokuCell.row][activeSudokuCell.col]} onClick={() => activeSudokuCell && sendSudokuValue(socket, room, canPlay, miniGameState, activeSudokuCell.row, activeSudokuCell.col, null)}
                className="mini-game-control mini-game-muted min-h-11 border text-xs font-bold transition-colors disabled:opacity-40">
                Erase
              </button>
            </div>
            <p className="mini-game-muted mt-3 text-center text-xs">
              {activeSudokuCell && miniGameState.given[activeSudokuCell.row][activeSudokuCell.col]
                ? "That is a fixed clue. Select an empty cell to enter a number."
                : "Tap a number or type 1–9 for the selected cell. Conflicts are highlighted in red."}
            </p>
          </section>
        )}

        {miniGameState?.game === "minesweeper" && (
          <section className="mini-game-card mx-auto w-full max-w-5xl border p-3 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="mini-game-title font-display text-xl font-bold sm:text-2xl">Find the safe path.</h2>
                <p className="mini-game-muted mt-1 text-xs capitalize">
                  {miniGameState.difficulty} · {miniGameState.rows} × {miniGameState.cols} · {miniGameState.mineCount} mines
                </p>
              </div>
              <button type="button" onClick={() => setFlagMode((value) => !value)} aria-pressed={flagMode}
                className={`mini-game-control min-h-11 border px-4 text-sm font-bold transition-colors ${flagMode ? "is-active" : ""}`}>
                {flagMode ? "🚩 Flag mode on" : "🚩 Flag a mine"}
              </button>
            </div>
            <div className="mine-board overflow-x-auto border p-1.5 sm:p-3">
              <div role="grid" aria-label="Minesweeper board" className="mx-auto grid w-max gap-1" style={{ gridTemplateColumns: `repeat(${miniGameState.cols}, minmax(2rem, 2.25rem))` }}>
                {miniGameState.cells.map((cell, index) => (
                  <button
                    key={index}
                    type="button"
                    role="gridcell"
                    aria-label={cell.revealed ? cell.mine ? "Mine" : `Revealed ${cell.adjacent ?? 0}` : cell.mine ? "Mine" : cell.flagged ? "Flagged cell" : "Hidden cell"}
                    disabled={!canPlay}
                    onContextMenu={(event) => { event.preventDefault(); revealMine(index, true); }}
                    onClick={() => revealMine(index)}
                    className={`mine-cell aspect-square text-xs font-black transition-colors sm:text-sm ${
                      cell.revealed
                        ? cell.mine ? "is-mine" : "is-revealed"
                        : "is-hidden active:scale-95"
                    }`}
                  >
                    {cell.revealed || cell.mine ? cell.mine ? "💣" : cell.adjacent || "" : cell.flagged ? "🚩" : ""}
                  </button>
                ))}
              </div>
            </div>
            <p className="mini-game-muted mt-3 text-center text-xs">Tap cells to reveal · Use flag mode (or right-click) to mark a mine</p>
          </section>
        )}

        {!miniGameState && room.status === "playing" && (
          <section className="mini-game-card border p-8 text-center">
            Syncing the game board…
          </section>
        )}

        {endState && (
          <section className="mini-game-result border p-4 text-center sm:p-5">
            <p className="mini-game-accent text-lg font-bold">{endState}</p>
            {player.isHost && (
              <button type="button" onClick={returnToLobby} className="mini-game-primary mt-3 min-h-11 px-5 font-bold">
                Back to game lobby
              </button>
            )}
          </section>
        )}

        <section className="mini-game-card border p-4">
          <div className="mini-game-muted mb-2 text-xs font-bold uppercase tracking-wider">Room chat</div>
          <div className="max-h-28 space-y-1 overflow-y-auto">
            {room.chat.slice(-5).map((message) => (
              <p key={message.id} className={`mini-game-chat-message text-xs ${message.system ? "is-system" : ""}`}>
                <span className="font-bold" style={{ color: message.senderColor }}>{message.senderName}: </span>{message.text}
              </p>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); sendChatMessage(chatText); setChatText(""); }} className="mt-3 flex gap-2">
            <input value={chatText} onChange={(event) => setChatText(event.target.value)} maxLength={300} placeholder="Send a message…"
              className="mini-game-chat-input min-h-11 min-w-0 flex-1 border px-3 text-sm outline-none" />
            <button type="submit" disabled={!chatText.trim()} className="mini-game-primary min-h-11 px-4 text-sm font-bold disabled:opacity-40">Send</button>
          </form>
        </section>
      </div>
    </main>
  );
}
