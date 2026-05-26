// =========================================================================
// Heurística de evaluación del tablero.
//
// Devuelve un número desde la perspectiva de `perspective`:
//   positivo  → ventaja para `perspective`
//   negativo  → desventaja
//
// Distintos perfiles según dificultad:
//   - simple:   solo material (peón vs dama)
//   - balanced: + avance, centro y back-rank
//   - rich:     + movilidad y amenazas (riesgo de captura)
//
// Soporta tableros 8x8, 10x10 y 12x12: deriva el tamaño de `board.length`
// y calcula centro y back-rank relativos a ese tamaño.
// =========================================================================

import {
  type Board,
  type GameOptions,
  type PieceColor,
  boardSize,
  countPieces,
  getColor,
  getLegalMoves,
  getPiece,
  isDarkSquare,
  isKing,
  opponent,
} from "@checkers/shared";

export type HeuristicProfile = "simple" | "balanced" | "rich";

const PAWN_VALUE = 100;
const KING_VALUE = 280;

/** Devuelve la zona central [rowMin..rowMax, colMin..colMax]. */
function centerZone(size: number) {
  // Tomamos las 2 filas/cols del medio (centradas).
  const mid = size / 2;
  const rowMin = Math.floor(mid - 1);
  const rowMax = Math.floor(mid);
  const colMin = Math.max(0, Math.floor(mid - 2));
  const colMax = Math.min(size - 1, Math.floor(mid + 1));
  return { rowMin, rowMax, colMin, colMax };
}

export function evaluate(
  board: Board,
  perspective: PieceColor,
  profile: HeuristicProfile,
  options?: GameOptions,
): number {
  const size = boardSize(board);

  // 1) Material — siempre cuenta.
  const counts = countPieces(board);
  const redMaterial = counts.redPawns * PAWN_VALUE + counts.redKings * KING_VALUE;
  const blackMaterial =
    counts.blackPawns * PAWN_VALUE + counts.blackKings * KING_VALUE;
  let score = perspective === "red"
    ? redMaterial - blackMaterial
    : blackMaterial - redMaterial;

  // Detección de fin de juego (sin piezas).
  if (perspective === "red") {
    if (counts.redPawns + counts.redKings === 0) return -100000;
    if (counts.blackPawns + counts.blackKings === 0) return 100000;
  } else {
    if (counts.blackPawns + counts.blackKings === 0) return -100000;
    if (counts.redPawns + counts.redKings === 0) return 100000;
  }

  if (profile === "simple") return score;

  // 2) Posicional: avance, centro, back rank.
  const center = centerZone(size);
  let positional = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!isDarkSquare(row, col)) continue;
      const piece = getPiece(board, row, col);
      const color = getColor(piece);
      if (!color) continue;

      let v = 0;

      // Avance hacia coronación (sólo peones).
      if (!isKing(piece)) {
        const advancement = color === "red" ? size - 1 - row : row;
        v += advancement * 4;
      } else {
        v += 8;
      }

      // Control del centro.
      if (
        row >= center.rowMin &&
        row <= center.rowMax &&
        col >= center.colMin &&
        col <= center.colMax
      ) {
        v += 6;
      }

      // Defender la fila de coronación propia evita que el rival corone.
      if (!isKing(piece)) {
        if (color === "red" && row === size - 1) v += 5;
        if (color === "black" && row === 0) v += 5;
      }

      positional += color === perspective ? v : -v;
    }
  }

  score += positional;

  if (profile === "balanced") return score;

  // 3) Rich: movilidad y amenazas.
  const myMoves = getLegalMoves(board, perspective, options);
  const oppMoves = getLegalMoves(board, opponent(perspective), options);

  // Movilidad (pequeño peso).
  score += (myMoves.length - oppMoves.length) * 2;

  // Amenazas: capturas que el rival podría hacer en su siguiente jugada.
  let threat = 0;
  for (const m of oppMoves) {
    if (m.captures.length > 0) {
      threat += m.captures.length * 60;
    }
  }
  score -= threat;

  // Pequeño bonus si TENEMOS capturas disponibles.
  let activeCaps = 0;
  for (const m of myMoves) {
    if (m.captures.length > 0) activeCaps += m.captures.length;
  }
  score += activeCaps * 25;

  return score;
}
