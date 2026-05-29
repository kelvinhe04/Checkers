// =========================================================================
// Cliente Mongo singleton + tipos de las colecciones.
// =========================================================================

import { MongoClient, type Db, type Collection } from "mongodb";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export interface UserDoc {
  _id?: unknown;
  clerkId: string;
  name: string;
  email: string;
  premiumActive: boolean;
  stripeCustomerId: string | null;
  stats: {
    wins: number;
    losses: number;
    draws: number;
    totalGames: number;
    totalMovesInWins: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface GameDoc {
  _id?: unknown;
  gameId: string;
  playerId: string; // clerkId
  opponentType: "ai";
  playerColor: "red" | "black";
  aiColor: "red" | "black";
  difficulty: "easy" | "medium" | "hard";
  /** 8, 10 o 12. Opcional para compatibilidad con partidas viejas (asumimos 8). */
  boardSize?: 8 | 10 | 12;
  board: string; // serializado FEN-like
  currentTurn: "red" | "black";
  status: "active" | "won_red" | "won_black" | "draw" | "abandoned";
  winnerId: string | null;
  moveCount: number;
  /** Reglas configurables. Opcional para compatibilidad. */
  options?: {
    forceJumps: boolean;
    showMoves: boolean;
  };
  /** Skin que se usó al crear la partida. Opcional para compatibilidad. */
  skinId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MoveDoc {
  _id?: unknown;
  gameId: string;
  playerId: string;
  byColor: "red" | "black";
  ply: number;
  from: { row: number; col: number };
  to: { row: number; col: number };
  capturedPieces: Array<{ row: number; col: number }>;
  boardStateAfter: string;
  createdAt: Date;
}

export interface SubscriptionDoc {
  _id?: unknown;
  userId: string; // clerkId
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date | null;
  updatedAt: Date;
}

export interface Db5 {
  users: Collection<UserDoc>;
  games: Collection<GameDoc>;
  moves: Collection<MoveDoc>;
  subscriptions: Collection<SubscriptionDoc>;
}

export async function connectMongo(): Promise<Db5> {
  if (db) return collections();
  client = new MongoClient(config.mongo.url, {
    appName: "checkers-backend",
  });
  await client.connect();
  db = client.db(config.mongo.dbName);
  logger.info({ db: config.mongo.dbName }, "mongo connected");
  await ensureIndexes();
  return collections();
}

export function getDb(): Db {
  if (!db) throw new Error("mongo not connected");
  return db;
}

export function collections(): Db5 {
  if (!db) throw new Error("mongo not connected");
  return {
    users: db.collection<UserDoc>("users"),
    games: db.collection<GameDoc>("games"),
    moves: db.collection<MoveDoc>("moves"),
    subscriptions: db.collection<SubscriptionDoc>("subscriptions"),
  };
}

async function ensureIndexes() {
  const c = collections();
  await c.users.createIndex({ clerkId: 1 }, { unique: true });
  await c.users.createIndex({ "stats.wins": -1 });
  await c.games.createIndex({ gameId: 1 }, { unique: true });
  await c.games.createIndex({ playerId: 1, status: 1, updatedAt: -1 });
  await c.moves.createIndex({ gameId: 1, ply: 1 }, { unique: true });
  await c.subscriptions.createIndex({ userId: 1 }, { unique: true });
}

export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
