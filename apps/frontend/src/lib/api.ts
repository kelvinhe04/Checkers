// =========================================================================
// Cliente HTTP del backend. Centraliza el token de Clerk para autenticar.
// =========================================================================

import type {
  BoardSize,
  Difficulty,
  FirstMove,
  GameSnapshot,
  Move,
  PieceColor,
  RankingEntry,
  UserProfile,
} from "@checkers/shared";
import { env } from "./env.js";

export type GetToken = () => Promise<string | null>;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

function newCorrelationId(): string {
  return crypto.randomUUID();
}

async function request<T>(
  path: string,
  init: RequestInit,
  getToken: GetToken | null,
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set("content-type", "application/json");
  headers.set("x-correlation-id", newCorrelationId());

  if (getToken) {
    const token = await getToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${env.backendUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  const text = await res.text();
  const json = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new ApiError(
      typeof json === "object" && json && "error" in json
        ? String((json as { error: unknown }).error)
        : `http_${res.status}`,
      res.status,
      json,
    );
  }
  return json as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------- Endpoints ----------

export const api = {
  createGame(
    body: {
      difficulty: Difficulty;
      playerColor?: PieceColor;
      boardSize?: BoardSize;
      firstMove?: FirstMove;
      forceJumps?: boolean;
      showMoves?: boolean;
    },
    getToken: GetToken,
  ) {
    return request<GameSnapshot>(
      "/api/games",
      { method: "POST", body: JSON.stringify(body) },
      getToken,
    );
  },

  listActiveGames(getToken: GetToken) {
    return request<{ games: GameSnapshot[] }>(
      "/api/games",
      { method: "GET" },
      getToken,
    );
  },

  getGame(id: string, getToken: GetToken) {
    return request<GameSnapshot>(`/api/games/${id}`, { method: "GET" }, getToken);
  },

  resumeGame(id: string, getToken: GetToken) {
    return request<GameSnapshot>(
      `/api/games/${id}/resume`,
      { method: "POST" },
      getToken,
    );
  },

  playMove(id: string, move: Move, getToken: GetToken) {
    return request<{ snapshot: GameSnapshot; aiMove?: Move }>(
      `/api/games/${id}/move`,
      { method: "POST", body: JSON.stringify(move) },
      getToken,
    );
  },

  getProfile(getToken: GetToken) {
    return request<UserProfile>("/api/me", { method: "GET" }, getToken);
  },

  getRanking() {
    return request<{ entries: RankingEntry[] }>(
      "/api/ranking",
      { method: "GET" },
      null,
    );
  },

  startCheckout(getToken: GetToken) {
    return request<{ url: string }>(
      "/api/billing/checkout",
      { method: "POST" },
      getToken,
    );
  },

  openPortal(getToken: GetToken) {
    return request<{ url: string }>(
      "/api/billing/portal",
      { method: "POST" },
      getToken,
    );
  },
};
