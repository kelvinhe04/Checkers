// =========================================================================
// Lobby con pantalla de opciones tipo "Options" (carousel con flechas).
//   - Difficulty: 9 combos (Easy/Medium/Hard × 8x8/10x10/12x12) con estrellas
//   - First Move: Computer / Player / Random
//   - Force Jumps: ON/OFF
//   - Show Moves: ON/OFF
// =========================================================================

import { useMemo, useState } from "react";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type {
  BoardSize,
  Difficulty,
  FirstMove,
  GameSnapshot,
  PieceColor,
} from "@checkers/shared";

type ColorChoice = PieceColor | "random";
import { api } from "../lib/api.js";
import { env } from "../lib/env.js";

interface DifficultyOption {
  label: string;
  difficulty: Difficulty;
  boardSize: BoardSize;
  stars: 1 | 2 | 3;
}

// Orden visual: Easy 8x8 → Hard 12x12 (de menor a mayor dificultad).
const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { label: "Easy 8 x 8", difficulty: "easy", boardSize: 8, stars: 1 },
  { label: "Medium 8 x 8", difficulty: "medium", boardSize: 8, stars: 2 },
  { label: "Hard 8 x 8", difficulty: "hard", boardSize: 8, stars: 3 },
  { label: "Easy 10 x 10", difficulty: "easy", boardSize: 10, stars: 1 },
  { label: "Medium 10 x 10", difficulty: "medium", boardSize: 10, stars: 2 },
  { label: "Hard 10 x 10", difficulty: "hard", boardSize: 10, stars: 3 },
  { label: "Easy 12 x 12", difficulty: "easy", boardSize: 12, stars: 1 },
  { label: "Medium 12 x 12", difficulty: "medium", boardSize: 12, stars: 2 },
  { label: "Hard 12 x 12", difficulty: "hard", boardSize: 12, stars: 3 },
];

const FIRST_MOVE_OPTIONS: { value: FirstMove; label: string }[] = [
  { value: "computer", label: "Computer" },
  { value: "player", label: "Player" },
  { value: "random", label: "Random" },
];

const COLOR_OPTIONS: { value: ColorChoice; label: string; dot: string }[] = [
  { value: "red", label: "Red", dot: "#dc2626" },
  { value: "black", label: "Black", dot: "#111111" },
  { value: "random", label: "Random", dot: "transparent" },
];

function resolveColor(choice: ColorChoice): PieceColor {
  if (choice === "random") return Math.random() < 0.5 ? "red" : "black";
  return choice;
}

export function PlayPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [diffIdx, setDiffIdx] = useState(4); // arranca en Medium 10x10
  const [firstMoveIdx, setFirstMoveIdx] = useState(1); // Player
  const [colorIdx, setColorIdx] = useState(0); // Red por defecto
  const [forceJumps, setForceJumps] = useState(false);
  const [showMoves, setShowMoves] = useState(true);

  const selectedDiff = DIFFICULTY_OPTIONS[diffIdx]!;
  const selectedFirstMove = FIRST_MOVE_OPTIONS[firstMoveIdx]!;
  const selectedColor = COLOR_OPTIONS[colorIdx]!;

  const tokenGetter = () => auth.getToken({ template: env.clerkJwtTemplate });

  const activeGamesQuery = useQuery({
    queryKey: ["games", "active"],
    queryFn: () => api.listActiveGames(tokenGetter),
    enabled: auth.isSignedIn ?? false,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createGame(
        {
          difficulty: selectedDiff.difficulty,
          boardSize: selectedDiff.boardSize,
          firstMove: selectedFirstMove.value,
          playerColor: resolveColor(selectedColor.value),
          forceJumps,
          showMoves,
        },
        tokenGetter,
      ),
    onSuccess: (snap: GameSnapshot) => {
      navigate({ to: "/game/$gameId", params: { gameId: snap.id } });
    },
  });

  function shift(setter: (v: number) => void, idx: number, mod: number, delta: number) {
    setter(((idx + delta) % mod + mod) % mod);
  }

  return (
    <div className="play-wrap">
      <SignedOut>
        <div className="card">
          <p>Inicia sesión para crear partidas.</p>
          <SignInButton mode="modal">
            <button className="btn">Iniciar sesión</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <motion.div
          className="options-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="options-title">OPTIONS</h1>

          {/* Difficulty selector */}
          <div className="options-section">
            <div className="options-label">Difficulty</div>
            <div className="carousel">
              <button
                className="carousel-arrow"
                onClick={() => shift(setDiffIdx, diffIdx, DIFFICULTY_OPTIONS.length, -1)}
                aria-label="anterior dificultad"
              >
                ◀
              </button>
              <div className="carousel-value">
                <div className="carousel-text">{selectedDiff.label}</div>
                <Stars count={selectedDiff.stars} />
              </div>
              <button
                className="carousel-arrow"
                onClick={() => shift(setDiffIdx, diffIdx, DIFFICULTY_OPTIONS.length, 1)}
                aria-label="siguiente dificultad"
              >
                ▶
              </button>
            </div>
          </div>

          {/* First move */}
          <div className="options-section">
            <div className="options-label">First Move</div>
            <div className="carousel">
              <button
                className="carousel-arrow"
                onClick={() =>
                  shift(setFirstMoveIdx, firstMoveIdx, FIRST_MOVE_OPTIONS.length, -1)
                }
                aria-label="anterior first move"
              >
                ◀
              </button>
              <div className="carousel-value">
                <div className="carousel-text">{selectedFirstMove.label}</div>
              </div>
              <button
                className="carousel-arrow"
                onClick={() =>
                  shift(setFirstMoveIdx, firstMoveIdx, FIRST_MOVE_OPTIONS.length, 1)
                }
                aria-label="siguiente first move"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Color del jugador */}
          <div className="options-section">
            <div className="options-label">Your Color</div>
            <div className="carousel">
              <button
                className="carousel-arrow"
                onClick={() =>
                  shift(setColorIdx, colorIdx, COLOR_OPTIONS.length, -1)
                }
                aria-label="anterior color"
              >
                ◀
              </button>
              <div className="carousel-value color-value">
                {selectedColor.value === "random" ? (
                  <div className="color-dots">
                    <span
                      className="color-dot"
                      style={{ background: "#dc2626" }}
                    />
                    <span
                      className="color-dot"
                      style={{ background: "#111111" }}
                    />
                  </div>
                ) : (
                  <span
                    className="color-dot color-dot-lg"
                    style={{ background: selectedColor.dot }}
                  />
                )}
                <div className="carousel-text">{selectedColor.label}</div>
              </div>
              <button
                className="carousel-arrow"
                onClick={() =>
                  shift(setColorIdx, colorIdx, COLOR_OPTIONS.length, 1)
                }
                aria-label="siguiente color"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div className="options-toggles">
            <Toggle
              label="Force Jumps"
              value={forceJumps}
              onChange={setForceJumps}
            />
            <Toggle label="Show Moves" value={showMoves} onChange={setShowMoves} />
          </div>

          <motion.button
            className="start-btn"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -2 }}
          >
            {createMutation.isPending ? "Creando…" : "Start"}
          </motion.button>

          {createMutation.error ? (
            <p style={{ color: "var(--danger)", marginTop: 10, textAlign: "center" }}>
              Error: {String((createMutation.error as Error).message)}
            </p>
          ) : null}
        </motion.div>

        <ActiveGames
          loading={activeGamesQuery.isLoading}
          games={activeGamesQuery.data?.games ?? []}
          onResume={(id) => navigate({ to: "/game/$gameId", params: { gameId: id } })}
        />
      </SignedIn>
    </div>
  );
}

function Stars({ count }: { count: 1 | 2 | 3 }) {
  return (
    <div className="stars">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`star ${n <= count ? "on" : "off"}`}>
          ★
        </span>
      ))}
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-block">
      <div className="toggle-label">{label}</div>
      <button
        type="button"
        className={`toggle ${value ? "on" : "off"}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
      >
        <span className="toggle-knob" />
        <span className="toggle-text">{value ? "ON" : "OFF"}</span>
      </button>
    </div>
  );
}

function ActiveGames({
  loading,
  games,
  onResume,
}: {
  loading: boolean;
  games: GameSnapshot[];
  onResume: (id: string) => void;
}) {
  const items = useMemo(() => games.slice(0, 6), [games]);
  if (loading) {
    return (
      <div className="active-games-card">
        <h3>Partidas activas</h3>
        <p className="muted">Cargando…</p>
      </div>
    );
  }
  if (items.length === 0) return null;
  return (
    <div className="active-games-card">
      <h3>Partidas activas</h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((g) => (
          <li
            key={g.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid rgba(148,163,184,0.12)",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>
                {g.difficulty} · {g.boardSize}×{g.boardSize} ·{" "}
                {g.playerColor === "red" ? "🔴" : "⚫"}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                movimiento {g.moveCount} · turno{" "}
                {g.currentTurn === g.playerColor ? "tuyo" : "IA"}
              </div>
            </div>
            <button className="btn secondary" onClick={() => onResume(g.id)}>
              Continuar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
