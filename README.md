# Checkers — Damas 8x8 con IA, ranking, pagos y estado remoto

Monorepo del Proyecto 2 (ver `PRD.md`). Arquitectura de microservicios sobre **Bun**, **Hono**, **MongoDB**, **Clerk**, **Stripe** y **WebSockets**, contenedorizado con **Docker Compose**.

> **Gestor de paquetes:** `pnpm` (obligatorio — no usar npm).

## Estructura

```
apps/
  frontend/      TanStack Start + React + Framer Motion + Clerk + Stripe Client
  backend/       Hono + Bun + Mongo + Clerk + Stripe + WebSockets
  ai-service/    Hono + Bun. Motor de damas + minimax con 3 niveles
packages/
  shared/        Tipos y reglas compartidas entre los 3 servicios
docker-compose.yml          Todo en contenedores (demo / despliegue)
docker-compose.dev.yml      Backend, AI y Mongo en contenedores; frontend local
PRD.md                      Especificación del proyecto
.env.example                Variables compartidas
```

## Requisitos
- [pnpm](https://pnpm.io/) ≥ 9
- [Docker](https://www.docker.com/) con Compose v2
- (Opcional para correr el frontend fuera) [Bun](https://bun.sh/) ≥ 1.1

## Configurar variables

```bash
cp .env.example .env
# Edita .env y rellena las claves (Clerk, Stripe)

# También copia los .env de cada app si los vas a correr fuera de Docker:
cp apps/frontend/.env.example apps/frontend/.env
cp apps/backend/.env.example apps/backend/.env
cp apps/ai-service/.env.example apps/ai-service/.env
```

### Configurar Clerk

1. Crea una aplicación en [clerk.com](https://clerk.com) → habilita Google OAuth y email/password.
2. Copia `CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY` al `.env` raíz.
3. En el dashboard de Clerk → **JWT Templates** → **+ New template** → nómbralo `checkers-backend`. Deja el payload por defecto (incluye `sub`, `email`, `name`).
4. Asegúrate de que `CLERK_JWT_TEMPLATE=checkers-backend` (es el default).

### Configurar Stripe

1. Crea una cuenta en [stripe.com](https://stripe.com) (modo test).
2. Crea un producto recurrente (ej. "Checkers Premium") y copia el `price_…` a `STRIPE_PRICE_PREMIUM`.
3. Copia tu `Secret key` a `STRIPE_SECRET_KEY`.
4. Crea un webhook endpoint apuntando a `https://<tu-dominio>/api/webhooks/stripe` (en local usa Stripe CLI: `stripe listen --forward-to localhost:4000/api/webhooks/stripe`). Copia el `whsec_…` a `STRIPE_WEBHOOK_SECRET`.

## Levantar todo (full Docker)

```bash
docker compose up --build
```

- Frontend: <http://localhost:3000>
- Backend:  <http://localhost:4000>
- AI:       <http://localhost:4100> (interna; expuesta solo en modo dev)
- Mongo:    `mongodb://localhost:27017`

## Desarrollo con hot reload

Backend, AI y Mongo en Docker; frontend local:

```bash
docker compose -f docker-compose.dev.yml up --build      # terminal 1
pnpm install                                              # terminal 2
pnpm --filter frontend dev                                # terminal 2
```

## Scripts útiles

```bash
pnpm install                # instala todo el monorepo
pnpm dev                    # corre los 3 servicios en paralelo (host)
pnpm --filter frontend dev  # solo frontend
pnpm --filter backend dev   # solo backend
pnpm --filter ai-service dev
pnpm build                  # build de todos
pnpm typecheck              # type-check de todos
pnpm docker:up              # docker compose up --build (full)
pnpm docker:dev             # docker compose dev
pnpm docker:down            # detener y limpiar volúmenes
```

## Endpoints clave (resumen)

### Backend (`apps/backend`)
- `POST /api/games` — crear partida contra IA.
- `GET  /api/games/:id` — obtener estado actual.
- `POST /api/games/:id/move` — registrar movimiento del jugador.
- `POST /api/games/:id/resume` — reanudar desde otro dispositivo.
- `GET  /api/ranking` — top jugadores.
- `GET  /api/me` — perfil + estadísticas.
- `POST /api/billing/checkout` — Stripe Checkout.
- `POST /api/billing/portal` — Stripe Customer Portal.
- `POST /api/webhooks/stripe` — webhook de Stripe (firma verificada).
- `GET  /ws?gameId=...` — WebSocket de la partida.

### AI service (`apps/ai-service`)
- `POST /move` — recibe `{ board, turn, difficulty }`, devuelve mejor jugada.
- `GET  /health`

## Observabilidad

- Logs JSON estructurados (`pino`) en backend y ai-service.
- Cabecera `X-Correlation-Id` propagada extremo a extremo.
- Compatible con stack Loki/Grafana (el formato es line-delimited JSON sobre stdout).
