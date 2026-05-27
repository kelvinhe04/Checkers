// =========================================================================
// Tablero interactivo de damas, estilo "mesa de billar":
//   - Marco de madera con coordenadas A-... arriba/abajo y 1-... a los lados
//   - Tamaño dinámico (8 / 10 / 12)
//   - Animación de "reparto" de fichas al iniciar la partida (stagger)
//   - Toggle showMoves para resaltar destinos
//
// Recibe un snapshot externo y emite onMove(move). No conoce reglas: sólo
// dibuja y resalta jugadas legales devueltas por el shared engine.
// =========================================================================

import { Crown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  type Board as BoardT,
  type GameOptions,
  type Move,
  type PieceColor,
  type Position,
  type Square,
  boardSize,
  getColor,
  getLegalMoves,
  isDarkSquare,
  isKing,
  positionsEqual,
} from "@checkers/shared";
import type { SkinDef } from "../lib/skins.js";

interface Props {
  board: BoardT;
  turn: PieceColor;
  playerColor: PieceColor;
  interactive: boolean;
  skin: SkinDef;
  onMove: (move: Move) => void;
  /** Si está esperando a la IA (deshabilita interacciones). */
  awaitingAi?: boolean;
  /** Reglas: forceJumps y showMoves. */
  options?: GameOptions;
  /** Si es true, las fichas aparecen con stagger (animación de reparto). */
  dealing?: boolean;
}

const LETTERS = "ABCDEFGHIJKL";

export function Board({
  board,
  turn,
  playerColor,
  interactive,
  skin,
  onMove,
  awaitingAi,
  options,
  dealing,
}: Props) {
  const size = boardSize(board);
  // Cuando el jugador es "black" se voltea el tablero para que sus fichas
  // estén siempre en la parte de abajo, como es convención en damas.
  const flipped = playerColor === "black";
  const [selected, setSelected] = useState<Position | null>(null);
  const [dealtCount, setDealtCount] = useState(0);

  // Lista ordenada de las celdas oscuras que tendrán pieza al iniciar.
  const dealOrder = useMemo(() => {
    const order: Position[] = [];
    // Alternamos rojas (abajo) y negras (arriba) para que se reparta uno a uno
    // a cada bando, como en la animación de gametable.org.
    const reds: Position[] = [];
    const blacks: Position[] = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const s = board[row]?.[col];
        if (!s || s === ".") continue;
        if (s === "r" || s === "R") reds.push({ row, col });
        else blacks.push({ row, col });
      }
    }
    // Recorremos rojas en orden inverso (filas más cercanas al jugador primero).
    reds.sort((a, b) => b.row - a.row || a.col - b.col);
    blacks.sort((a, b) => a.row - b.row || a.col - b.col);
    const n = Math.max(reds.length, blacks.length);
    for (let i = 0; i < n; i++) {
      if (i < reds.length) order.push(reds[i]!);
      if (i < blacks.length) order.push(blacks[i]!);
    }
    return order;
  }, [board, size]);

  const dealtSet = useMemo(() => {
    if (!dealing) return null;
    const s = new Set<string>();
    for (let i = 0; i < dealtCount; i++) {
      const p = dealOrder[i];
      if (p) s.add(`${p.row}:${p.col}`);
    }
    return s;
  }, [dealing, dealtCount, dealOrder]);

  // Avanza el reparto pieza a pieza.
  useEffect(() => {
    if (!dealing) return;
    if (dealtCount >= dealOrder.length) return;
    const t = setTimeout(() => setDealtCount((c) => c + 1), 60);
    return () => clearTimeout(t);
  }, [dealing, dealtCount, dealOrder.length]);

  // Si dealing pasa de true a false, asumimos que se reparte instantáneo.
  useEffect(() => {
    if (!dealing) setDealtCount(dealOrder.length);
    else setDealtCount(0);
  }, [dealing, dealOrder.length]);

  const showMoves = options?.showMoves ?? true;

  const legal = useMemo(
    () => getLegalMoves(board, playerColor, options),
    [board, playerColor, options],
  );

  const myTurn = turn === playerColor && interactive && !awaitingAi;

  const movesFromSelected = useMemo<Move[]>(
    () => (selected ? legal.filter((m) => positionsEqual(m.from, selected)) : []),
    [legal, selected],
  );

  const movableOrigins = useMemo(() => {
    const set = new Set<string>();
    for (const m of legal) set.add(key(m.from));
    return set;
  }, [legal]);

  function key(p: Position) {
    return `${p.row}:${p.col}`;
  }

  function clickSquare(row: number, col: number) {
    if (!myTurn) return;
    const piece = board[row]?.[col] ?? ".";

    if (getColor(piece as Square) === playerColor) {
      if (movableOrigins.has(key({ row, col }))) {
        setSelected({ row, col });
      }
      return;
    }

    if (selected) {
      const move = movesFromSelected.find(
        (m) => m.to.row === row && m.to.col === col,
      );
      if (move) {
        onMove(move);
        setSelected(null);
      }
    }
  }

  const destinations = new Map<string, Move>();
  for (const m of movesFromSelected) destinations.set(key(m.to), m);

  // Letras y números de coordenadas, invertidos si el tablero está volteado.
  const letters = flipped
    ? LETTERS.slice(0, size).split("").reverse()
    : LETTERS.slice(0, size).split("");
  const nums = flipped
    ? Array.from({ length: size }, (_, i) => i + 1)
    : Array.from({ length: size }, (_, i) => size - i);

  return (
    <div className="table-wrap">
      <div className="table-felt">
        <div className="board-frame" style={{ "--n": size } as React.CSSProperties}>
          {/* Letras arriba (sobre la madera) */}
          <div className="coord-row coord-row-top">
            <span className="coord-corner" />
            {letters.map((l) => (
              <span key={`tl-${l}`} className="coord">
                {l}
              </span>
            ))}
            <span className="coord-corner" />
          </div>

          <div className="board-mid">
            {/* Números izquierda */}
            <div className="coord-col">
              {nums.map((n) => (
                <span key={`ln-${n}`} className="coord">
                  {n}
                </span>
              ))}
            </div>

            {/* El tablero */}
            <div
              className="board"
              style={
                {
                  gridTemplateColumns: `repeat(${size}, 1fr)`,
                  gridTemplateRows: `repeat(${size}, 1fr)`,
                } as React.CSSProperties
              }
            >
              {Array.from({ length: size }).map((_, rowIdx) =>
                Array.from({ length: size }).map((__, colIdx) => {
                  // Si el tablero está volteado, invertimos filas y columnas.
                  const row = flipped ? size - 1 - rowIdx : rowIdx;
                  const col = flipped ? size - 1 - colIdx : colIdx;
                  const dark = isDarkSquare(row, col);
                  const piece = (board[row]?.[col] ?? ".") as Square;
                  const isSelected =
                    selected !== null && positionsEqual(selected, { row, col });
                  const dest = destinations.get(key({ row, col }));
                  const isCap = !!dest && dest.captures.length > 0;
                  const isDest = !!dest && !isCap;

                  const classNames = ["square"];
                  classNames.push(dark ? "dark" : "light");
                  if (isSelected) classNames.push("selected");
                  if (showMoves && isDest) classNames.push("dest");
                  if (showMoves && isCap) classNames.push("cap");

                  const showPiece =
                    piece !== "." &&
                    (!dealing || dealtSet?.has(`${row}:${col}`));

                  return (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      className={classNames.join(" ")}
                      onClick={() => clickSquare(row, col)}
                    >
                      <AnimatePresence>
                        {showPiece && (
                          <PieceDot
                            key={`p-${rowIdx}-${colIdx}-${piece}`}
                            square={piece}
                            skin={skin}
                          />
                        )}
                      </AnimatePresence>
                      {showMoves && isDest && <span className="dest-dot" />}
                      {showMoves && isCap && <span className="cap-dot" />}
                    </div>
                  );
                }),
              )}
            </div>

            {/* Números derecha */}
            <div className="coord-col">
              {nums.map((n) => (
                <span key={`rn-${n}`} className="coord">
                  {n}
                </span>
              ))}
            </div>
          </div>

          {/* Letras abajo */}
          <div className="coord-row coord-row-bottom">
            <span className="coord-corner" />
            {letters.map((l) => (
              <span key={`bl-${l}`} className="coord">
                {l}
              </span>
            ))}
            <span className="coord-corner" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PieceDot({ square, skin }: { square: Square; skin: SkinDef }) {
  const color = getColor(square);
  if (!color) return null;
  const king = isKing(square);
  const fill =
    color === "red"
      ? king
        ? skin.palette.redKing
        : skin.palette.red
      : king
        ? skin.palette.blackKing
        : skin.palette.black;
  const stroke =
    color === "red" ? skin.palette.redStroke : skin.palette.blackStroke;

  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0, y: -40 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 22 }}
      className={`piece ${king ? "king" : ""}`}
      style={
        {
          background: `radial-gradient(circle at 30% 30%, ${lighten(fill)} 0%, ${fill} 65%)`,
          border: `3px solid ${stroke}`,
        } as React.CSSProperties
      }
    >
      {king && <Crown size="40%" color={skin.palette.kingMark} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />}
    </motion.div>
  );
}

function lighten(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const mix = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.35));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
