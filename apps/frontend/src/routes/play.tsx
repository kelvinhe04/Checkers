// =========================================================================
// Lobby con pantalla de opciones tipo "Options" (carousel con flechas).
//   - Difficulty: 9 combos (Easy/Medium/Hard × 8x8/10x10/12x12) con estrellas
//   - First Move: Computer / Player / Random
//   - Force Jumps: ON/OFF
//   - Show Moves: ON/OFF
// =========================================================================

import { ChevronLeft, ChevronRight, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
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
import { getSkin, readSkinId } from "../lib/skins.js";

interface DifficultyOption {
  label: string;
  difficulty: Difficulty;
  boardSize: BoardSize;
  stars: 1 | 2 | 3;
}

// Orden visual: Easy 8x8 → Hard 12x12 (de menor a mayor dificultad).
const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { label: "Fácil 8×8", difficulty: "easy", boardSize: 8, stars: 1 },
  { label: "Medio 8×8", difficulty: "medium", boardSize: 8, stars: 2 },
  { label: "Difícil 8×8", difficulty: "hard", boardSize: 8, stars: 3 },
  { label: "Fácil 10×10", difficulty: "easy", boardSize: 10, stars: 1 },
  { label: "Medio 10×10", difficulty: "medium", boardSize: 10, stars: 2 },
  { label: "Difícil 10×10", difficulty: "hard", boardSize: 10, stars: 3 },
  { label: "Fácil 12×12", difficulty: "easy", boardSize: 12, stars: 1 },
  { label: "Medio 12×12", difficulty: "medium", boardSize: 12, stars: 2 },
  { label: "Difícil 12×12", difficulty: "hard", boardSize: 12, stars: 3 },
];

const FIRST_MOVE_OPTIONS: { value: FirstMove; label: string }[] = [
  { value: "computer", label: "Computadora" },
  { value: "player", label: "Jugador" },
  { value: "random", label: "Aleatorio" },
];

const COLOR_OPTIONS: { value: ColorChoice; label: string; dot: string }[] = [
  { value: "red", label: "Rojo", dot: "#dc2626" },
  { value: "black", label: "Negro", dot: "#111111" },
  { value: "random", label: "Random", dot: "transparent" },
];

function resolveColor(choice: ColorChoice): PieceColor {
  if (choice === "random") return Math.random() < 0.5 ? "red" : "black";
  return choice;
}

export function PlayPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [diffIdx, setDiffIdx] = useState(0); // arranca en Fácil 8x8
  const [firstMoveIdx, setFirstMoveIdx] = useState(1); // Player
  const [colorIdx, setColorIdx] = useState(0); // Red por defecto
  const [forceJumps, setForceJumps] = useState(false);
  const [showMoves, setShowMoves] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  const selectedDiff = DIFFICULTY_OPTIONS[diffIdx]!;
  const selectedFirstMove = FIRST_MOVE_OPTIONS[firstMoveIdx]!;

  const tokenGetter = () => auth.getToken({ template: env.clerkJwtTemplate });

  // Leer premium desde el backend para aplicar la skin correcta.
  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getProfile(tokenGetter),
    enabled: auth.isSignedIn ?? false,
  });
  const premium = profile?.premiumActive ?? false;
  const skin = useMemo(() => {
    const s = getSkin(readSkinId());
    if (s.premium && !premium) return getSkin("classic");
    return s;
  }, [premium]);

  // Opciones de color usando la paleta y nombres de la skin activa.
  const colorOptions = useMemo(
    () => [
      { value: "red" as ColorChoice, label: skin.redLabel, dot: skin.palette.red },
      { value: "black" as ColorChoice, label: skin.blackLabel, dot: skin.palette.black },
      { value: "random" as ColorChoice, label: "Aleatorio", dot: null },
    ],
    [skin],
  );
  const selectedColor = colorOptions[colorIdx]!;

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
          skinId: readSkinId(),
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
          <h1 className="options-title">OPCIONES</h1>

          {/* Difficulty selector */}
          <div className="options-section">
            <div className="options-label">Dificultad</div>
            <div className="carousel">
              <button
                className="carousel-arrow"
                onClick={() => shift(setDiffIdx, diffIdx, DIFFICULTY_OPTIONS.length, -1)}
                aria-label="anterior dificultad"
              >
                <ChevronLeft size={18} />
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
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* First move */}
          <div className="options-section">
            <div className="options-label">Primer turno</div>
            <div className="carousel">
              <button
                className="carousel-arrow"
                onClick={() =>
                  shift(setFirstMoveIdx, firstMoveIdx, FIRST_MOVE_OPTIONS.length, -1)
                }
                aria-label="anterior first move"
              >
                <ChevronLeft size={18} />
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
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Color del jugador */}
          <div className="options-section">
            <div className="options-label">Tu color</div>
            <div className="carousel">
              <button
                className="carousel-arrow"
                onClick={() =>
                  shift(setColorIdx, colorIdx, colorOptions.length, -1)
                }
                aria-label="anterior color"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="carousel-value color-value">
                {selectedColor.value === "random" ? (
                  <div className="color-dots">
                    <span
                      className="color-dot"
                      style={{ background: skin.palette.red }}
                    />
                    <span
                      className="color-dot"
                      style={{ background: skin.palette.black }}
                    />
                  </div>
                ) : (
                  <span
                    className="color-dot color-dot-lg"
                    style={{ background: selectedColor.dot ?? skin.palette.red }}
                  />
                )}
                <div className="carousel-text">{selectedColor.label}</div>
              </div>
              <button
                className="carousel-arrow"
                onClick={() =>
                  shift(setColorIdx, colorIdx, colorOptions.length, 1)
                }
                aria-label="siguiente color"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div className="options-toggles">
            <Toggle
              label="Saltos forzados"
              value={forceJumps}
              onChange={setForceJumps}
            />
            <Toggle label="Mostrar jugadas" value={showMoves} onChange={setShowMoves} />
          </div>

          <motion.button
            className="start-btn"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -2 }}
          >
            {createMutation.isPending ? "Creando…" : "Jugar"}
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
          premium={premium}
          selectedIds={selectedIds}
          onToggleSelect={(id) => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onSelectAll={() => {
            const all = activeGamesQuery.data?.games ?? [];
            setSelectedIds((prev) =>
              prev.size === all.length ? new Set() : new Set(all.map((g) => g.id)),
            );
          }}
          onResume={(id) => navigate({ to: "/game/$gameId", params: { gameId: id } })}
          onDelete={(id) => setDeletingId(id)}
          onBatchDelete={() => setBatchDeleting(true)}
          onCancelSelection={() => setSelectedIds(new Set())}
        />

        <AnimatePresence>
          {batchDeleting && (
            <ConfirmModal
              key="confirm-batch-delete"
              title="Eliminar partidas"
              message={`¿Eliminar ${selectedIds.size} partida(s)? Esta acción no se puede deshacer.`}
              confirmLabel="Eliminar todo"
              onCancel={() => setBatchDeleting(false)}
              onConfirm={async () => {
                await api.batchDeleteGames([...selectedIds], tokenGetter);
                setBatchDeleting(false);
                setSelectedIds(new Set());
                activeGamesQuery.refetch();
              }}
            />
          )}
          {deletingId && (
            <ConfirmModal
              key="confirm-delete"
              onCancel={() => setDeletingId(null)}
              onConfirm={async () => {
                await api.deleteGame(deletingId, tokenGetter);
                setDeletingId(null);
                activeGamesQuery.refetch();
              }}
            />
          )}
        </AnimatePresence>
      </SignedIn>
    </div>
  );
}

function Stars({ count }: { count: 1 | 2 | 3 }) {
  return (
    <div className="stars">
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          size={16}
          className={`star ${n <= count ? "on" : "off"}`}
          fill={n <= count ? "#f5b301" : "none"}
        />
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
        <span className="toggle-text">{value ? "SÍ" : "NO"}</span>
      </button>
    </div>
  );
}

function ActiveGames({
  loading,
  games,
  premium,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onResume,
  onDelete,
  onBatchDelete,
  onCancelSelection,
}: {
  loading: boolean;
  games: GameSnapshot[];
  premium: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onBatchDelete: () => void;
  onCancelSelection: () => void;
}) {
  if (loading) {
    return (
      <div className="active-games-card">
        <h3>Partidas activas</h3>
        <p className="muted">Cargando…</p>
      </div>
    );
  }
  if (games.length === 0) return null;
  const allSelected = games.every((g) => selectedIds.has(g.id));
  return (
    <div className="active-games-card">
      <div className="active-games-header">
        <label className="checkbox-label">
          <input
            type="checkbox"
            className="checkbox-input"
            checked={allSelected}
            onChange={onSelectAll}
          />
          <span className="checkbox-custom" />
        </label>
        <h3>Partidas activas</h3>
      </div>
      {selectedIds.size > 0 && (
        <div className="batch-bar">
          <span className="batch-count">{selectedIds.size} seleccionada(s)</span>
          <button className="btn" onClick={onBatchDelete}>
            Eliminar seleccionadas
          </button>
          <button className="btn ghost" onClick={onCancelSelection}>
            Cancelar
          </button>
        </div>
      )}
      <div className="active-games-scroll">
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {games.map((g) => {
            const gameSkin = (() => {
              const s = getSkin(g.skinId ?? "classic");
              return s.premium && !premium ? getSkin("classic") : s;
            })();
            return (
              <li
                key={g.id}
                className="active-game-row"
              >
                <div className="active-game-left">
                  <label className="checkbox-label row-checkbox">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={selectedIds.has(g.id)}
                      onChange={() => onToggleSelect(g.id)}
                    />
                    <span className="checkbox-custom" />
                  </label>
                  <div className="active-game-info">
                    <div className="active-game-title">
                      {{ easy: "Fácil", medium: "Medio", hard: "Difícil" }[g.difficulty]} · {g.boardSize}×{g.boardSize} ·
                      <span
                        className="color-dot"
                        style={{
                          width: 16,
                          height: 16,
                          background: g.playerColor === "red" ? gameSkin.palette.red : gameSkin.palette.black,
                          border: `2px solid ${g.playerColor === "red" ? gameSkin.palette.redStroke : gameSkin.palette.blackStroke}`,
                          flexShrink: 0,
                        }}
                      />
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      movimiento {g.moveCount} · turno{" "}
                      {g.currentTurn === g.playerColor ? "tuyo" : "computadora"}
                    </div>
                  </div>
                </div>
                <div className="active-game-actions">
                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={() => onDelete(g.id)}
                    title="Eliminar partida"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button className="btn secondary" onClick={() => onResume(g.id)}>
                    Continuar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function ConfirmModal({
  title = "Eliminar partida",
  message = "¿Estás seguro? Esta acción no se puede deshacer.",
  confirmLabel = "Eliminar",
  onCancel,
  onConfirm,
}: {
  title?: string;
  message?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      className="confirm-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onCancel}
    >
      <motion.div
        className="confirm-modal"
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="confirm-title">{title}</h2>
        <p className="confirm-desc">{message}</p>
        <div className="confirm-actions">
          <button className="btn ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
