import { useState } from "react";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import type { BoardSize, Difficulty, UserProfile } from "@checkers/shared";
import { api } from "../lib/api.js";
import { env } from "../lib/env.js";

type DiffFilter = Difficulty | "all";
type SizeFilter = BoardSize | "all";

const DIFF_OPTIONS: { value: DiffFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "easy", label: "Fácil" },
  { value: "medium", label: "Medio" },
  { value: "hard", label: "Difícil" },
];

const SIZE_OPTIONS: { value: SizeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: 8, label: "8×8" },
  { value: 10, label: "10×10" },
  { value: 12, label: "12×12" },
];

const ALL_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const ALL_SIZES: BoardSize[] = [8, 10, 12];

function computeStats(
  profile: UserProfile,
  diffFilter: DiffFilter,
  sizeFilter: SizeFilter,
) {
  if (diffFilter === "all" && sizeFilter === "all") {
    return profile.stats;
  }

  const diffs = diffFilter !== "all" ? [diffFilter] : ALL_DIFFICULTIES;
  const sizes = sizeFilter !== "all" ? [sizeFilter as BoardSize] : ALL_SIZES;

  let wins = 0, losses = 0, draws = 0, totalGames = 0, totalMovesInWins = 0;

  for (const diff of diffs) {
    for (const size of sizes) {
      const cat = profile.statsByCategory?.[`${diff}_${size}`];
      if (cat) {
        wins += cat.wins ?? 0;
        losses += cat.losses ?? 0;
        draws += cat.draws ?? 0;
        totalGames += cat.totalGames ?? 0;
        totalMovesInWins += cat.totalMovesInWins ?? 0;
      }
    }
  }

  const winRate = totalGames > 0 ? wins / totalGames : 0;
  const avgMovesToWin = wins > 0 ? Math.round(totalMovesInWins / wins) : null;
  return { wins, losses, draws, totalGames, winRate, avgMovesToWin };
}

export function ProfilePage() {
  return (
    <>
      <SignedOut>
        <div className="card">
          <p>Inicia sesión para ver tu perfil.</p>
          <SignInButton mode="modal">
            <button className="btn">Iniciar sesión</button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <ProfileInner />
      </SignedIn>
    </>
  );
}

function ProfileInner() {
  const auth = useAuth();
  const tokenGetter = () => auth.getToken({ template: env.clerkJwtTemplate });
  const { data, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getProfile(tokenGetter),
  });

  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>("all");

  return (
    <div>
      <h1 className="title">Tu perfil</h1>
      {isLoading && <p className="muted">Cargando…</p>}
      {error && (
        <p style={{ color: "var(--danger)" }}>Error: {(error as Error).message}</p>
      )}
      {data && (
        <div className="row">
          <div className="card col">
            <h3 style={{ marginTop: 0 }}>{data.name}</h3>
            <p className="muted">{data.email}</p>
            <p>
              Estado:{" "}
              {data.premiumActive ? (
                <span className="badge">Premium</span>
              ) : (
                <span className="badge muted">Gratuito</span>
              )}
            </p>
          </div>

          <div className="card col">
            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Estadísticas</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div>
                <p className="muted" style={{ margin: "0 0 0.4rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Dificultad
                </p>
                <div className="filter-group">
                  {DIFF_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`filter-btn${diffFilter === opt.value ? " active" : ""}`}
                      onClick={() => setDiffFilter(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="muted" style={{ margin: "0 0 0.4rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Tablero
                </p>
                <div className="filter-group">
                  {SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`filter-btn${sizeFilter === opt.value ? " active" : ""}`}
                      onClick={() => setSizeFilter(opt.value as SizeFilter)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {(() => {
              const stats = computeStats(data, diffFilter, sizeFilter);
              return (
                <>
                  <Stat label="Partidas" value={stats.totalGames} />
                  <Stat label="Victorias" value={stats.wins} />
                  <Stat label="Derrotas" value={stats.losses} />
                  <Stat label="Empates" value={stats.draws} />
                  <Stat label="Rendimiento" value={`${(stats.winRate * 100).toFixed(1)}%`} />
                  <Stat label="Movs / victoria" value={stats.avgMovesToWin ?? "—"} />
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid rgba(148,163,184,0.12)",
      }}
    >
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
