// =========================================================================
// Punto de entrada de la IA: traduce dificultad → (depth, profile) y elige
// jugada. La dificultad Easy añade ruido para no ser demasiado fuerte.
//
// La profundidad se atenúa en tableros grandes para no agotar el tiempo:
//   8x8  → depth nominal
//  10x10 → depth - 1 (mínimo 1)
//  12x12 → depth - 2 (mínimo 1)
// =========================================================================

import {
  type AIMoveResponse,
  type Board,
  type Difficulty,
  type GameOptions,
  type Move,
  type PieceColor,
  applyMove,
  boardSize,
  countPieces,
  getLegalMoves,
  opponent,
} from "@checkers/shared";
import { type HeuristicProfile } from "./heuristic.js";
import { aStarSearch } from "./search.js";

interface DifficultyConfig {
  depth: number;
  profile: HeuristicProfile;
  randomness: number;
  topK: number;
}

const CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: { depth: 2, profile: "simple", randomness: 0.5, topK: 4 },
  medium: { depth: 4, profile: "balanced", randomness: 0.1, topK: 2 },
  hard: { depth: 6, profile: "rich", randomness: 0, topK: 1 },
};

function adjustDepthForSize(depth: number, size: number): number {
  if (size >= 12) return Math.max(1, depth - 2);
  if (size >= 10) return Math.max(1, depth - 1);
  return depth;
}

export function decideMove(
  board: Board,
  turn: PieceColor,
  difficulty: Difficulty,
  options?: GameOptions,
): AIMoveResponse {
  const base = CONFIGS[difficulty];
  const cfg: DifficultyConfig = {
    ...base,
    depth: adjustDepthForSize(base.depth, boardSize(board)),
  };
  const start = Date.now();

  const legal = getLegalMoves(board, turn, options);
  if (legal.length === 0) {
    throw new Error("no_legal_moves");
  }

  if (legal.length === 1) {
    const m = legal[0]!;
    return {
      move: m,
      evaluation: 0,
      boardAfter: applyMove(board, m),
      depth: 0,
      computeMs: Date.now() - start,
    };
  }

  // Victoria inmediata: si algún movimiento elimina todas las piezas rivales, tomarlo siempre.
  // Independiente de forceJumps — un AI siempre debe aprovechar una victoria directa.
  for (const m of legal) {
    if (m.captures.length === 0) continue;
    const nb = applyMove(board, m);
    const counts = countPieces(nb);
    const oppRemaining =
      turn === "red"
        ? counts.blackPawns + counts.blackKings
        : counts.redPawns + counts.redKings;
    if (oppRemaining === 0) {
      return {
        move: m,
        evaluation: 100_000,
        boardAfter: nb,
        depth: 0,
        computeMs: Date.now() - start,
      };
    }
  }

  // En endgame con pocas piezas rivales, aumentar profundidad para planear la caza.
  const pieceCounts = countPieces(board);
  const oppTotal =
    turn === "red"
      ? pieceCounts.blackPawns + pieceCounts.blackKings
      : pieceCounts.redPawns + pieceCounts.redKings;
  if (oppTotal <= 2) {
    cfg.depth = Math.min(cfg.depth + 3, 10);
  }

  // A* siempre se usa — nunca se salta el algoritmo de búsqueda.
  const result = aStarSearch({
    board,
    turn,
    depth: cfg.depth,
    profile: cfg.profile,
    options,
  });
  let chosen: Move = result.move;
  let chosenScore: number = result.score;

  // En easy, con cierta probabilidad se elige aleatoriamente entre los topK mejores.
  if (cfg.randomness > 0 && Math.random() < cfg.randomness) {
    const ranked = legal
      .map((m) => {
        const nb = applyMove(board, m);
        const oppMoves = getLegalMoves(nb, opponent(turn), options);
        // Si el rival no tiene movimientos tras la jugada, es victoria inmediata.
        if (oppMoves.length === 0) return { move: m, score: 100_000 };
        const nb2 = aStarSearch({ board: nb, turn: opponent(turn), depth: 1, profile: cfg.profile, options });
        return { move: m, score: -nb2.score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, cfg.topK);
    const pick = ranked[Math.floor(Math.random() * ranked.length)]!;
    chosen = pick.move;
    chosenScore = pick.score;
  }

  return {
    move: chosen,
    evaluation: chosenScore,
    boardAfter: applyMove(board, chosen),
    depth: cfg.depth,
    computeMs: Date.now() - start,
  };
}
