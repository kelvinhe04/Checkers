// =========================================================================
// Búsqueda A* para juegos de adversarios (Damas).
//
// En cada nivel del árbol alternamos entre MAX (turno de la IA) y MIN
// (turno del oponente). La IA busca maximizar su evaluación; el oponente
// busca minimizarla. El A* guía la exploración con un heap ordenado por
// f(n) = g(n) + h(n), donde:
//
//   g(n) = profundidad del nodo
//   h(n) = heurística adaptada al turno:
//          MAX (IA)    → h = H_OFFSET - evaluate(board)  [menor = mejor]
//          MIN (rival) → h = H_OFFSET + evaluate(board)  [menor = peor para IA]
//
// Se usa un closed set para evitar re-expandir estados duplicados.
//
// Parada: profundidad máxima alcanzada, límite de nodos (MAX_NODES) o
//         fin de partida en la rama.
// =========================================================================

import {
  type Board,
  type GameOptions,
  type Move,
  type PieceColor,
  applyMove,
  getLegalMoves,
  opponent,
  serializeBoard,
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

// Nodo en el árbol de búsqueda A*.
interface AStarNode {
  board: Board;
  turn: PieceColor;
  nodeDepth: number;
  g: number;
  h: number;
  f: number;
  firstMove: Move;
  score: number;        // evaluación desde la perspectiva de la IA
  isMax: boolean;     // true = turno de la IA (MAX), false = turno del oponente (MIN)
}

// -------------------------------------------------------------------------
// Min-heap genérico ordenado por f.
// -------------------------------------------------------------------------
class MinHeap {
  private data: AStarNode[] = [];

  push(node: AStarNode): void {
    this.data.push(node);
    this._bubbleUp(this.data.length - 1);
  }

  pop(): AStarNode | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0]!;
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size(): number {
    return this.data.length;
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[i]!.f < this.data[parent]!.f) {
        [this.data[i], this.data[parent]] = [this.data[parent]!, this.data[i]!];
        i = parent;
      } else {
        break;
      }
    }
  }

  private _sinkDown(i: number): void {
    const n = this.data.length;
    for (;;) {
      let smallest = i;
      const l = (i << 1) + 1;
      const r = l + 1;
      if (l < n && this.data[l]!.f < this.data[smallest]!.f) smallest = l;
      if (r < n && this.data[r]!.f < this.data[smallest]!.f) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest]!, this.data[i]!];
      i = smallest;
    }
  }
}

// Desplazamiento que garantiza h ≥ 0 para cualquier evaluación razonable.
const H_OFFSET = 200_000;

// Límite de nodos explorados para controlar el tiempo de cómputo.
const MAX_NODES = 50_000;

// -------------------------------------------------------------------------
// Función principal A*: devuelve el mejor movimiento encontrado.
// -------------------------------------------------------------------------
export function aStarSearch({
  board,
  turn,
  depth,
  profile,
  options,
}: SearchParams): SearchResult {
  const moves = getLegalMoves(board, turn, options);
  if (moves.length === 0) throw new Error("no_legal_moves");

  // Ordenar capturas primero para una inicialización más informada.
  moves.sort((a, b) => b.captures.length - a.captures.length);

  const perspective = turn; // color de la IA
  let bestMove: Move = moves[0]!;
  let bestScore = -Infinity;
  let totalNodes = 0;

  const openSet = new MinHeap();
  const closedSet = new Set<string>();

  // Insertar un nodo por cada movimiento legal desde la raíz.
  for (const m of moves) {
    const nb = applyMove(board, m);
    const boardKey = serializeBoard(nb);
    if (closedSet.has(boardKey)) continue;
    closedSet.add(boardKey);

    const score = evaluate(nb, perspective, profile, options);
    const isMax = opponent(turn) === perspective; // después de este movimiento, le toca al oponente
    const g = 1;
    const h = isMax ? H_OFFSET - score : H_OFFSET + score;
    openSet.push({
      board: nb,
      turn: opponent(turn),
      nodeDepth: 1,
      g,
      h,
      f: g + h,
      firstMove: m,
      score,
      isMax,
    });
    totalNodes++;
  }

  while (openSet.size > 0 && totalNodes < MAX_NODES) {
    const node = openSet.pop()!;

    // Nodo terminal por profundidad.
    if (node.nodeDepth >= depth) {
      if (node.score > bestScore) {
        bestScore = node.score;
        bestMove = node.firstMove;
      }
      continue;
    }

    const nextMoves = getLegalMoves(node.board, node.turn, options);

    // Fin de partida en esta rama.
    if (nextMoves.length === 0) {
      const termScore =
        node.turn === perspective
          ? -90_000 - node.nodeDepth
          : 90_000 + node.nodeDepth;
      if (termScore > bestScore) {
        bestScore = termScore;
        bestMove = node.firstMove;
      }
      continue;
    }

    nextMoves.sort((a, b) => b.captures.length - a.captures.length);

    for (const m of nextMoves) {
      const nb = applyMove(node.board, m);
      const boardKey = serializeBoard(nb);
      if (closedSet.has(boardKey)) continue;
      closedSet.add(boardKey);

      const score = evaluate(nb, perspective, profile, options);
      const childIsMax = opponent(node.turn) === perspective;
      const g = node.g + 1;
      const h = childIsMax ? H_OFFSET - score : H_OFFSET + score;
      openSet.push({
        board: nb,
        turn: opponent(node.turn),
        nodeDepth: node.nodeDepth + 1,
        g,
        h,
        f: g + h,
        firstMove: node.firstMove,
        score,
        isMax: childIsMax,
      });
      totalNodes++;
    }
  }

  return { move: bestMove, score: bestScore, nodes: totalNodes };
}
