// =========================================================================
// Diseños visuales de las fichas. Sólo los "free" se aplican sin premium.
// =========================================================================

export interface SkinPalette {
  red: string;
  redKing: string;
  black: string;
  blackKing: string;
  redStroke: string;
  blackStroke: string;
  kingMark: string;
}

export interface SkinDef {
  id: string;
  name: string;
  premium: boolean;
  palette: SkinPalette;
}

export const SKINS: readonly SkinDef[] = [
  {
    id: "classic",
    name: "Clásico",
    premium: false,
    palette: {
      red: "#dc2626",
      redKing: "#dc2626",
      black: "#111111",
      blackKing: "#111111",
      redStroke: "#7f1d1d",
      blackStroke: "#000000",
      kingMark: "#f1c40f",
    },
  },
  {
    id: "ocean",
    name: "Océano",
    premium: true,
    palette: {
      red: "#0ea5e9",
      redKing: "#0284c7",
      black: "#1e1b4b",
      blackKing: "#312e81",
      redStroke: "#075985",
      blackStroke: "#0f172a",
      kingMark: "#f8fafc",
    },
  },
  {
    id: "neon",
    name: "Neón",
    premium: true,
    palette: {
      red: "#f43f5e",
      redKing: "#fb7185",
      black: "#22d3ee",
      blackKing: "#06b6d4",
      redStroke: "#9f1239",
      blackStroke: "#0e7490",
      kingMark: "#facc15",
    },
  },
  {
    id: "gold",
    name: "Oro",
    premium: true,
    palette: {
      red: "#facc15",
      redKing: "#fde047",
      black: "#1f2937",
      blackKing: "#111827",
      redStroke: "#854d0e",
      blackStroke: "#030712",
      kingMark: "#ffffff",
    },
  },
] as const;

export function getSkin(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0]!;
}

const STORAGE_KEY = "checkers:skin";

export function readSkinId(): string {
  if (typeof localStorage === "undefined") return "classic";
  return localStorage.getItem(STORAGE_KEY) ?? "classic";
}

export function writeSkinId(id: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, id);
}
