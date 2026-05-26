// =========================================================================
// Hub de WebSockets: indexa conexiones por gameId para poder hacer broadcast.
// =========================================================================

import type { ServerWebSocket } from "bun";
import type { WsServerEvent } from "@checkers/shared";

interface SocketData {
  gameId: string | null;
  clerkId: string | null;
}

const subscribers = new Map<string, Set<ServerWebSocket<SocketData>>>();

export function subscribe(ws: ServerWebSocket<SocketData>, gameId: string) {
  ws.data.gameId = gameId;
  let set = subscribers.get(gameId);
  if (!set) {
    set = new Set();
    subscribers.set(gameId, set);
  }
  set.add(ws);
}

export function unsubscribeAll(ws: ServerWebSocket<SocketData>) {
  const gid = ws.data.gameId;
  if (!gid) return;
  const set = subscribers.get(gid);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) subscribers.delete(gid);
}

export function broadcast(gameId: string, event: WsServerEvent) {
  const set = subscribers.get(gameId);
  if (!set) return;
  const payload = JSON.stringify(event);
  for (const ws of set) {
    try {
      ws.send(payload);
    } catch {
      // ignore: connection might be closing
    }
  }
}

export type { SocketData };
