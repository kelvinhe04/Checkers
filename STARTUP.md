# Cómo arrancar el proyecto

## Requisitos previos

- [Bun](https://bun.sh) instalado
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) corriendo
- `pnpm` instalado (`npm install -g pnpm`)
- Archivos `.env` configurados (ver `README.md` o `.env.example`)

---

## Modo 1 — Dev local (recomendado para desarrollo)

Frontend, backend y AI service corren con hot-reload fuera de Docker.
Solo MongoDB corre en un contenedor.

> **Antes de usar este modo**, verifica que `apps/backend/.env` tenga:
> ```
> MONGO_URL=mongodb://checkers:checkers@localhost:27018/checkers?authSource=admin
> AI_SERVICE_URL=http://localhost:4100
> ```

### Paso 1 — Levantar MongoDB

```powershell
docker run -d --name checkers-mongo -p 27018:27017 `
  -e MONGO_INITDB_ROOT_USERNAME=checkers `
  -e MONGO_INITDB_ROOT_PASSWORD=checkers `
  -e MONGO_INITDB_DATABASE=checkers `
  mongo:7
```

> Si el contenedor ya existe de una sesión anterior, solo inícialo:
> ```powershell
> docker start checkers-mongo
> ```

### Paso 2 — AI Service (nueva terminal)

```powershell
pnpm --filter ai-service dev
```

Queda en `http://localhost:4100`

### Paso 3 — Backend (nueva terminal)

```powershell
pnpm --filter backend dev
```

Queda en `http://localhost:4000`

### Paso 4 — Frontend (nueva terminal)

```powershell
pnpm --filter frontend dev
```

Queda en `http://localhost:5173`

### Paso 5 — Webhooks de Stripe (opcional, nueva terminal)

Solo necesario si vas a probar el flujo de pago premium.

```powershell
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

### Para detener

Cierra las 3 terminales. Para detener MongoDB:

```powershell
docker stop checkers-mongo
```

---

## Modo 2 — Todo en Docker

Frontend, backend, AI service y MongoDB corren como contenedores.

> **Antes de usar este modo**, el archivo `.env` en la raíz del proyecto
> debe tener las claves reales de Clerk y Stripe (no los `replace_me`).
> Copia los valores que ya pusiste en `apps/backend/.env` y `apps/frontend/.env`.

### Levantar todo

```powershell
docker compose up --build
```

| Servicio   | URL                       |
|------------|---------------------------|
| Frontend   | http://localhost:3000     |
| Backend    | http://localhost:4000     |
| AI Service | interno (no expuesto)     |
| MongoDB    | localhost:27017           |

### Para detener

```powershell
docker compose down
```

Para detener y borrar los datos de MongoDB:

```powershell
docker compose down -v
```

---

## Notas

- En Modo 1, si el puerto 27017 está ocupado (otro proyecto), usa el 27018 como se muestra arriba.
- En Modo 2, el frontend se construye con las variables de entorno del `.env` raíz. Si cambias las claves, hay que reconstruir con `--build`.
- El JWT Template `checkers-backend` debe existir en tu dashboard de Clerk para que la autenticación funcione.
