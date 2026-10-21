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
  if (value !== null) {
    for (let index = 0; index < 9; index++) {
      if ((index !== col && state.board[row][index] === value) ||
        (index !== row && state.board[index][col] === value)) return;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
      for (let c = startCol; c < startCol + 3; c++) {
        if ((r !== row || c !== col) && state.board[r][c] === value) return;
      }
    }
  }
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
      if (event.key === "Escape") setSelectedCell(null);
      if (!selectedCell) return;
      const value = /^[1-9]$/.test(event.key) ? Number(event.key) : event.key === "Backspace" || event.key === "Delete" ? null : undefined;
      if (value === undefined) return;
      event.preventDefault();
      sendSudokuValue(socket, room, canPlay, sudokuState, selectedCell.row, selectedCell.col, value);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [miniGameState, selectedCell, socket, room, canPlay]);

  const title = room?.game === "sudoku" ? "Sudoku" : "Minesweeper";
  const playerCount = room ? Object.values(room.players).filter((entry) => !entry.isOffline).length : 0;

  const sudokuConflicts = useMemo(() => {
    if (!miniGameState || miniGameState.game !== "sudoku" || !selectedCell) return new Set<string>();
    const { board } = miniGameState;
    const selectedValue = board[selectedCell.row][selectedCell.col];
    if (!selectedValue) return new Set<string>();
    const conflicts = new Set<string>();
    for (let i = 0; i < 9; i++) {
      if (i !== selectedCell.col && board[selectedCell.row][i] === selectedValue) conflicts.add(`${selectedCell.row}-${i}`);
      if (i !== selectedCell.row && board[i][selectedCell.col] === selectedValue) conflicts.add(`${i}-${selectedCell.col}`);
    }
    const boxRow = Math.floor(selectedCell.row / 3) * 3;
    const boxCol = Math.floor(selectedCell.col / 3) * 3;
    for (let row = boxRow; row < boxRow + 3; row++) {
      for (let col = boxCol; col < boxCol + 3; col++) {
        if ((row !== selectedCell.row || col !== selectedCell.col) && board[row][col] === selectedValue) conflicts.add(`${row}-${col}`);
      }
    }
    return conflicts;
  }, [miniGameState, selectedCell]);

  if (!room || !player) {
    return <main className="flex min-h-dvh items-center justify-center bg-[#0F1C2E] text-[#F5EFE0]">Rejoining game…</main>;
  }

  function revealMine(index: number) {
    if (!canPlay) return;
    const type = flagMode ? "minesweeper_flag" : "minesweeper_reveal";
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
    <main className="min-h-dvh bg-[#0F1C2E] px-3 pb-6 pt-3 text-[#F5EFE0] sm:px-6 sm:pt-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#17283D] p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-3xl">{room.game === "sudoku" ? "🔢" : "💣"}</span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">{title}</h1>
              <p className="text-xs text-[#A8ADC4]">
                Room {room.code} · {room.mode === "competitive" ? "Race mode" : "Shared board"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-[#0F1C2E] px-3 py-2 font-mono text-sm text-[#F4B942]">{timeLabel}</span>
            <button onClick={leaveGame} className="min-h-10 rounded-xl border border-white/10 px-3 text-sm font-semibold text-[#C2C8D8] hover:border-[#FF6B4A]/60 hover:text-white">
              Leave
            </button>
          </div>
        </header>

        <section className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#17283D] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A8ADC4]">Players · {playerCount}</span>
            {Object.values(room.players).map((roomPlayer) => (
              <span key={roomPlayer.id} className="rounded-full bg-[#0F1C2E] px-3 py-1 text-xs" style={{ color: roomPlayer.color }}>
                {roomPlayer.avatar} {roomPlayer.name}{roomPlayer.id === localId ? " (you)" : ""}
                {roomPlayer.isOffline ? " · offline" : ""}
              </span>
            ))}
          </div>
          <span className="text-xs text-[#A8ADC4]">{room.mode === "competitive" ? "Same challenge, separate boards" : "Everyone plays one board together"}</span>
        </section>

        {miniGameState?.game === "sudoku" && (
          <section className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-[#17283D] p-3 shadow-2xl sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-bold sm:text-2xl">A little logic. A lot of teamwork.</h2>
                <p className="mt-1 text-xs capitalize text-[#A8ADC4]">{miniGameState.difficulty} · 9 × 9</p>
              </div>
              <div className="text-right text-xs text-[#A8ADC4]">
                <div className="font-mono text-lg font-bold text-[#F4B942]">
                  {miniGameState.board.flat().filter(Boolean).length}/81
                </div>
                filled
              </div>
            </div>
            <div role="grid" aria-label="Sudoku board" className="mx-auto grid aspect-square w-full max-w-[min(100%,28rem)] grid-cols-9 overflow-hidden rounded-xl border-2 border-[#F4B942]/70 bg-[#0E1A2A]">
              {miniGameState.board.flatMap((row, rowIndex) => row.map((value, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;
                const selected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                const peer = selectedCell && (selectedCell.row === rowIndex || selectedCell.col === colIndex ||
                  (Math.floor(selectedCell.row / 3) === Math.floor(rowIndex / 3) && Math.floor(selectedCell.col / 3) === Math.floor(colIndex / 3)));
                return (
                  <button
                    key={key}
                    type="button"
                    role="gridcell"
                    aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}${value ? `, ${value}` : ", empty"}`}
                    onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                    disabled={!canPlay}
                    className={`aspect-square min-w-0 border-r border-b text-base font-bold transition-colors sm:text-xl ${
                      colIndex % 3 === 2 && colIndex < 8 ? "border-r-2 border-r-[#F4B942]/70" : "border-r-[#718096]/25"
                    } ${rowIndex % 3 === 2 && rowIndex < 8 ? "border-b-2 border-b-[#F4B942]/70" : "border-b-[#718096]/25"} ${
                      selected ? "bg-[#FF6B4A] text-[#0F1C2E]" :
                      sudokuConflicts.has(key) ? "bg-red-500/35 text-red-100" :
                      value && selectedCell && miniGameState.board[selectedCell.row][selectedCell.col] === value ? "bg-[#F4B942]/25 text-[#F4B942]" :
                      peer ? "bg-white/[0.04]" : "bg-transparent"
                    } ${miniGameState.given[rowIndex][colIndex] ? "text-white" : value ? "text-[#73D5C1]" : "text-transparent"}`}
                  >
                    {value || ""}
                  </button>
                );
              }))}
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                <button key={value} type="button" disabled={!canPlay || !selectedCell} onClick={() => selectedCell && sendSudokuValue(socket, room, canPlay, miniGameState, selectedCell.row, selectedCell.col, value)}
                  className="min-h-11 rounded-xl border border-white/10 bg-[#0F1C2E] text-lg font-bold text-[#F4B942] transition-colors hover:border-[#F4B942]/70 disabled:opacity-40">
                  {value}
                </button>
              ))}
              <button type="button" disabled={!canPlay || !selectedCell} onClick={() => selectedCell && sendSudokuValue(socket, room, canPlay, miniGameState, selectedCell.row, selectedCell.col, null)}
                className="min-h-11 rounded-xl border border-white/10 bg-[#0F1C2E] text-xs font-bold text-[#A8ADC4] transition-colors hover:border-[#FF6B4A]/70 disabled:opacity-40">
                Erase
              </button>
            </div>
          </section>
        )}

        {miniGameState?.game === "minesweeper" && (
          <section className="mx-auto w-full max-w-5xl rounded-3xl border border-white/10 bg-[#17283D] p-3 shadow-2xl sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold sm:text-2xl">Find the safe path.</h2>
                <p className="mt-1 text-xs capitalize text-[#A8ADC4]">
                  {miniGameState.difficulty} · {miniGameState.rows} × {miniGameState.cols} · {miniGameState.mineCount} mines
                </p>
              </div>
              <button type="button" onClick={() => setFlagMode((value) => !value)} aria-pressed={flagMode}
                className={`min-h-11 rounded-xl border px-4 text-sm font-bold transition-colors ${flagMode ? "border-[#FF6B4A] bg-[#FF6B4A] text-[#0F1C2E]" : "border-white/15 bg-[#0F1C2E] text-[#F5EFE0]"}`}>
                {flagMode ? "🚩 Flag mode on" : "🚩 Flag a mine"}
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0E1A2A] p-1.5 sm:p-3">
              <div role="grid" aria-label="Minesweeper board" className="mx-auto grid w-max gap-1" style={{ gridTemplateColumns: `repeat(${miniGameState.cols}, minmax(2rem, 2.25rem))` }}>
                {miniGameState.cells.map((cell, index) => (
                  <button
                    key={index}
                    type="button"
                    role="gridcell"
                    aria-label={cell.revealed ? cell.mine ? "Mine" : `Revealed ${cell.adjacent ?? 0}` : cell.mine ? "Mine" : cell.flagged ? "Flagged cell" : "Hidden cell"}
                    disabled={!canPlay}
                    onContextMenu={(event) => { event.preventDefault(); revealMine(index); }}
                    onClick={() => revealMine(index)}
                    className={`aspect-square rounded-md text-xs font-black transition-colors sm:rounded-lg sm:text-sm ${
                      cell.revealed
                        ? cell.mine ? "bg-red-500/70 text-white" : "bg-[#E5EDF4] text-[#1B3655]"
                        : "border border-white/10 bg-[#27425F] text-[#F4B942] hover:bg-[#36597E] active:scale-95"
                    }`}
                  >
                    {cell.revealed || cell.mine ? cell.mine ? "💣" : cell.adjacent || "" : cell.flagged ? "🚩" : ""}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-[#A8ADC4]">Tap cells to reveal · Use flag mode (or right-click) to mark a mine</p>
          </section>
        )}

        {!miniGameState && room.status === "playing" && (
          <section className="rounded-2xl border border-white/10 bg-[#17283D] p-8 text-center text-[#A8ADC4]">
            Syncing the game board…
          </section>
        )}

        {endState && (
          <section className="rounded-2xl border border-[#F4B942]/30 bg-[#F4B942]/10 p-4 text-center sm:p-5">
            <p className="text-lg font-bold text-[#F4B942]">{endState}</p>
            {player.isHost && (
              <button type="button" onClick={returnToLobby} className="mt-3 min-h-11 rounded-xl bg-[#FF6B4A] px-5 font-bold text-[#0F1C2E]">
                Back to game lobby
              </button>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#17283D] p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#A8ADC4]">Room chat</div>
          <div className="max-h-28 space-y-1 overflow-y-auto">
            {room.chat.slice(-5).map((message) => (
              <p key={message.id} className={`text-xs ${message.system ? "text-[#8B9BB2]" : "text-[#D8DEEA]"}`}>
                <span className="font-bold" style={{ color: message.senderColor }}>{message.senderName}: </span>{message.text}
              </p>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); sendChatMessage(chatText); setChatText(""); }} className="mt-3 flex gap-2">
            <input value={chatText} onChange={(event) => setChatText(event.target.value)} maxLength={300} placeholder="Send a message…"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0F1C2E] px-3 text-sm text-white outline-none focus:border-[#FF6B4A]" />
            <button type="submit" disabled={!chatText.trim()} className="min-h-11 rounded-xl bg-[#FF6B4A] px-4 text-sm font-bold text-[#0F1C2E] disabled:opacity-40">Send</button>
          </form>
        </section>
      </div>
    </main>
  );
}
