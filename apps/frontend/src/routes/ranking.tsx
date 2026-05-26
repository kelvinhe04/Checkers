import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "../lib/api.js";

export function RankingPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ranking"],
    queryFn: () => api.getRanking(),
  });

  return (
    <div>
      <h1 className="title">Ranking</h1>
      <p className="subtitle">
        Ordenado por victorias, win rate y menor cantidad de movimientos por victoria.
      </p>

      <div className="card">
        {isLoading && <p className="muted">Cargando ranking…</p>}
        {error && (
          <p style={{ color: "var(--danger)" }}>Error: {(error as Error).message}</p>
        )}
        {data && data.entries.length === 0 && (
          <p className="muted">Aún no hay partidas terminadas.</p>
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
                <th>Win rate</th>
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
