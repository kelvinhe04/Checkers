// =========================================================================
// Búsqueda A* para selección de jugadas en Damas.
//
// A diferencia del minimax (DFS exhaustivo con poda alfa-beta), A* explora
// el árbol de juego en orden "mejor primero" usando una función de prioridad:
//
//   f(n) = g(n) + h(n)
//   g(n) = profundidad del nodo (número de movimientos desde la raíz)
//   h(n) = H_OFFSET - evaluate(n, perspectiva)
//          → posiciones mejores para la IA tienen h menor → mayor prioridad
//
// El algoritmo concentra la búsqueda en las ramas más prometedoras antes de
// explorar opciones menos favorables, usando una cola de prioridad (min-heap).
//
// Parada: al alcanzar la profundidad máxima O el límite de nodos (MAX_NODES).
// Se devuelve el primer movimiento de la rama con mejor evaluación hallada.
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

// Nodo en el árbol de búsqueda A*.
interface AStarNode {
  board: Board;
  turn: PieceColor;     // de quién es el turno en este estado
  nodeDepth: number;    // profundidad desde la raíz
  g: number;            // coste acumulado (= nodeDepth)
  h: number;            // heurística estimada al objetivo
  f: number;            // g + h → criterio de prioridad (menor = mejor)
  firstMove: Move;      // primer movimiento desde la raíz (para la decisión final)
  score: number;        // evaluación del tablero desde la perspectiva de la IA
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
// Función principal A*: devuelve el mejor movimiento encontrado por A*.
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

  // Insertar un nodo por cada movimiento legal desde la raíz.
  for (const m of moves) {
    const nb = applyMove(board, m);
    const score = evaluate(nb, perspective, profile, options);
    const g = 1;
    const h = H_OFFSET - score;
    openSet.push({
      board: nb,
      turn: opponent(turn),
      nodeDepth: 1,
      g,
      h,
      f: g + h,
      firstMove: m,
      score,
    });
    totalNodes++;
  }

  while (openSet.size > 0 && totalNodes < MAX_NODES) {
    const node = openSet.pop()!;

    // Nodo terminal por profundidad: registrar si es el mejor hallado.
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
      // Si el turno que no tiene movimientos es la IA → derrota; si es el rival → victoria.
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

    // Expandir todos los movimientos sin importar el turno.
    // La heurística guía la búsqueda: capturas aumentan el material (score alto)
    // → h bajo → f bajo → mayor prioridad en el heap → A* las explora primero.
    for (const m of nextMoves) {
      const nb = applyMove(node.board, m);
      const score = evaluate(nb, perspective, profile, options);
      const g = node.g + 1;
      const h = H_OFFSET - score;
      openSet.push({
        board: nb,
        turn: opponent(node.turn),
        nodeDepth: node.nodeDepth + 1,
        g,
        h,
        f: g + h,
        firstMove: node.firstMove,
        score,
      });
      totalNodes++;
    }
  }

  return { move: bestMove, score: bestScore, nodes: totalNodes };
}
