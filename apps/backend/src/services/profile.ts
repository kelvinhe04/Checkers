import type { UserProfile } from "@checkers/shared";
import type { UserDoc } from "../db/mongo.js";

export function toUserProfile(doc: UserDoc): UserProfile {
  const wins = doc.stats?.wins ?? 0;
  const losses = doc.stats?.losses ?? 0;
  const draws = doc.stats?.draws ?? 0;
  const total = doc.stats?.totalGames ?? 0;
  const winRate = total > 0 ? wins / total : 0;
  const avgMovesToWin =
    wins > 0 ? Math.round((doc.stats?.totalMovesInWins ?? 0) / wins) : null;
  return {
    id: String(doc._id ?? ""),
    clerkId: doc.clerkId,
    name: doc.name,
    email: doc.email,
    premiumActive: doc.premiumActive,
    stats: {
      wins,
      losses,
      draws,
      totalGames: total,
      winRate,
      avgMovesToWin,
    },
    statsByCategory: doc.statsByCategory,
  };
}
