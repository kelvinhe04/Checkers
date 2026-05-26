// =========================================================================
// Reglas y utilidades del juego de damas. Soporta tableros 8x8, 10x10 y 12x12.
//
// El tamaño se deriva siempre de `board.length` para evitar pasar parámetros
// extra por todas partes.
//
// Convenciones:
//   - Coordenadas (row, col) con row 0 arriba.
//   - Casillas oscuras: (row + col) % 2 === 1.
//   - Rojo arranca abajo y avanza hacia row=0.
//   - Negro arranca arriba y avanza hacia row=N-1.
//   - Capturas obligatorias por defecto (regla clásica). Si `options.forceJumps`
//     es false, capturar es opcional.
//   - Peones SOLO capturan hacia delante (regla inglesa).
//   - Coronación: al alcanzar la última fila el peón se vuelve dama y el
//     turno termina.
//
// Las funciones NO mutan el tablero recibido.
// =========================================================================

import type {
  Board,
  BoardSize,
  GameOptions,
  GameStatus,
  Move,
  PieceColor,
  Position,
  Square,
} from "./types.js";
import { DEFAULT_GAME_OPTIONS, SUPPORTED_BOARD_SIZES } from "./types.js";

// ---------- Helpers básicos ----------

export function boardSize(board: Board): number {
  return board.length;
}

export function isValidBoardSize(n: number): n is BoardSize {
  return (SUPPORTED_BOARD_SIZES as readonly number[]).includes(n);
}

/**
 * Filas iniciales con piezas por bando.
 *   8x8  → 3 filas (12 fichas por bando)
 *  10x10 → 4 filas (20 fichas por bando)
 *  12x12 → 5 filas (30 fichas por bando)
 */
export function rowsPerSide(size: number): number {
  return Math.floor(size / 2) - 1;
}

export function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

export function inBoundsOf(size: number, row: number, col: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

export function inBounds(board: Board, row: number, col: number): boolean {
  return inBoundsOf(boardSize(board), row, col);
}

export function getColor(piece: Square): PieceColor | null {
  if (piece === "r" || piece === "R") return "red";
  if (piece === "b" || piece === "B") return "black";
  return null;
}

export function isKing(piece: Square): boolean {
  return piece === "R" || piece === "B";
}

export function opponent(color: PieceColor): PieceColor {
  return color === "red" ? "black" : "red";
}

export function getPiece(board: Board, row: number, col: number): Square {
  const r = board[row];
  if (!r) return ".";
  return (r[col] ?? ".") as Square;
}

export function cloneBoard(board: Board): Square[][] {
  return board.map((row) => row.slice() as Square[]);
}

export function boardToString(board: Board): string {
  return board.map((row) => row.join("")).join("\n");
}

// ---------- Estado inicial ----------

/**
 * Construye el tablero inicial para un tamaño dado.
 * Las piezas ocupan las primeras y últimas `rowsPerSide(size)` filas
 * (sólo en casillas oscuras).
 */
export function createInitialBoard(size: BoardSize = 8): Board {
  const filled = rowsPerSide(size);
  const board: Square[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "." as Square),
  );

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!isDarkSquare(row, col)) continue;
      if (row < filled) {
        board[row]![col] = "b";
      } else if (row >= size - filled) {
        board[row]![col] = "r";
      }
    }
  }

  return board;
}

// ---------- Direcciones ----------

interface Dir {
  dr: -1 | 1;
  dc: -1 | 1;
}

const DIRS_RED: readonly Dir[] = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
];
const DIRS_BLACK: readonly Dir[] = [
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
];
const DIRS_ALL: readonly Dir[] = [...DIRS_RED, ...DIRS_BLACK];

function forwardDirs(color: PieceColor): readonly Dir[] {
  return color === "red" ? DIRS_RED : DIRS_BLACK;
}

function moveDirs(piece: Square): readonly Dir[] {
  if (isKing(piece)) return DIRS_ALL;
  const color = getColor(piece);
  if (!color) return [];
  return forwardDirs(color);
}

/**
 * Dirección de captura. En English draughts los peones SOLO capturan hacia
 * delante; las damas en cualquier diagonal.
 */
function captureDirs(piece: Square): readonly Dir[] {
  if (isKing(piece)) return DIRS_ALL;
  return moveDirs(piece);
}

// ---------- Generación de movimientos ----------

/**
 * Devuelve las jugadas legales para `turn`. Si `options.forceJumps` es true
 * (default) y existe alguna captura, sólo se devuelven capturas.
 */
export function getLegalMoves(
  board: Board,
  turn: PieceColor,
  options: GameOptions = DEFAULT_GAME_OPTIONS,
): Move[] {
  const captures: Move[] = [];
  const quiet: Move[] = [];
  const size = boardSize(board);

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const piece = getPiece(board, row, col);
      if (getColor(piece) !== turn) continue;

      const found = findCapturesFrom(board, { row, col }, piece);
      if (found.length > 0) captures.push(...found);
      quiet.push(...findQuietMovesFrom(board, { row, col }, piece));
    }
  }

  if (options.forceJumps && captures.length > 0) return captures;
  return [...captures, ...quiet];
}

function findQuietMovesFrom(board: Board, from: Position, piece: Square): Move[] {
  const out: Move[] = [];
  const size = boardSize(board);
  for (const { dr, dc } of moveDirs(piece)) {
    const nr = from.row + dr;
    const nc = from.col + dc;
    if (!inBoundsOf(size, nr, nc)) continue;
    if (getPiece(board, nr, nc) !== ".") continue;
    out.push({
      from,
      to: { row: nr, col: nc },
      captures: [],
      promoted: shouldPromote(piece, nr, size),
    });
  }
  return out;
}

/**
 * Encuentra todas las secuencias de capturas (multi-jumps) desde `from`.
 * Cada elemento del array es UNA jugada completa.
 */
function findCapturesFrom(board: Board, from: Position, piece: Square): Move[] {
  const results: Move[] = [];
  const working = cloneBoard(board);
  working[from.row]![from.col] = ".";
  walkCaptures(working, from, from, piece, [], results);
  return results;
}

function walkCaptures(
  board: Square[][],
  origin: Position,
  current: Position,
  piece: Square,
  captured: Position[],
  out: Move[],
): void {
  const color = getColor(piece);
  if (!color) return;
  const size = board.length;

  const promotedHere = shouldPromote(piece, current.row, size);
  const effectivePiece: Square = promotedHere ? toKing(piece) : piece;
  const canChain = !promotedHere;

  let extended = false;

  if (canChain) {
    for (const { dr, dc } of captureDirs(effectivePiece)) {
      const midR = current.row + dr;
      const midC = current.col + dc;
      const dstR = current.row + dr * 2;
      const dstC = current.col + dc * 2;

      if (!inBoundsOf(size, dstR, dstC)) continue;
      const midSquare = board[midR]?.[midC];
      const dstSquare = board[dstR]?.[dstC];
      if (!midSquare || !dstSquare) continue;
      if (dstSquare !== ".") continue;
      const midColor = getColor(midSquare);
      if (!midColor || midColor === color) continue;

      if (captured.some((p) => p.row === midR && p.col === midC)) continue;

      board[midR]![midC] = ".";
      walkCaptures(
        board,
        origin,
        { row: dstR, col: dstC },
        effectivePiece,
        [...captured, { row: midR, col: midC }],
        out,
      );
      board[midR]![midC] = midSquare;

      extended = true;
    }
  }

  if (!extended && captured.length > 0) {
    out.push({
      from: origin,
      to: current,
      captures: [...captured],
      promoted: promotedHere,
    });
  }
}

function shouldPromote(piece: Square, row: number, size: number): boolean {
  if (piece === "r" && row === 0) return true;
  if (piece === "b" && row === size - 1) return true;
  return false;
}

function toKing(piece: Square): Square {
  if (piece === "r") return "R";
  if (piece === "b") return "B";
  return piece;
}

// ---------- Aplicar jugada ----------

export function applyMove(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  const piece = getPiece(board, move.from.row, move.from.col);
  next[move.from.row]![move.from.col] = ".";
  for (const cap of move.captures) {
    next[cap.row]![cap.col] = ".";
  }
  const finalPiece: Square = move.promoted ? toKing(piece) : piece;
  next[move.to.row]![move.to.col] = finalPiece;
  return next;
}

// ---------- Conteo y estado ----------

export interface PieceCount {
  redPawns: number;
  redKings: number;
  blackPawns: number;
  blackKings: number;
}

export function countPieces(board: Board): PieceCount {
  let rp = 0;
  let rk = 0;
  let bp = 0;
  let bk = 0;
  const size = boardSize(board);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const s = getPiece(board, row, col);
      if (s === "r") rp++;
      else if (s === "R") rk++;
      else if (s === "b") bp++;
      else if (s === "B") bk++;
    }
  }
  return { redPawns: rp, redKings: rk, blackPawns: bp, blackKings: bk };
}

export function hasPieces(board: Board, color: PieceColor): boolean {
  const size = boardSize(board);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (getColor(getPiece(board, row, col)) === color) return true;
    }
  }
  return false;
}

/**
 * Calcula el estado del juego dado que es el turno de `nextTurn`. Si ese
 * jugador no tiene piezas o no tiene jugadas legales, pierde.
 */
export function computeStatus(
  board: Board,
  nextTurn: PieceColor,
  options: GameOptions = DEFAULT_GAME_OPTIONS,
): GameStatus {
  if (!hasPieces(board, nextTurn)) {
    return nextTurn === "red" ? "won_black" : "won_red";
  }
  const moves = getLegalMoves(board, nextTurn, options);
  if (moves.length === 0) {
    return nextTurn === "red" ? "won_black" : "won_red";
  }
  return "active";
}

// ---------- Igualdad y serialización ----------

export function positionsEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function movesEqual(a: Move, b: Move): boolean {
  if (!positionsEqual(a.from, b.from) || !positionsEqual(a.to, b.to)) {
    return false;
  }
  if (a.captures.length !== b.captures.length) return false;
  for (let i = 0; i < a.captures.length; i++) {
    if (!positionsEqual(a.captures[i]!, b.captures[i]!)) return false;
  }
  return true;
}

/** Serializa el tablero como string FEN-like (N filas separadas por "/"). */
export function serializeBoard(board: Board): string {
  return board.map((row) => row.join("")).join("/");
}

/**
 * Parsea un tablero serializado. Acepta tamaños 8, 10 o 12 (debe ser cuadrado
 * y todas las filas del mismo tamaño).
 */
export function parseBoard(serialized: string): Board {
  const rows = serialized.split("/");
  const n = rows.length;
  if (!isValidBoardSize(n)) {
    throw new Error(`Invalid board: unsupported size ${n}`);
  }
  return rows.map((row) => {
    if (row.length !== n) {
      throw new Error(`Invalid board row (expected ${n} cols): ${row}`);
    }
    return row.split("") as Square[];
  });
}
