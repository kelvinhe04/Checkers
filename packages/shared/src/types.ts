// =========================================================================
// Tipos compartidos entre frontend, backend y ai-service.
// =========================================================================

/** Tamaños de tablero soportados (8x8, 10x10, 12x12). */
export type BoardSize = 8 | 10 | 12;

export const SUPPORTED_BOARD_SIZES: readonly BoardSize[] = [8, 10, 12];

/** Tamaño por defecto cuando no se especifica. */
export const DEFAULT_BOARD_SIZE: BoardSize = 8;

/**
 * @deprecated Use board.length o el `boardSize` del snapshot.
 * Se mantiene como fallback (8) para código legado que aún no recibe el tamaño.
 */
export const BOARD_SIZE = 8 as const;

/**
 * Una casilla del tablero codificada como string:
 *   "." → vacía
 *   "r" → peón rojo
 *   "R" → dama roja (king)
 *   "b" → peón negro
 *   "B" → dama negra
 *
 * Convención: las piezas viven en casillas oscuras (row + col impar).
 */
export type Square = "." | "r" | "R" | "b" | "B";

/** Fila por fila, N strings de N caracteres (N = 8, 10 o 12). */
export type Board = readonly Square[][];

export type PieceColor = "red" | "black";

export type Difficulty = "easy" | "medium" | "hard";

export type FirstMove = "computer" | "player" | "random";

export type OpponentType = "ai";

export type GameStatus =
  | "active"
  | "won_red"
  | "won_black"
  | "draw"
  | "abandoned";

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  /** Lista de fichas capturadas durante el (multi)salto, en orden. */
  captures: Position[];
  /** Si la jugada coronó un peón en `to`. */
  promoted?: boolean;
}

/** Opciones configurables de una partida. */
export interface GameOptions {
  /** Captura obligatoria (regla clásica). Si es false, capturar es opcional. */
  forceJumps: boolean;
  /** El frontend resalta jugadas legales al seleccionar pieza. */
  showMoves: boolean;
}

export const DEFAULT_GAME_OPTIONS: GameOptions = {
  forceJumps: true,
  showMoves: true,
};

/** Estado mínimo que viaja entre servicios. */
export interface GameSnapshot {
  id: string;
  playerId: string;
  playerColor: PieceColor;
  aiColor: PieceColor;
  difficulty: Difficulty;
  boardSize: BoardSize;
  board: Board;
  currentTurn: PieceColor;
  status: GameStatus;
  winnerId: string | null;
  moveCount: number;
  options: GameOptions;
  /** Skin que se usó al crear la partida. */
  skinId: string;
  createdAt: string;
  updatedAt: string;
}

// ----- Request/response del microservicio de IA -----

export interface AIMoveRequest {
  board: Board;
  turn: PieceColor;
  difficulty: Difficulty;
  /** Reglas opcionales del juego (force jumps, etc.). */
  options?: GameOptions;
}

export interface AIMoveResponse {
  move: Move;
  /** Score heurístico de la jugada elegida desde la perspectiva del turno. */
  evaluation: number;
  /** Estado del tablero tras aplicar la jugada (opcional, para depuración). */
  boardAfter: Board;
  /** Profundidad de búsqueda usada. */
  depth: number;
  /** Tiempo total en ms invertido en decidir la jugada. */
  computeMs: number;
}

// ----- Eventos de WebSocket -----

export type WsServerEvent =
  | { type: "state"; snapshot: GameSnapshot }
  | { type: "ai_thinking" }
  | {
      type: "move_applied";
      by: PieceColor;
      move: Move;
      snapshot: GameSnapshot;
    }
  | { type: "game_over"; snapshot: GameSnapshot }
  | { type: "error"; message: string };

export type WsClientEvent =
  | { type: "subscribe"; gameId: string }
  | { type: "ping" };

// ----- Ranking / perfil -----

export interface RankingEntry {
  userId: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
  avgMovesToWin: number | null;
}

export interface CategoryStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  totalMovesInWins: number;
}

export interface UserProfile {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  premiumActive: boolean;
  stats: {
    wins: number;
    losses: number;
    draws: number;
    totalGames: number;
    winRate: number;
    avgMovesToWin: number | null;
  };
  statsByCategory?: Partial<Record<string, CategoryStats>>;
}
