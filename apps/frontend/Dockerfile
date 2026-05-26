# =========================================================================
# Frontend (build estático con Vite). Construir desde la raíz del monorepo:
#   docker build -f apps/frontend/Dockerfile -t checkers-frontend .
#
# Etapa de build usa pnpm (npm está vetado en este proyecto).
# Etapa de runtime sirve los estáticos con nginx:alpine.
# =========================================================================
FROM node:20-alpine AS deps

WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/frontend/package.json apps/frontend/

RUN pnpm install --frozen-lockfile=false

# ----- Build -----
FROM node:20-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend

# Build-args → variables VITE_ inyectadas en el bundle.
ARG PUBLIC_BACKEND_URL=http://localhost:4000
ARG PUBLIC_BACKEND_WS_URL=ws://localhost:4000/ws
ARG CLERK_PUBLISHABLE_KEY=
ARG CLERK_JWT_TEMPLATE=checkers-backend

ENV VITE_BACKEND_URL=$PUBLIC_BACKEND_URL
ENV VITE_BACKEND_WS_URL=$PUBLIC_BACKEND_WS_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_JWT_TEMPLATE=$CLERK_JWT_TEMPLATE

WORKDIR /repo/apps/frontend
RUN pnpm run build

# ----- Runtime: nginx sirviendo los estáticos -----
FROM nginx:alpine AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
