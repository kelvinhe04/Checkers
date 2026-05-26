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
  getLegalMoves,
} from "@checkers/shared";
import { evaluate, type HeuristicProfile } from "./heuristic.js";
import { search } from "./search.js";

interface DifficultyConfig {
  depth: number;
  profile: HeuristicProfile;
  randomness: number;
  topK: number;
}

const CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: { depth: 1, profile: "simple", randomness: 0.5, topK: 4 },
  medium: { depth: 3, profile: "balanced", randomness: 0.1, topK: 2 },
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

  let chosen: Move;
  let chosenScore: number;

  if (cfg.depth <= 1) {
    const scored = legal.map((m) => {
      const nb = applyMove(board, m);
      const score = evaluate(nb, turn, cfg.profile, options);
      return { move: m, score };
    });
    scored.sort((a, b) => b.score - a.score);

    const pick = pickFromTop(scored, cfg);
    chosen = pick.move;
    chosenScore = pick.score;
  } else {
    const result = search({
      board,
      turn,
      depth: cfg.depth,
      profile: cfg.profile,
      options,
    });
    chosen = result.move;
    chosenScore = result.score;

    if (cfg.randomness > 0 && Math.random() < cfg.randomness) {
      const ranked = legal
        .map((m) => {
          const nb = applyMove(board, m);
          return { move: m, score: evaluate(nb, turn, cfg.profile, options) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, cfg.topK);
      const pick = ranked[Math.floor(Math.random() * ranked.length)]!;
      chosen = pick.move;
      chosenScore = pick.score;
    }
  }

  return {
    move: chosen,
    evaluation: chosenScore,
    boardAfter: applyMove(board, chosen),
    depth: cfg.depth,
    computeMs: Date.now() - start,
  };
}

function pickFromTop(
  scored: Array<{ move: Move; score: number }>,
  cfg: DifficultyConfig,
): { move: Move; score: number } {
  if (cfg.randomness > 0 && Math.random() < cfg.randomness) {
    const top = scored.slice(0, Math.max(1, cfg.topK));
    return top[Math.floor(Math.random() * top.length)]!;
  }
  return scored[0]!;
}
