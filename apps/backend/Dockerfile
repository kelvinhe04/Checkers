# =========================================================================
# Backend principal. Construir desde la raíz del monorepo:
#   docker build -f apps/backend/Dockerfile -t checkers-backend .
# =========================================================================
FROM oven/bun:1.1-alpine AS deps

WORKDIR /repo

# Bun no incluye pnpm. Lo activamos vía corepack (sin pasar por npm).
RUN apk add --no-cache wget nodejs && bun install -g pnpm@9.12.0

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/

RUN pnpm install --frozen-lockfile=false

# ----- Runtime -----
FROM oven/bun:1.1-alpine AS runtime

WORKDIR /repo

RUN apk add --no-cache wget

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

WORKDIR /repo/apps/backend

ENV BACKEND_PORT=4000
EXPOSE 4000

CMD ["bun", "run", "src/index.ts"]
