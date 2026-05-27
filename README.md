# Checkers — Damas 8x8 con IA, ranking, pagos y estado remoto

Monorepo del Proyecto 2 (ver `PRD.md`). Arquitectura de **microservicios** con **3 componentes independientes**: frontend React, backend API REST, y servicio de IA. Todo contenedorizado con **Docker Compose** y listo para desarrollo local o despliegue.

> **Gestor de paquetes:** `pnpm` (obligatorio — no usar npm).

## Estructura del proyecto

```
.
├── apps/
│   ├── frontend/                 TanStack Router + React + Vite + Clerk + Stripe Client
│   │   ├── src/
│   │   │   ├── components/       React components reutilizables
│   │   │   ├── routes/           TanStack Router páginas/rutas
│   │   │   ├── lib/              Utilidades (API client, hooks)
│   │   │   ├── styles/           CSS globales
│   │   │   ├── main.tsx          Entry point (Vite)
│   │   │   └── App.tsx           Router setup
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   ├── backend/                  Hono + Bun + MongoDB + Clerk + Stripe + WebSockets
│   │   ├── src/
│   │   │   ├── routes/           Hono route handlers (games, ranking, billing, webhooks)
│   │   │   ├── middleware/       Auth, logging, CORS
│   │   │   ├── services/         Business logic (games, users, billing)
│   │   │   ├── db/               MongoDB models/schemas
│   │   │   └── index.ts          Entry point (Hono app)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   └── ai-service/               Hono + Bun + Minimax Chess Engine
│       ├── src/
│       │   ├── engine/           Lógica de damas + algoritmo minimax (3 niveles)
│       │   ├── routes/           Hono route handlers (/move, /health)
│       │   └── index.ts          Entry point (Hono app)
│       ├── package.json
│       ├── tsconfig.json
│       └── .env.example
│
├── packages/
│   └── shared/                   Código compartido entre los 3 servicios
│       ├── src/
│       │   ├── types.ts          Tipos TypeScript compartidas (Game, User, etc.)
│       │   ├── schemas.ts        Zod schemas para validación
│       │   └── rules.ts          Reglas de las damas
│       └── package.json
│
├── docker-compose.yml            Producción: todos los servicios contenedorizados
├── docker-compose.dev.yml        Dev: Backend + AI + MongoDB en Docker; frontend local
├── pnpm-workspace.yaml           Monorepo workspace config
├── PRD.md                         Especificación completa del proyecto
├── .env.example                  Variables de entorno compartidas (CLERK, STRIPE, MONGODB)
├── .gitignore
└── package.json                  Root package.json con scripts
```

## Stack Tecnológico

### 🎮 Frontend
- **Framework:** React 18 + TanStack Router (SPA)
- **Build:** Vite 5
- **Animaciones:** Framer Motion
- **Autenticación:** Clerk
- **Pagos:** Stripe.js Client SDK
- **UI Components:** lucide-react (iconos)
- **Request Client:** TanStack React Query
- **Lenguaje:** TypeScript

### 🔧 Backend
- **Framework:** Hono 4 (web framework minimalista)
- **Runtime:** Bun ≥ 1.1
- **Base de datos:** MongoDB 6
- **Autenticación:** Clerk Backend SDK
- **Pagos:** Stripe Node SDK (webhooks)
- **WebSockets:** Hono WebSocket adapters
- **Logging:** Pino (JSON estructurado)
- **Validación:** Zod
- **Lenguaje:** TypeScript

### 🤖 Servicio de IA
- **Framework:** Hono 4
- **Runtime:** Bun ≥ 1.1
- **Algoritmo:** Minimax con 3 niveles de dificultad
- **Validación:** Zod
- **Logging:** Pino (JSON estructurado)
- **Lenguaje:** TypeScript

### 📦 Infraestructura compartida
- **Gestor de paquetes:** pnpm v9+
- **Contenedores:** Docker Compose
- **Tipos compartidas:** monorepo workspace

## Requisitos

### Mínimos
- **pnpm** ≥ 9 — [instalar](https://pnpm.io/installation)
- **Docker** & **Docker Compose** v2+ — [instalar](https://docs.docker.com/get-docker/)

### Opcionales
- **Bun** ≥ 1.1 — Solo si ejecutas frontend fuera de contenedores (desarrollo local)
- **Node.js** ≥ 20 — Solo si no usas Bun

## Configuración (Setup)

### 1️⃣ Clonar y preparar variables de entorno

```bash
# Copia el archivo de ejemplo del root
cp .env.example .env
# Edita .env y rellena las claves (Clerk, Stripe, MongoDB)
# Ver secciones "Configurar Clerk" y "Configurar Stripe" abajo
```

### 2️⃣ Instalar dependencias

```bash
pnpm install
```

Este comando instala todas las dependencias del monorepo (frontend, backend, ai-service y shared).

### 3️⃣ Configurar Clerk (Autenticación)

1. **Crear aplicación en Clerk**
   - Ve a [clerk.com](https://clerk.com) → Sign up → New Application
   - Habilita **Google OAuth** y **Email/Password**

2. **Copiar credenciales al `.env` raíz**
   ```env
   CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

3. **Crear JWT Template para el backend**
   - En el dashboard de Clerk → **JWT Templates**
   - Click **+ New template** → nómbralo `checkers-backend`
   - Deja el payload por defecto (incluye `sub`, `email`, `name`)
   - En `.env`: asegúrate de que `CLERK_JWT_TEMPLATE=checkers-backend`

### 4️⃣ Configurar Stripe (Pagos)

1. **Crear cuenta y producto**
   - Ve a [stripe.com](https://stripe.com) → Sign up (modo test)
   - Ve a **Products** → **+ Create** → crea un producto recurrente (ej. "Checkers Premium")
   - Nota el `price_...` (precio recurrente)

2. **Copiar credenciales al `.env` raíz**
   ```env
   STRIPE_PRICE_PREMIUM=price_...    # ID del precio recurrente
   STRIPE_SECRET_KEY=sk_test_...      # Secret key
   STRIPE_WEBHOOK_SECRET=whsec_...    # Veremos después
   ```

3. **Configurar webhook (para escuchar pagos en local)**
   - [Descarga Stripe CLI](https://stripe.com/docs/stripe-cli)
   - En una terminal:
     ```bash
     stripe listen --forward-to localhost:4000/api/webhooks/stripe
     ```
   - Copia el `whsec_...` que aparece → pégalo en `STRIPE_WEBHOOK_SECRET` en `.env`

## Ejecutar el proyecto

Hay 2 formas principales: **Docker** (recomendado para dev) o **localhost** (requiere Bun).

### 🐳 Opción A: Desarrollo con Docker (Recomendado)

Backend, AI service y MongoDB en contenedores; frontend corriendo localmente con hot reload:

```bash
# Terminal 1: Inicia Docker Compose (Backend + AI + MongoDB)
docker compose -f docker-compose.dev.yml up --build

# Terminal 2: Instala dependencias (si no lo hiciste)
pnpm install

# Terminal 3: Inicia el frontend con hot reload
pnpm --filter frontend dev
```

**URLs:**
- Frontend: <http://localhost:3000>
- Backend:  <http://localhost:4000>
- AI Service: <http://localhost:4100> (solo en dev, acceso interno)
- MongoDB:  `mongodb://localhost:27017`

**Detener:**
```bash
docker compose -f docker-compose.dev.yml down -v
```

### 🚀 Opción B: Desarrollo en localhost (Requiere Bun)

Los 3 servicios corren localmente. MongoDB debe estar en Docker o en una URL remota.

**Requisitos:**
- [Bun](https://bun.sh) instalado
- MongoDB corriendo (Docker o local)

**Pasos:**

```bash
# Terminal 1: Backend
pnpm --filter backend dev
# Escucha en http://localhost:4000

# Terminal 2: AI Service
pnpm --filter ai-service dev
# Escucha en http://localhost:4100

# Terminal 3: Frontend
pnpm --filter frontend dev
# Escucha en http://localhost:5173 (Vite default)
```

### 🐳 Opción C: Full Docker (Producción / Demo)

Todos los servicios en contenedores:

```bash
docker compose up --build
```

**URLs:**
- Frontend: <http://localhost:3000>
- Backend:  <http://localhost:4000>
- AI Service: no expuesta (interna)
- MongoDB:  `mongodb://mongo:27017`

## Scripts convenientes

| Comando | Descripción |
|---------|-------------|
| `pnpm install` | Instala deps del monorepo completo |
| `pnpm dev` | Corre los 3 servicios en paralelo (localhost, requiere Bun) |
| `pnpm --filter frontend dev` | Solo frontend (hot reload) |
| `pnpm --filter backend dev` | Solo backend (watch mode) |
| `pnpm --filter ai-service dev` | Solo AI service (watch mode) |
| `pnpm build` | Build de producción de todos los servicios |
| `pnpm typecheck` | TypeScript check en todos los servicios |
| `pnpm docker:up` | `docker compose up --build` (full Docker) |
| `pnpm docker:dev` | `docker compose -f docker-compose.dev.yml up --build` |
| `pnpm docker:down` | Detiene y limpia volúmenes Docker |

## API Endpoints

### 🔐 Backend (`apps/backend` — port 4000)

**Autenticación:** Todos los endpoints requieren bearer token de Clerk

#### Partidas
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/games` | POST | Crear nueva partida contra IA |
| `/api/games/:id` | GET | Obtener estado de la partida |
| `/api/games/:id/move` | POST | Registrar movimiento del jugador |
| `/api/games/:id/resume` | POST | Reanudar desde otro dispositivo |

#### Ranking y Perfil
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/ranking` | GET | Top 100 jugadores (público) |
| `/api/me` | GET | Perfil + estadísticas del usuario actual |

#### Billing (Stripe)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/billing/checkout` | POST | Iniciar Stripe Checkout |
| `/api/billing/portal` | POST | Abrir Stripe Customer Portal |
| `/api/webhooks/stripe` | POST | Webhook para eventos de Stripe |

#### WebSocket
| Endpoint | Descripción |
|----------|-------------|
| `/ws?gameId=<id>` | WebSocket en tiempo real de la partida |

### 🤖 AI Service (`apps/ai-service` — port 4100)

| Endpoint | Método | Request | Response | Descripción |
|----------|--------|---------|----------|-------------|
| `/move` | POST | `{ board: number[], turn: 1\|2, difficulty: 1\|2\|3 }` | `{ move: [from, to] }` | Calcula la mejor jugada (minimax) |
| `/health` | GET | — | `{ status: "ok" }` | Health check |

## Desarrollo

### Type-checking

Todos los servicios están en TypeScript. Antes de hacer commit:

```bash
pnpm typecheck
```

### Testing

Actualmente no hay tests. Para agregar:
- **Frontend:** Vitest + React Testing Library
- **Backend:** Vitest + Supertest
- **AI Service:** Vitest

## Observabilidad

### Logs

- **Backend y AI Service:** JSON estructurados con `pino`
- **Formato:** line-delimited JSON (compatible con Loki/Grafana)
- **Cabecera:** `X-Correlation-Id` propagada extremo a extremo para tracing

Ejemplo log del backend:
```json
{"level":30,"time":"2025-05-27T...","pid":123,"hostname":"...","msg":"Game created","gameId":"abc123","userId":"user_..."}
```

### Debugging

**Frontend:**
```bash
# En DevTools: F12 → Network, Console, etc.
# Vite genera source maps automáticamente
```

**Backend / AI Service:**
```bash
# Los logs JSON van a stdout
# Para verlos formateados en dev:
pnpm --filter backend dev 2>&1 | jq '.'  # parsea JSON
```

## Troubleshooting

### ❌ Error: "Command pnpm not found"
```bash
npm install -g pnpm@9
```

### ❌ Error: "Docker daemon not running"
- Abre **Docker Desktop** (Windows/Mac)
- Espera a que esté listo (ícono estable)

### ❌ Error: "Port 3000/4000 already in use"
```bash
# Encuentra el proceso usando el puerto (ej. 3000)
lsof -i :3000  # macOS/Linux
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess  # PowerShell Windows

# Mátalo o usa un puerto diferente:
VITE_PORT=3001 pnpm --filter frontend dev
```

### ❌ Error: "MongoDB connection refused"
- Si usas Docker: verifica que `docker compose` esté corriendo
  ```bash
  docker ps  # debería mostrar contenedor 'mongo'
  ```
- Si usas MongoDB local: asegúrate que el servicio esté iniciado
  ```bash
  # macOS con brew
  brew services start mongodb-community
  ```

### ❌ Error: "Clerk keys are invalid"
- Verifica que `.env` tenga `CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`
- Cópialos del dashboard de Clerk
- Si cambias las keys, reinicia los servicios

### ❌ Error: "AI service returns 404 from backend"
- Backend intenta conectar a `http://localhost:4100` por defecto
- Verifica que AI service esté corriendo:
  ```bash
  curl http://localhost:4100/health
  ```
- Si está en Docker, backend usa `http://ai-service:4100` automáticamente

### ✅ Verificar que todo funciona

```bash
# Todos los servicios deben responder
curl http://localhost:3000           # Frontend
curl http://localhost:4000/health    # Backend (si existe)
curl http://localhost:4100/health    # AI Service
```

## Referencias

- 📄 **Especificación completa:** [`PRD.md`](./PRD.md)
- 🐳 **Docker Compose:** [`docker-compose.yml`](./docker-compose.yml) y [`docker-compose.dev.yml`](./docker-compose.dev.yml)
- 🔐 **Clerk docs:** https://clerk.com/docs
- 💳 **Stripe docs:** https://stripe.com/docs/api
- 🍯 **Hono docs:** https://hono.dev
- 🚀 **Bun docs:** https://bun.sh
- ⚛️ **TanStack Router:** https://tanstack.com/router/latest
- 🎨 **Framer Motion:** https://www.framer.com/motion/

## Notas para el equipo

- **Hot reload:** Frontend (Vite) recarga automáticamente. Backend y AI requieren reinicio.
- **Monorepo:** Cambios en `packages/shared` requieren rebuild de todos los dependientes.
- **Secrets:** Nunca commitees `.env`. Usa `.env.example` para documentar las keys necesarias.
- **Database:** Backups de MongoDB están en volúmenes Docker. Usa `docker compose down -v` con cuidado (borra datos).

---

**Última actualización:** 2025-05-27 | Proyecto 2 del curso Soft 9
