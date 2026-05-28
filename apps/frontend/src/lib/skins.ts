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
  /** Nombre visual del bando "red" en esta skin (ej. "Azul" en Océano). */
  redLabel: string;
  /** Nombre visual del bando "black" en esta skin (ej. "Marino" en Océano). */
  blackLabel: string;
  palette: SkinPalette;
}

export const SKINS: readonly SkinDef[] = [
  {
    id: "classic",
    name: "Clásico",
    premium: false,
    redLabel: "Rojo",
    blackLabel: "Negro",
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
    redLabel: "Azul",
    blackLabel: "Marino",
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
    redLabel: "Rosa",
    blackLabel: "Cian",
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
    redLabel: "Dorado",
    blackLabel: "Oscuro",
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
  {
    id: "emerald",
    name: "Esmeralda",
    premium: true,
    redLabel: "Esmeralda",
    blackLabel: "Bosque",
    palette: {
      red: "#10b981",
      redKing: "#34d399",
      black: "#064e3b",
      blackKing: "#022c22",
      redStroke: "#047857",
      blackStroke: "#020617",
      kingMark: "#fbbf24",
    },
  },
  {
    id: "lava",
    name: "Lava",
    premium: true,
    redLabel: "Lava",
    blackLabel: "Carbón",
    palette: {
      red: "#f97316",
      redKing: "#fb923c",
      black: "#292524",
      blackKing: "#1c1917",
      redStroke: "#9a3412",
      blackStroke: "#0f0f0f",
      kingMark: "#fef08a",
    },
  },
  {
    id: "royal",
    name: "Real",
    premium: true,
    redLabel: "Púrpura",
    blackLabel: "Plata",
    palette: {
      red: "#a855f7",
      redKing: "#c084fc",
      black: "#cbd5e1",
      blackKing: "#e2e8f0",
      redStroke: "#6b21a8",
      blackStroke: "#94a3b8",
      kingMark: "#facc15",
    },
  },
  {
    id: "candy",
    name: "Dulce",
    premium: true,
    redLabel: "Rosa",
    blackLabel: "Menta",
    palette: {
      red: "#f472b6",
      redKing: "#f9a8d4",
      black: "#34d399",
      blackKing: "#6ee7b7",
      redStroke: "#be185d",
      blackStroke: "#047857",
      kingMark: "#ffffff",
    },
  },
  {
    id: "midnight",
    name: "Medianoche",
    premium: true,
    redLabel: "Índigo",
    blackLabel: "Pizarra",
    palette: {
      red: "#4338ca",
      redKing: "#6366f1",
      black: "#334155",
      blackKing: "#1e293b",
      redStroke: "#1e1b4b",
      blackStroke: "#0f172a",
      kingMark: "#f8fafc",
    },
  },
  {
    id: "sunset",
    name: "Atardecer",
    premium: true,
    redLabel: "Atardecer",
    blackLabel: "Violeta",
    palette: {
      red: "#f59e0b",
      redKing: "#fbbf24",
      black: "#7c3aed",
      blackKing: "#8b5cf6",
      redStroke: "#b45309",
      blackStroke: "#4c1d95",
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
