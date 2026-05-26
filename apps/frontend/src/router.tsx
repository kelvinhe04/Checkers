// =========================================================================
// Configuración de TanStack Router con rutas manuales (sin codegen).
// =========================================================================

import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { Nav } from "./components/Nav.js";
import { HomePage } from "./routes/home.js";
import { PlayPage } from "./routes/play.js";
import { ProfilePage } from "./routes/profile.js";
import { RankingPage } from "./routes/ranking.js";
import { PremiumPage } from "./routes/premium.js";
import { GamePage } from "./routes/game.js";

const rootRoute = createRootRoute({
  component: () => (
    <div className="app-shell">
      <Nav />
      <main className="main">
        <Outlet />
      </main>
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const playRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/play",
  component: PlayPage,
});

const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/game/$gameId",
  component: GamePage,
});

const rankingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ranking",
  component: RankingPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const premiumRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/premium",
  component: PremiumPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  playRoute,
  gameRoute,
  rankingRoute,
  profileRoute,
  premiumRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Exportada por si más adelante alguna ruta necesita `loader` con redirects.
export { redirect };
