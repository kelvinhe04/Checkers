import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { BoardSize, Difficulty } from "@checkers/shared";
import { api } from "../lib/api.js";

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

export function RankingPage() {
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>("all");

  const filter = {
    difficulty: diffFilter !== "all" ? diffFilter : undefined,
    boardSize: sizeFilter !== "all" ? (sizeFilter as BoardSize) : undefined,
  };
  const hasFilter = !!filter.difficulty || !!filter.boardSize;

  const { data, isLoading, error } = useQuery({
    queryKey: ["ranking", diffFilter, sizeFilter],
    queryFn: () => api.getRanking(hasFilter ? filter : undefined),
  });

  const diffLabel = DIFF_OPTIONS.find((o) => o.value === diffFilter)?.label ?? "";
  const sizeLabel = SIZE_OPTIONS.find((o) => o.value === sizeFilter)?.label ?? "";
  const filterDesc =
    hasFilter
      ? [diffFilter !== "all" && diffLabel, sizeFilter !== "all" && sizeLabel]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <div>
      <h1 className="title">Ranking</h1>
      <p className="subtitle">
        Ordenado por victorias, rendimiento y menor cantidad de movimientos por victoria.
        {filterDesc && (
          <span style={{ marginLeft: 8, color: "#a8c89a" }}>
            — {filterDesc}
          </span>
        )}
      </p>

      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <p
            className="muted"
            style={{ marginBottom: "0.4rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
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
          <p
            className="muted"
            style={{ marginBottom: "0.4rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
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

      <div className="card">
        {isLoading && <p className="muted">Cargando ranking…</p>}
        {error && (
          <p style={{ color: "var(--danger)" }}>Error: {(error as Error).message}</p>
        )}
        {data && data.entries.length === 0 && (
          <p className="muted">
            {hasFilter
              ? "Aún no hay partidas terminadas con estos filtros."
              : "Aún no hay partidas terminadas."}
          </p>
        )}
        {data && data.entries.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Jugador</th>
                <th>Victorias</th>
                <th>Derrotas</th>
                <th>Empates</th>
                <th>Rendimiento</th>
                <th>Movs / victoria</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e, i) => (
                <motion.tr
                  key={e.userId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <td>{i + 1}</td>
                  <td>{e.name}</td>
                  <td>{e.wins}</td>
                  <td>{e.losses}</td>
                  <td>{e.draws}</td>
                  <td>{(e.winRate * 100).toFixed(1)}%</td>
                  <td>{e.avgMovesToWin ?? "—"}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
