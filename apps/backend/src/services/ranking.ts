// =========================================================================
// Cálculo del ranking. Lee directamente de la colección `users` (donde se
// agregan los contadores cada vez que termina una partida).
// =========================================================================

import type { RankingEntry } from "@checkers/shared";
import { collections } from "../db/mongo.js";

export async function getTopRanking(limit = 50): Promise<RankingEntry[]> {
  const { users } = collections();
  const docs = await users
    .find(
      { "stats.totalGames": { $gt: 0 } },
      {
        projection: {
          clerkId: 1,
          name: 1,
          stats: 1,
        },
      },
    )
    .toArray();

  const entries: RankingEntry[] = docs.map((d) => {
    const wins = d.stats?.wins ?? 0;
    const losses = d.stats?.losses ?? 0;
    const draws = d.stats?.draws ?? 0;
    const total = d.stats?.totalGames ?? 0;
    const winRate = total > 0 ? wins / total : 0;
    const avgMovesToWin =
      wins > 0 ? Math.round((d.stats?.totalMovesInWins ?? 0) / wins) : null;
    return {
      userId: d.clerkId,
      name: d.name,
      wins,
      losses,
      draws,
      totalGames: total,
      winRate,
      avgMovesToWin,
    };
  });

  // Orden: más victorias, luego mayor winRate, luego menos movimientos por victoria.
  entries.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    const av = a.avgMovesToWin ?? Number.MAX_SAFE_INTEGER;
    const bv = b.avgMovesToWin ?? Number.MAX_SAFE_INTEGER;
    return av - bv;
  });

  return entries.slice(0, limit);
}
