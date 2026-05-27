// =========================================================================
// Vista de una partida en curso. Tablero + estado + WS sync.
// =========================================================================

import { Bot, Dices, Handshake, Skull, Trophy } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth,
} from "@clerk/clerk-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  type GameSnapshot,
  type Move,
  type WsServerEvent,
} from "@checkers/shared";
import { Board } from "../components/Board.js";
import { api } from "../lib/api.js";
import { env } from "../lib/env.js";
import { playCaptureSound, playMoveSound } from "../lib/sounds.js";
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

/** Pausa antes de mostrar el movimiento de la IA para que se perciba natural. */
const AI_MOVE_DELAY_MS = 550;

function GameInner() {
  const { gameId } = useParams({ from: "/game/$gameId" });
  const auth = useAuth();
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

  // Leer premium desde el perfil del backend (no de Clerk publicMetadata,
  // que no se actualiza automáticamente al comprar).
  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getProfile(tokenGetter),
  });
  const premium = profile?.premiumActive ?? false;

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
              if (e.by === "red" || e.by === "black") {
                // Determine if this is the AI's move by checking snapshot context.
                // We delay AI moves and play the appropriate sound after the pause.
                setSnapshot((prev) => {
                  const isAiMove = prev !== null && e.by === prev.aiColor;
                  if (isAiMove) {
                    setTimeout(() => {
                      setSnapshot(e.snapshot);
                      setAwaitingAi(false);
                      if (e.move.captures.length > 0) playCaptureSound();
                      else playMoveSound();
                    }, AI_MOVE_DELAY_MS);
                    return prev; // keep current snapshot until delay fires
                  }
                  // Player's own move: apply immediately (sound already played)
                  return e.snapshot;
                });
              } else {
                setSnapshot(e.snapshot);
                setAwaitingAi(false);
              }
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

    // Play player's sound immediately on click.
    if (move.captures.length > 0) playCaptureSound();
    else playMoveSound();

    setAwaitingAi(true);
    try {
      const res = await api.playMove(gameId, move, tokenGetter);
      // Apply with the same delay so the REST fallback matches the WS visual pace.
      setTimeout(() => {
        setSnapshot(res.snapshot);
        setAwaitingAi(false);
      }, AI_MOVE_DELAY_MS);
    } catch (err) {
      setError((err as Error).message);
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

  let bannerIcon: ReactNode = null;
  let banner: string;
  let bannerClass = "muted";
  if (finished) {
    if (snapshot.status === `won_${snapshot.playerColor}`) {
      banner = "¡Ganaste!";
      bannerClass = "success";
      bannerIcon = <Trophy size={16} />;
    } else if (snapshot.status === `won_${snapshot.aiColor}`) {
      banner = "Ganó la IA";
      bannerClass = "danger";
      bannerIcon = <Skull size={16} />;
    } else {
      banner = "Empate";
      bannerIcon = <Handshake size={16} />;
    }
  } else if (dealing) {
    banner = "Repartiendo fichas…";
    bannerIcon = <Dices size={16} />;
  } else if (awaitingAi) {
    banner = "La IA está pensando…";
    bannerIcon = <Bot size={16} />;
  } else if (isPlayerTurn) {
    banner = "Tu turno";
  } else {
    banner = "Turno de la IA";
  }

  return (
    <div className="game-page">
      <div className="status-banner">
        <div>
          <span className={`badge ${bannerClass}`}>{bannerIcon} {banner}</span>
          <span style={{ marginLeft: 12 }} className="muted">
            Movimiento {snapshot.moveCount} · {snapshot.difficulty} ·{" "}
            {snapshot.boardSize}×{snapshot.boardSize}
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
            className="game-over-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="game-over-modal"
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 340, damping: 26, delay: 0.05 }}
            >
              <div className={`game-over-icon ${bannerClass}`}>{bannerIcon}</div>
              <h2 className="game-over-title">{banner}</h2>
              <div className="game-over-actions">
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
