// =========================================================================
// Cliente WebSocket. Re-conecta con backoff y entrega eventos tipados.
// =========================================================================

import type { WsServerEvent } from "@checkers/shared";
import { env } from "./env.js";

export interface WsHandle {
  close(): void;
}

interface OpenOpts {
  gameId: string;
  token: string;
  onEvent: (e: WsServerEvent | { type: string; [k: string]: unknown }) => void;
  onStatus?: (status: "connecting" | "open" | "closed") => void;
}

export function openGameSocket(opts: OpenOpts): WsHandle {
  let closed = false;
  let backoff = 500;
  let socket: WebSocket | null = null;

  function connect() {
    if (closed) return;
    opts.onStatus?.("connecting");
    const url = `${env.backendWsUrl}?gameId=${encodeURIComponent(
      opts.gameId,
    )}&token=${encodeURIComponent(opts.token)}`;
    socket = new WebSocket(url);

    socket.addEventListener("open", () => {
      backoff = 500;
      opts.onStatus?.("open");
      socket?.send(JSON.stringify({ type: "subscribe", gameId: opts.gameId }));
    });
    socket.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse(ev.data);
        opts.onEvent(data);
      } catch {
        // ignore
      }
    });
    socket.addEventListener("close", () => {
      opts.onStatus?.("closed");
      if (closed) return;
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, 8000);
    });
    socket.addEventListener("error", () => {
      // close will fire after error and we reconnect there.
    });
  }

  connect();

  return {
    close() {
      closed = true;
      socket?.close();
    },
  };
}
