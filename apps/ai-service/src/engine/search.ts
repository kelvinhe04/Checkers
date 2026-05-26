// =========================================================================
// Búsqueda minimax con poda alfa-beta.
// =========================================================================

import {
  type Board,
  type GameOptions,
  type Move,
  type PieceColor,
  applyMove,
  getLegalMoves,
  opponent,
} from "@checkers/shared";
import { evaluate, type HeuristicProfile } from "./heuristic.js";

export interface SearchResult {
  move: Move;
  score: number;
  nodes: number;
}

interface SearchParams {
  board: Board;
  turn: PieceColor;
  depth: number;
  profile: HeuristicProfile;
  options?: GameOptions;
}

export function search({
  board,
  turn,
  depth,
  profile,
  options,
}: SearchParams): SearchResult {
  const moves = getLegalMoves(board, turn, options);
  if (moves.length === 0) {
    throw new Error("no_legal_moves");
  }

  moves.sort((a, b) => b.captures.length - a.captures.length);

  let bestMove: Move = moves[0]!;
  let bestScore = -Infinity;
  let nodes = 0;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const m of moves) {
    const nb = applyMove(board, m);
    const counter: { nodes: number } = { nodes: 0 };
    const score = minimax(
      nb,
      opponent(turn),
      depth - 1,
      alpha,
      beta,
      turn,
      profile,
      counter,
      options,
    );
    nodes += counter.nodes + 1;

    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
    if (score > alpha) alpha = score;
  }

  return { move: bestMove, score: bestScore, nodes };
}

function minimax(
  board: Board,
  turnToMove: PieceColor,
  depth: number,
  alpha: number,
  beta: number,
  perspective: PieceColor,
  profile: HeuristicProfile,
  counter: { nodes: number },
  options: GameOptions | undefined,
): number {
  counter.nodes++;

  if (depth <= 0) {
    return evaluate(board, perspective, profile, options);
  }

  const moves = getLegalMoves(board, turnToMove, options);
  if (moves.length === 0) {
    return turnToMove === perspective ? -90000 - depth : 90000 + depth;
  }

  moves.sort((a, b) => b.captures.length - a.captures.length);

  if (turnToMove === perspective) {
    let best = -Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m);
      const s = minimax(
        nb,
        opponent(turnToMove),
        depth - 1,
        alpha,
        beta,
        perspective,
        profile,
        counter,
        options,
      );
      if (s > best) best = s;
      if (s > alpha) alpha = s;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m);
      const s = minimax(
        nb,
        opponent(turnToMove),
        depth - 1,
        alpha,
        beta,
        perspective,
        profile,
        counter,
        options,
      );
      if (s < best) best = s;
      if (s < beta) beta = s;
      if (beta <= alpha) break;
    }
    return best;
  }
}
