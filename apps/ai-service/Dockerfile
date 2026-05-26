# =========================================================================
# Microservicio de IA. Construye desde la raíz del monorepo:
#   docker build -f apps/ai-service/Dockerfile -t checkers-ai .
# =========================================================================
FROM oven/bun:1.1-alpine AS deps

WORKDIR /repo

# Instalar pnpm (npm está vetado en este proyecto).
# Bun no incluye pnpm. Lo activamos vía corepack (sin pasar por npm).
RUN apk add --no-cache wget nodejs && corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copiamos manifests para aprovechar cache.
COPY package.json pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/ai-service/package.json apps/ai-service/

RUN pnpm install --frozen-lockfile=false

# ----- Runtime -----
FROM oven/bun:1.1-alpine AS runtime

WORKDIR /repo

RUN apk add --no-cache wget

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/ai-service/node_modules ./apps/ai-service/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/ai-service ./apps/ai-service

WORKDIR /repo/apps/ai-service

ENV AI_PORT=4100
EXPOSE 4100

CMD ["bun", "run", "src/index.ts"]
