# Checkers — Damas Inglesas/Americanas 8x8 con IA, ranking, pagos y estado remoto

## Variante implementada: Damas Inglesas/Americanas (English Draughts)

- **Tablero:** 8×8, 12 piezas por bando, solo casillas oscuras.
- **Movimiento:** peones avanzan en diagonal hacia delante (una casilla). Damas se mueven en cualquier diagonal (una casilla).
- **Captura:** peones capturan solo hacia delante; damas en cualquier diagonal. Captura obligatoria (forceJumps).
- **Capturas múltiples:** la pieza debe seguir capturando mientras sea posible en el mismo turno.
- **Coronación:** al alcanzar la última fila, el peón se convierte en dama. Si se corona durante una captura múltiple, el turno termina.
- **Fin de partida:** pierde el jugador que se queda sin piezas o sin movimientos legales.

---

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
│   └── ai-service/               Hono + Bun + A* (A-Star) Chess Engine
│       ├── src/
  │       │   ├── engine/           Lógica de damas + algoritmo A* (3 niveles)
│       │   ├── routes/           Hono route handlers (/move, /health)
│       │   └── index.ts          Entry point (Hono app)
│       ├── package.json
│       ├── tsconfig.json
│       └── .env.example
│
├── packages/
│   └── shared/                   Código compartido entre los 3 servicios
│       ├── src/
│       │   ├── types.ts          Tipos TypeScript compartidos (Game, User, etc.)
│       │   ├── checkers.ts       Motor de reglas de damas (movimientos, capturas, estado)
│       │   └── index.ts          Re-exportaciones públicas del paquete
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
- **Algoritmo:** A* (A-Star) con 3 niveles de dificultad
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
- Frontend: <http://localhost:5173>
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
- Frontend: <http://localhost:5173>
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
| `/move` | POST | Ver esquema abajo | Ver esquema abajo | Calcula la mejor jugada (A*) |
| `/health` | GET | — | `{ status: "ok" }` | Health check |

**Request `/move`:**
```json
{
  "board": [[".", "b", ".", ...], ...],
  "turn": "red" | "black",
  "difficulty": "easy" | "medium" | "hard",
  "options": { "forceJumps": true, "showMoves": true }
}
```

- `board`: array de arrays de strings `"."`, `"r"` (peón rojo), `"R"` (dama roja), `"b"` (peón negro), `"B"` (dama negra). Tamaño 8×8, 10×10 o 12×12.
- `turn`: color que mueve.
- `difficulty`: nivel de la IA (afecta profundidad A* y heurística).
- `options`: reglas opcionales (por defecto `forceJumps: true`).

**Response `/move`:**
```json
{
  "move": {
    "from": { "row": 5, "col": 2 },
    "to":   { "row": 4, "col": 3 },
    "captures": [],
    "promoted": false
  },
  "evaluation": 120,
  "boardAfter": [[".", ...], ...],
  "depth": 4,
  "computeMs": 38
}
```

## Cómo se invoca el microservicio A*

El backend llama al microservicio IA durante el turno de la computadora:

```
Frontend → POST /api/games/:id/move → Backend → POST /move → AI Service (A*)
                                                              ↓
Frontend ← WebSocket actualiza tablero ← Backend ← { move, boardAfter }
```

1. El jugador envía su movimiento al backend (`POST /api/games/:id/move`).
2. El backend valida el movimiento, lo aplica y detecta si la partida terminó.
3. Si la partida sigue activa, el backend hace `POST http://ai-service:4100/move` con el tablero actual, el turno de la IA y la dificultad.
4. El microservicio ejecuta **A\*** (g(n) + h(n), min-heap, closed set, alternancia MAX/MIN) y devuelve el movimiento elegido con la evaluación y el tablero resultante.
5. El backend aplica el movimiento de la IA, actualiza MongoDB y notifica al frontend vía WebSocket.

En Docker, el backend se comunica con el AI service usando el hostname interno `ai-service:4100` (red `checkers-net`). En desarrollo local, usa `localhost:4100`.

## Desarrollo

### Type-checking

Todos los servicios están en TypeScript. Antes de hacer commit:

```bash
pnpm typecheck
```

### Testing

El proyecto incluye tests unitarios ejecutables con `bun test`:

```bash
# Todos los tests (motor de reglas + IA)
pnpm test

# Solo motor de reglas (packages/shared)
pnpm --filter @checkers/shared test

# Solo microservicio IA (apps/ai-service)
pnpm --filter ai-service test
```

**Cobertura actual:**

| Paquete | Archivo de tests | Casos |
|---------|-----------------|-------|
| `packages/shared` | `src/__tests__/checkers.test.ts` | 28 — motor de reglas: tablero inicial, movimientos legales, capturas, coronación, estado de partida |
| `apps/ai-service` | `src/engine/__tests__/search.test.ts` | 7 — A\* search y `decideMove` para los 3 niveles de dificultad |

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

### ❌ Error: "Port 5173/4000 already in use"
```bash
# Encuentra el proceso usando el puerto (ej. 5173)
lsof -i :5173  # macOS/Linux
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess  # PowerShell Windows

# Mátalo o usa un puerto diferente:
VITE_PORT=5174 pnpm --filter frontend dev
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
curl http://localhost:5173           # Frontend
curl http://localhost:4000/health    # Backend (si existe)
curl http://localhost:4100/health    # AI Service
```

## Limitaciones conocidas

- **A\* en juegos adversariales:** A* no es el algoritmo óptimo para juegos de suma cero — minimax con poda alpha-beta sería más eficiente. Se usa A* por requerimiento de la rúbrica. El límite de `MAX_NODES = 50 000` evita tiempos de cómputo excesivos pero puede truncar la búsqueda antes de alcanzar la profundidad máxima en posiciones muy abiertas.
- **Tableros 10×10 y 12×12:** la UI y el backend soportan múltiples tamaños, pero la demo principal es 8×8. La profundidad del A* se reduce automáticamente en tableros más grandes para no exceder el tiempo de respuesta.
- **Webhooks Stripe en local:** requiere Stripe CLI (`stripe listen`) corriendo en paralelo; sin él, el estado premium no se actualiza hasta usar `/api/billing/sync`.
- **Tests de integración:** no se incluyen tests E2E con Playwright ni tests de las rutas del backend. Los tests cubren el motor de reglas (`packages/shared`) y el algoritmo A* (`apps/ai-service`).
- **Empate no implementado:** el juego detecta victoria pero no empate por repetición de posición ni por regla de los 40 movimientos.
- **Sin IA cooperativa:** si el jugador humano no tiene movimientos, el backend reporta derrota; no existe lógica de oferta de tablas.

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

**Última actualización:** 2026-06-11 | Proyecto 2 del curso Soft 9
