import { describe, expect, it } from "bun:test";
import {
  applyMove,
  boardSize,
  computeStatus,
  countPieces,
  createInitialBoard,
  getLegalMoves,
  isDarkSquare,
  isKing,
  opponent,
  parseBoard,
  serializeBoard,
} from "../checkers.js";
import type { Board, Move, Square } from "../types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBoard(rows: string[]): Board {
  return rows.map((r) => r.split("") as Square[]) as unknown as Board;
}

function findMove(moves: Move[], from: [number, number], to: [number, number]): Move | undefined {
  return moves.find(
    (m) => m.from.row === from[0] && m.from.col === from[1] && m.to.row === to[0] && m.to.col === to[1],
  );
}

// ---------------------------------------------------------------------------
// createInitialBoard
// ---------------------------------------------------------------------------

describe("createInitialBoard", () => {
  it("crea tablero 8x8 con dimensiones correctas", () => {
    const b = createInitialBoard(8);
    expect(b.length).toBe(8);
    expect(b[0]!.length).toBe(8);
  });

  it("coloca 12 piezas rojas y 12 negras en 8x8", () => {
    const b = createInitialBoard(8);
    const { redPawns, blackPawns, redKings, blackKings } = countPieces(b);
    expect(redPawns).toBe(12);
    expect(blackPawns).toBe(12);
    expect(redKings).toBe(0);
    expect(blackKings).toBe(0);
  });

  it("solo ocupa casillas oscuras", () => {
    const b = createInitialBoard(8);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = b[r]![c];
        if (sq !== ".") {
          expect(isDarkSquare(r, c)).toBe(true);
        }
      }
    }
  });

  it("rojo comienza en las últimas filas (fila 5-7)", () => {
    const b = createInitialBoard(8);
    for (let c = 0; c < 8; c++) {
      if (isDarkSquare(5, c)) expect(b[5]![c]).toBe("r");
      if (isDarkSquare(6, c)) expect(b[6]![c]).toBe("r");
      if (isDarkSquare(7, c)) expect(b[7]![c]).toBe("r");
    }
  });

  it("negro comienza en las primeras filas (fila 0-2)", () => {
    const b = createInitialBoard(8);
    for (let c = 0; c < 8; c++) {
      if (isDarkSquare(0, c)) expect(b[0]![c]).toBe("b");
      if (isDarkSquare(1, c)) expect(b[1]![c]).toBe("b");
      if (isDarkSquare(2, c)) expect(b[2]![c]).toBe("b");
    }
  });

  it("crea tablero 10x10 con 20 piezas por bando", () => {
    const b = createInitialBoard(10);
    const { redPawns, blackPawns } = countPieces(b);
    expect(redPawns).toBe(20);
    expect(blackPawns).toBe(20);
    expect(boardSize(b)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// getLegalMoves — movimientos tranquilos
// ---------------------------------------------------------------------------

describe("getLegalMoves — apertura", () => {
  it("rojo tiene 7 movimientos legales en la posición inicial", () => {
    const b = createInitialBoard(8);
    const moves = getLegalMoves(b, "red");
    expect(moves.length).toBe(7);
  });

  it("negro tiene 7 movimientos legales en la posición inicial", () => {
    const b = createInitialBoard(8);
    const moves = getLegalMoves(b, "black");
    expect(moves.length).toBe(7);
  });

  it("todos los movimientos de apertura son hacia delante (sin capturas)", () => {
    const b = createInitialBoard(8);
    const moves = getLegalMoves(b, "red");
    for (const m of moves) {
      expect(m.captures.length).toBe(0);
      // Rojo avanza hacia filas menores (row decreases)
      expect(m.to.row).toBeLessThan(m.from.row);
    }
  });
});

// ---------------------------------------------------------------------------
// getLegalMoves — capturas obligatorias (forceJumps)
// ---------------------------------------------------------------------------

describe("getLegalMoves — capturas obligatorias", () => {
  it("sólo devuelve capturas cuando existen (forceJumps=true)", () => {
    // Tablero mínimo: pieza roja en (4,1), pieza negra en (3,2), vacío en (2,3)
    const b = makeBoard([
      "........",
      "........",
      "........",
      "..b.....",
      ".r......",
      "........",
      "........",
      "........",
    ]);
    const moves = getLegalMoves(b, "red", { forceJumps: true, showMoves: true });
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.captures.length > 0)).toBe(true);
  });

  it("devuelve movimientos tranquilos además de capturas si forceJumps=false", () => {
    const b = makeBoard([
      "........",
      "........",
      "........",
      "..b.....",
      ".r......",
      "........",
      "........",
      "........",
    ]);
    const moves = getLegalMoves(b, "red", { forceJumps: false, showMoves: true });
    const hasCapture = moves.some((m) => m.captures.length > 0);
    const hasQuiet = moves.some((m) => m.captures.length === 0);
    expect(hasCapture).toBe(true);
    expect(hasQuiet).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getLegalMoves — damas (kings)
// ---------------------------------------------------------------------------

describe("getLegalMoves — damas", () => {
  it("una dama puede moverse en las 4 diagonales", () => {
    // Dama roja en el centro, tablero vacío a su alrededor
    const b = makeBoard([
      "........",
      "........",
      "........",
      "...R....",
      "........",
      "........",
      "........",
      "........",
    ]);
    const moves = getLegalMoves(b, "red");
    // Desde (3,3) puede ir a (2,2),(2,4),(4,2),(4,4)
    expect(findMove(moves, [3, 3], [2, 2])).toBeDefined();
    expect(findMove(moves, [3, 3], [2, 4])).toBeDefined();
    expect(findMove(moves, [3, 3], [4, 2])).toBeDefined();
    expect(findMove(moves, [3, 3], [4, 4])).toBeDefined();
  });

  it("un peón rojo NO puede moverse hacia atrás (damas inglesas)", () => {
    const b = makeBoard([
      "........",
      "........",
      "........",
      "...r....",
      "........",
      "........",
      "........",
      "........",
    ]);
    const moves = getLegalMoves(b, "red");
    // Rojo solo puede ir hacia row < 3 (hacia delante = arriba)
    for (const m of moves) {
      expect(m.to.row).toBeLessThan(m.from.row);
    }
  });
});

// ---------------------------------------------------------------------------
// getLegalMoves — captura múltiple
// ---------------------------------------------------------------------------

describe("getLegalMoves — captura múltiple", () => {
  it("genera secuencia de doble captura", () => {
    // r en (6,1), b en (5,2) y (3,4), vacíos en (4,3) y (2,5)
    const b = makeBoard([
      "........",
      "........",
      "........",
      "....b...",
      "........",
      "..b.....",
      ".r......",
      "........",
    ]);
    const moves = getLegalMoves(b, "red", { forceJumps: true, showMoves: true });
    const doubleJump = moves.find((m) => m.captures.length === 2);
    expect(doubleJump).toBeDefined();
    expect(doubleJump!.from).toEqual({ row: 6, col: 1 });
    expect(doubleJump!.to).toEqual({ row: 2, col: 5 });
  });
});

// ---------------------------------------------------------------------------
// applyMove
// ---------------------------------------------------------------------------

describe("applyMove", () => {
  it("mueve una pieza de origen a destino", () => {
    const b = createInitialBoard(8);
    const moves = getLegalMoves(b, "red");
    const m = moves[0]!;
    const nb = applyMove(b, m);
    expect(nb[m.from.row]![m.from.col]).toBe(".");
    expect(nb[m.to.row]![m.to.col]).toBe("r");
  });

  it("elimina la pieza capturada", () => {
    const b = makeBoard([
      "........",
      "........",
      "........",
      "..b.....",
      ".r......",
      "........",
      "........",
      "downtown",
    ]);
    const board = makeBoard([
      "........",
      "........",
      "........",
      "..b.....",
      ".r......",
      "........",
      "........",
      "........",
    ]);
    const moves = getLegalMoves(board, "red", { forceJumps: true, showMoves: true });
    const capture = moves.find((m) => m.captures.length > 0)!;
    const nb = applyMove(board, capture);
    for (const cap of capture.captures) {
      expect(nb[cap.row]![cap.col]).toBe(".");
    }
  });

  it("promueve pieza roja al llegar a fila 0", () => {
    const b = makeBoard([
      "........",
      ".r......",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
    ]);
    const moves = getLegalMoves(b, "red");
    const toRow0 = moves.find((m) => m.to.row === 0);
    expect(toRow0).toBeDefined();
    expect(toRow0!.promoted).toBe(true);
    const nb = applyMove(b, toRow0!);
    expect(nb[0]![toRow0!.to.col]).toBe("R");
  });

  it("promueve pieza negra al llegar a la última fila", () => {
    const b = makeBoard([
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      ".b......",
      "........",
    ]);
    const moves = getLegalMoves(b, "black");
    const toRow7 = moves.find((m) => m.to.row === 7);
    expect(toRow7).toBeDefined();
    expect(toRow7!.promoted).toBe(true);
    const nb = applyMove(b, toRow7!);
    expect(nb[7]![toRow7!.to.col]).toBe("B");
  });

  it("no muta el tablero original", () => {
    const b = createInitialBoard(8);
    const snapshot = JSON.stringify(b);
    const moves = getLegalMoves(b, "red");
    applyMove(b, moves[0]!);
    expect(JSON.stringify(b)).toBe(snapshot);
  });
});

// ---------------------------------------------------------------------------
// computeStatus
// ---------------------------------------------------------------------------

describe("computeStatus", () => {
  it("devuelve 'active' en posición inicial", () => {
    const b = createInitialBoard(8);
    expect(computeStatus(b, "red")).toBe("active");
    expect(computeStatus(b, "black")).toBe("active");
  });

  it("devuelve 'won_red' cuando negro no tiene piezas", () => {
    const b = makeBoard([
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      ".r......",
      "........",
    ]);
    expect(computeStatus(b, "black")).toBe("won_red");
  });

  it("devuelve 'won_black' cuando rojo no tiene piezas", () => {
    const b = makeBoard([
      ".b......",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
    ]);
    expect(computeStatus(b, "red")).toBe("won_black");
  });

  it("devuelve 'won_black' cuando rojo no tiene movimientos legales", () => {
    // Rojo en esquina (7,7). Negra en (6,6) bloquea movimiento tranquilo.
    // Negra en (5,5) bloquea el destino de la captura. Sin escape por borde.
    const b = makeBoard([
      "........",
      "........",
      "........",
      "........",
      "........",
      ".....b..",
      "......b.",
      ".......r",
    ]);
    expect(computeStatus(b, "red")).toBe("won_black");
  });
});

// ---------------------------------------------------------------------------
// countPieces
// ---------------------------------------------------------------------------

describe("countPieces", () => {
  it("cuenta correctamente en tablero inicial 8x8", () => {
    const b = createInitialBoard(8);
    const counts = countPieces(b);
    expect(counts.redPawns).toBe(12);
    expect(counts.blackPawns).toBe(12);
    expect(counts.redKings).toBe(0);
    expect(counts.blackKings).toBe(0);
  });

  it("cuenta damas correctamente", () => {
    const b = makeBoard([
      ".R......",
      "B.......",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
    ]);
    const counts = countPieces(b);
    expect(counts.redKings).toBe(1);
    expect(counts.blackKings).toBe(1);
    expect(counts.redPawns).toBe(0);
    expect(counts.blackPawns).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// opponent
// ---------------------------------------------------------------------------

describe("opponent", () => {
  it("rojo → negro", () => expect(opponent("red")).toBe("black"));
  it("negro → rojo", () => expect(opponent("black")).toBe("red"));
});

// ---------------------------------------------------------------------------
// isKing
// ---------------------------------------------------------------------------

describe("isKing", () => {
  it("R y B son damas", () => {
    expect(isKing("R")).toBe(true);
    expect(isKing("B")).toBe(true);
  });
  it("r y b son peones", () => {
    expect(isKing("r")).toBe(false);
    expect(isKing("b")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// serializeBoard / parseBoard (round-trip)
// ---------------------------------------------------------------------------

describe("serializeBoard / parseBoard", () => {
  it("round-trip devuelve tablero idéntico", () => {
    const b = createInitialBoard(8);
    const s = serializeBoard(b);
    const b2 = parseBoard(s);
    expect(JSON.stringify(b2)).toBe(JSON.stringify(b));
  });
});
