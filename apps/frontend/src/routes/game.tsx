// =========================================================================
// Vista de una partida en curso. Tablero + estado + WS sync.
// =========================================================================

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth,
  useUser,
} from "@clerk/clerk-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  type GameSnapshot,
  type Move,
  type WsServerEvent,
} from "@checkers/shared";
import { Board } from "../components/Board.js";
import { api } from "../lib/api.js";
import { env } from "../lib/env.js";
import { getSkin, readSkinId } from "../lib/skins.js";
import { openGameSocket } from "../lib/ws.js";

export function GamePage() {
  return (
    <>
      <SignedOut>
        <div className="card">
          <p>Inicia sesión para ver esta partida.</p>
          <SignInButton mode="modal">
            <button className="btn">Iniciar sesión</button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <GameInner />
      </SignedIn>
    </>
  );
}

function GameInner() {
  const { gameId } = useParams({ from: "/game/$gameId" });
  const auth = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const tokenGetter = () => auth.getToken({ template: env.clerkJwtTemplate });

  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [awaitingAi, setAwaitingAi] = useState(false);
  const [wsStatus, setWsStatus] = useState<"connecting" | "open" | "closed">(
    "connecting",
  );
  /** Si entramos por primera vez en moveCount=0, ejecutamos la animación de reparto una sola vez. */
  const [dealing, setDealing] = useState(false);

  // Marca el body para que la scrollbar use el tema verde mesa.
  useLayoutEffect(() => {
    document.body.classList.add("game-page-active");
    return () => document.body.classList.remove("game-page-active");
  }, []);

  const premium =
    (user?.publicMetadata?.premium as boolean | undefined) ?? false;
  const skin = useMemo(() => {
    const s = getSkin(readSkinId());
    if (s.premium && !premium) return getSkin("classic");
    return s;
  }, [premium]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .getGame(gameId, tokenGetter)
      .then((snap) => {
        if (!cancelled) {
          setSnapshot(snap);
          // Si la partida está recién creada (sin movimientos), animamos reparto.
          if (snap.moveCount === 0 && snap.status === "active") {
            setDealing(true);
            // Duración total aproximada: piezas × 60ms + margen.
            const pieces = countDealable(snap);
            setTimeout(() => setDealing(false), pieces * 60 + 400);
          }
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  useEffect(() => {
    let handle: { close: () => void } | null = null;
    let cancelled = false;

    tokenGetter().then((token) => {
      if (cancelled || !token) return;
      handle = openGameSocket({
        gameId,
        token,
        onStatus: setWsStatus,
        onEvent: (raw) => {
          const e = raw as WsServerEvent;
          switch (e.type) {
            case "ai_thinking":
              setAwaitingAi(true);
              break;
            case "move_applied":
              setSnapshot(e.snapshot);
              setAwaitingAi(false);
              break;
            case "game_over":
              setSnapshot(e.snapshot);
              setAwaitingAi(false);
              break;
            case "error":
              setError(e.message);
              setAwaitingAi(false);
              break;
            case "state":
              setSnapshot(e.snapshot);
              break;
          }
        },
      });
    });

    return () => {
      cancelled = true;
      handle?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  async function handleMove(move: Move) {
    if (!snapshot) return;
    setAwaitingAi(true);
    try {
      const res = await api.playMove(gameId, move, tokenGetter);
      setSnapshot(res.snapshot);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAwaitingAi(false);
    }
  }

  if (error && !snapshot) {
    return (
      <div className="card">
        <p style={{ color: "var(--danger)" }}>Error: {error}</p>
        <button className="btn" onClick={() => navigate({ to: "/play" })}>
          Volver al lobby
        </button>
      </div>
    );
  }

  if (!snapshot) return <p className="muted">Cargando partida…</p>;

  const isPlayerTurn =
    snapshot.status === "active" && snapshot.currentTurn === snapshot.playerColor;
  const finished = snapshot.status !== "active";

  let banner: string;
  let bannerClass = "muted";
  if (finished) {
    if (snapshot.status === `won_${snapshot.playerColor}`) {
      banner = "🏆 ¡Ganaste!";
      bannerClass = "success";
    } else if (snapshot.status === `won_${snapshot.aiColor}`) {
      banner = "💀 Ganó la IA";
      bannerClass = "danger";
    } else {
      banner = "🤝 Empate";
    }
  } else if (dealing) {
    banner = "🎴 Repartiendo fichas…";
  } else if (awaitingAi) {
    banner = "🤖 La IA está pensando…";
  } else if (isPlayerTurn) {
    banner = "Tu turno";
  } else {
    banner = "Turno de la IA";
  }

  return (
    <div className="game-page">
      <div className="status-banner">
        <div>
          <span className={`badge ${bannerClass}`}>{banner}</span>
          <span style={{ marginLeft: 12 }} className="muted">
            Movimiento {snapshot.moveCount} · {snapshot.difficulty} ·{" "}
            {snapshot.boardSize}×{snapshot.boardSize}
          </span>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          WS:{" "}
          <span
            style={{
              color:
                wsStatus === "open"
                  ? "var(--success)"
                  : wsStatus === "connecting"
                    ? "var(--accent)"
                    : "var(--danger)",
            }}
          >
            {wsStatus}
          </span>
        </div>
      </div>

      <Board
        board={snapshot.board}
        turn={snapshot.currentTurn}
        playerColor={snapshot.playerColor}
        interactive={!finished && !dealing}
        skin={skin}
        awaitingAi={awaitingAi || dealing}
        onMove={handleMove}
        options={snapshot.options}
        dealing={dealing}
      />

      <AnimatePresence>
        {finished && (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: 20, textAlign: "center" }}
          >
            <h3 style={{ marginTop: 0 }}>{banner}</h3>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn" onClick={() => navigate({ to: "/play" })}>
                Nueva partida
              </button>
              <button
                className="btn ghost"
                onClick={() => navigate({ to: "/ranking" })}
              >
                Ver ranking
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p>
      )}
    </div>
  );
}

function countDealable(snap: GameSnapshot): number {
  let n = 0;
  for (const row of snap.board) {
    for (const sq of row) if (sq !== ".") n++;
  }
  return n;
}
