// =========================================================================
// Servicio de partidas. Fuente de verdad del estado, valida jugadas y
// coordina con el microservicio de IA.
// =========================================================================

import {
  type BoardSize,
  type Difficulty,
  type GameOptions,
  type GameSnapshot,
  type Move,
  type PieceColor,
  applyMove,
  computeStatus,
  createInitialBoard,
  getLegalMoves,
  movesEqual,
  opponent,
  parseBoard,
  serializeBoard,
} from "@checkers/shared";
import { collections, type GameDoc, type UserDoc } from "../db/mongo.js";
import { requestAiMove } from "../lib/ai-client.js";
import type { Logger } from "../lib/logger.js";
import { broadcast } from "../ws/hub.js";

interface CreateGameInput {
  user: UserDoc;
  difficulty: Difficulty;
  playerColor: PieceColor;
  /** Quién abre la partida. Si no se especifica, abre red. */
  firstTurn?: PieceColor;
  boardSize: BoardSize;
  options: GameOptions;
}

export interface PlayerMoveInput {
  user: UserDoc;
  gameId: string;
  move: Move;
  correlationId: string;
  log: Logger;
}

export interface MoveResult {
  snapshot: GameSnapshot;
  aiMove?: Move | undefined;
}

function newGameId(): string {
  return crypto.randomUUID();
}

function docOptions(doc: GameDoc): GameOptions {
  return {
    forceJumps: doc.options?.forceJumps ?? true,
    showMoves: doc.options?.showMoves ?? true,
  };
}

function toSnapshot(doc: GameDoc): GameSnapshot {
  const board = parseBoard(doc.board);
  const size = (doc.boardSize ?? (board.length as BoardSize)) as BoardSize;
  return {
    id: doc.gameId,
    playerId: doc.playerId,
    playerColor: doc.playerColor,
    aiColor: doc.aiColor,
    difficulty: doc.difficulty,
    boardSize: size,
    board,
    currentTurn: doc.currentTurn,
    status: doc.status,
    winnerId: doc.winnerId,
    moveCount: doc.moveCount,
    options: docOptions(doc),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function createGame(input: CreateGameInput): Promise<GameSnapshot> {
  const { games } = collections();
  const now = new Date();
  const board = createInitialBoard(input.boardSize);
  const aiColor = opponent(input.playerColor);
  const firstTurn = input.firstTurn ?? "red";
  const doc: GameDoc = {
    gameId: newGameId(),
    playerId: input.user.clerkId,
    opponentType: "ai",
    playerColor: input.playerColor,
    aiColor,
    difficulty: input.difficulty,
    boardSize: input.boardSize,
    board: serializeBoard(board),
    currentTurn: firstTurn,
    status: "active",
    winnerId: null,
    moveCount: 0,
    options: {
      forceJumps: input.options.forceJumps,
      showMoves: input.options.showMoves,
    },
    createdAt: now,
    updatedAt: now,
  };
  await games.insertOne(doc);

  let snap = toSnapshot(doc);

  // Si el jugador eligió jugar con negras, la IA debe abrir.
  if (snap.currentTurn === aiColor) {
    snap = await playAiTurnIfNeeded(snap, {
      correlationId: crypto.randomUUID(),
      log: undefined,
    });
  }

  return snap;
}

export async function getGame(
  user: UserDoc,
  gameId: string,
): Promise<GameSnapshot | null> {
  const { games } = collections();
  const doc = await games.findOne({ gameId, playerId: user.clerkId });
  return doc ? toSnapshot(doc) : null;
}

export async function listActiveGames(user: UserDoc): Promise<GameSnapshot[]> {
  const { games } = collections();
  const docs = await games
    .find({ playerId: user.clerkId, status: "active" })
    .sort({ updatedAt: -1 })
    .limit(20)
    .toArray();
  return docs.map(toSnapshot);
}

export async function playerMove(input: PlayerMoveInput): Promise<MoveResult> {
  const { games, moves } = collections();
  const doc = await games.findOne({
    gameId: input.gameId,
    playerId: input.user.clerkId,
  });
  if (!doc) throw new GameError("game_not_found", 404);
  if (doc.status !== "active") throw new GameError("game_not_active", 409);
  if (doc.currentTurn !== doc.playerColor) {
    throw new GameError("not_your_turn", 409);
  }

  const options = docOptions(doc);
  const board = parseBoard(doc.board);
  const legal = getLegalMoves(board, doc.playerColor, options);
  const match = legal.find((m) => movesEqual(m, input.move));
  if (!match) throw new GameError("illegal_move", 422);

  const boardAfter = applyMove(board, match);
  const nextTurn = opponent(doc.playerColor);
  const status = computeStatus(boardAfter, nextTurn, options);

  const now = new Date();
  const newMoveCount = doc.moveCount + 1;

  await moves.insertOne({
    gameId: doc.gameId,
    playerId: doc.playerId,
    byColor: doc.playerColor,
    ply: newMoveCount,
    from: match.from,
    to: match.to,
    capturedPieces: match.captures,
    boardStateAfter: serializeBoard(boardAfter),
    createdAt: now,
  });

  await games.updateOne(
    { gameId: doc.gameId },
    {
      $set: {
        board: serializeBoard(boardAfter),
        currentTurn: nextTurn,
        status,
        winnerId:
          status === `won_${doc.playerColor}`
            ? doc.playerId
            : status === `won_${doc.aiColor}`
              ? null
              : null,
        moveCount: newMoveCount,
        updatedAt: now,
      },
    },
  );

  let snap = await reloadSnapshot(doc.gameId);
  broadcast(doc.gameId, {
    type: "move_applied",
    by: doc.playerColor,
    move: match,
    snapshot: snap,
  });

  if (snap.status !== "active") {
    await onGameFinished(snap);
    broadcast(doc.gameId, { type: "game_over", snapshot: snap });
    return { snapshot: snap };
  }

  let aiMove: Move | undefined;
  if (snap.currentTurn === snap.aiColor) {
    broadcast(snap.id, { type: "ai_thinking" });
    snap = await playAiTurnIfNeeded(snap, {
      correlationId: input.correlationId,
      log: input.log,
    });
    const lastAiMoveDocs = await moves
      .find({ gameId: snap.id, byColor: snap.aiColor })
      .sort({ ply: -1 })
      .limit(1)
      .toArray();
    const lastAiMoveDoc = lastAiMoveDocs[0];
    aiMove = lastAiMoveDoc
      ? {
          from: lastAiMoveDoc.from,
          to: lastAiMoveDoc.to,
          captures: lastAiMoveDoc.capturedPieces,
        }
      : undefined;
  }

  if (snap.status !== "active") {
    await onGameFinished(snap);
    broadcast(snap.id, { type: "game_over", snapshot: snap });
  }

  return { snapshot: snap, aiMove };
}

interface AiTurnCtx {
  correlationId: string;
  log: Logger | undefined;
}

async function playAiTurnIfNeeded(
  snap: GameSnapshot,
  ctx: AiTurnCtx,
): Promise<GameSnapshot> {
  if (snap.status !== "active") return snap;
  if (snap.currentTurn !== snap.aiColor) return snap;

  const { games, moves } = collections();

  try {
    const ai = await requestAiMove(
      {
        board: snap.board,
        turn: snap.aiColor,
        difficulty: snap.difficulty,
        options: snap.options,
      },
      { correlationId: ctx.correlationId },
    );

    const aiBoard = applyMove(snap.board, ai.move);
    const nextTurn = opponent(snap.aiColor);
    const status = computeStatus(aiBoard, nextTurn, snap.options);
    const now = new Date();
    const newMoveCount = snap.moveCount + 1;

    await moves.insertOne({
      gameId: snap.id,
      playerId: snap.playerId,
      byColor: snap.aiColor,
      ply: newMoveCount,
      from: ai.move.from,
      to: ai.move.to,
      capturedPieces: ai.move.captures,
      boardStateAfter: serializeBoard(aiBoard),
      createdAt: now,
    });

    await games.updateOne(
      { gameId: snap.id },
      {
        $set: {
          board: serializeBoard(aiBoard),
          currentTurn: nextTurn,
          status,
          winnerId:
            status === `won_${snap.playerColor}`
              ? snap.playerId
              : null,
          moveCount: newMoveCount,
          updatedAt: now,
        },
      },
    );

    const newSnap = await reloadSnapshot(snap.id);
    broadcast(newSnap.id, {
      type: "move_applied",
      by: snap.aiColor,
      move: ai.move,
      snapshot: newSnap,
    });

    return newSnap;
  } catch (err) {
    ctx.log?.error({ err }, "ai_turn_failed");
    broadcast(snap.id, { type: "error", message: "ai_unavailable" });
    return snap;
  }
}

async function reloadSnapshot(gameId: string): Promise<GameSnapshot> {
  const { games } = collections();
  const doc = await games.findOne({ gameId });
  if (!doc) throw new GameError("game_not_found", 404);
  return toSnapshot(doc);
}

async function onGameFinished(snap: GameSnapshot): Promise<void> {
  const { users } = collections();
  let result: "win" | "loss" | "draw";
  if (snap.status === "draw") result = "draw";
  else if (snap.status === `won_${snap.playerColor}`) result = "win";
  else if (snap.status === `won_${snap.aiColor}`) result = "loss";
  else return;

  const inc: Record<string, number> = { "stats.totalGames": 1 };
  if (result === "win") {
    inc["stats.wins"] = 1;
    inc["stats.totalMovesInWins"] = snap.moveCount;
  } else if (result === "loss") {
    inc["stats.losses"] = 1;
  } else {
    inc["stats.draws"] = 1;
  }

  await users.updateOne(
    { clerkId: snap.playerId },
    { $inc: inc, $set: { updatedAt: new Date() } },
  );
}

export async function resumeGame(
  user: UserDoc,
  gameId: string,
): Promise<GameSnapshot> {
  const snap = await getGame(user, gameId);
  if (!snap) throw new GameError("game_not_found", 404);
  return snap;
}

export class GameError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message);
  }
}
