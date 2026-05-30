// =========================================================================
// Cálculo del ranking. Soporta filtros por dificultad y tamaño de tablero.
// =========================================================================

import type { BoardSize, Difficulty, RankingEntry } from "@checkers/shared";
import { collections } from "../db/mongo.js";

const ALL_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const ALL_SIZES: BoardSize[] = [8, 10, 12];

export async function getTopRanking(
  limit = 50,
  filter?: { difficulty?: Difficulty; boardSize?: BoardSize },
): Promise<RankingEntry[]> {
  const { users } = collections();
  const docs = await users
    .find(
      {},
      {
        projection: {
          clerkId: 1,
          name: 1,
          stats: 1,
          statsByCategory: 1,
        },
      },
    )
    .toArray();

  const useGlobal = !filter?.difficulty && !filter?.boardSize;

  const entries: RankingEntry[] = [];

  for (const d of docs) {
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalGames = 0;
    let totalMovesInWins = 0;

    if (useGlobal) {
      wins = d.stats?.wins ?? 0;
      losses = d.stats?.losses ?? 0;
      draws = d.stats?.draws ?? 0;
      totalGames = d.stats?.totalGames ?? 0;
      totalMovesInWins = d.stats?.totalMovesInWins ?? 0;
    } else {
      const diffs = filter?.difficulty ? [filter.difficulty] : ALL_DIFFICULTIES;
      const sizes = filter?.boardSize ? [filter.boardSize] : ALL_SIZES;

      for (const diff of diffs) {
        for (const size of sizes) {
          const cat = d.statsByCategory?.[`${diff}_${size}`];
          if (cat) {
            wins += cat.wins ?? 0;
            losses += cat.losses ?? 0;
            draws += cat.draws ?? 0;
            totalGames += cat.totalGames ?? 0;
            totalMovesInWins += cat.totalMovesInWins ?? 0;
          }
        }
      }
    }

    if (totalGames === 0) continue;

    const winRate = wins / totalGames;
    const avgMovesToWin =
      wins > 0 ? Math.round(totalMovesInWins / wins) : null;

    entries.push({
      userId: d.clerkId,
      name: d.name,
      wins,
      losses,
      draws,
      totalGames,
      winRate,
      avgMovesToWin,
    });
  }

  entries.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    const av = a.avgMovesToWin ?? Number.MAX_SAFE_INTEGER;
    const bv = b.avgMovesToWin ?? Number.MAX_SAFE_INTEGER;
    return av - bv;
  });

  return entries.slice(0, limit);
}
