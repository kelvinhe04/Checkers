import { describe, expect, it } from "bun:test";
import {
  type Board,
  createInitialBoard,
  getLegalMoves,
  type Move,
} from "@checkers/shared";
import { decideMove } from "../decide.js";
import { aStarSearch } from "../search.js";

function hasMove(legal: Move[], target: Move): boolean {
  return legal.some(
    (m) =>
      m.from.row === target.from.row &&
      m.from.col === target.from.col &&
      m.to.row === target.to.row &&
      m.to.col === target.to.col,
  );
}

function emptyBoard(size: number): Board {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "." as const),
  ) as unknown as Board;
}

describe("aStarSearch", () => {
  it("devuelve un movimiento legal desde el tablero inicial", () => {
    const board = createInitialBoard(8);
    const result = aStarSearch({
      board,
      turn: "red",
      depth: 2,
      profile: "simple",
    });
    const legal = getLegalMoves(board, "red");
    expect(legal.length).toBeGreaterThan(0);
    expect(hasMove(legal, result.move)).toBe(true);
    expect(result.score).toBeFinite();
    expect(result.nodes).toBeGreaterThan(0);
  });

  it("no lanza error con tablero válido y profundidad alta", () => {
    const board = createInitialBoard(8);
    const result = aStarSearch({
      board,
      turn: "black",
      depth: 6,
      profile: "rich",
    });
    const legal = getLegalMoves(board, "black");
    expect(hasMove(legal, result.move)).toBe(true);
    expect(result.nodes).toBeGreaterThan(0);
  });

  it("lanza error si no hay movimientos legales", () => {
    const board = emptyBoard(8);
    expect(() =>
      aStarSearch({ board, turn: "red", depth: 4, profile: "rich" }),
    ).toThrow("no_legal_moves");
  });
});

describe("decideMove", () => {
  it("funciona con dificultad easy", () => {
    const board = createInitialBoard(8);
    const result = decideMove(board, "red", "easy");
    const legal = getLegalMoves(board, "red");
    expect(hasMove(legal, result.move)).toBe(true);
    expect(result.evaluation).toBeFinite();
    expect(result.depth).toBeGreaterThanOrEqual(1);
  });

  it("funciona con dificultad medium", () => {
    const board = createInitialBoard(8);
    const result = decideMove(board, "red", "medium");
    const legal = getLegalMoves(board, "red");
    expect(hasMove(legal, result.move)).toBe(true);
    expect(result.evaluation).toBeFinite();
    expect(result.depth).toBeGreaterThanOrEqual(1);
  });

  it("funciona con dificultad hard", () => {
    const board = createInitialBoard(8);
    const result = decideMove(board, "red", "hard");
    const legal = getLegalMoves(board, "red");
    expect(hasMove(legal, result.move)).toBe(true);
    expect(result.evaluation).toBeFinite();
    expect(result.depth).toBeGreaterThanOrEqual(1);
  });

  it("lanza error si no hay movimientos legales", () => {
    const board = emptyBoard(8);
    expect(() => decideMove(board, "red", "hard")).toThrow("no_legal_moves");
  });
});
