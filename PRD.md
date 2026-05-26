# PRD — Proyecto 2: Damas (Checkers) con IA, ranking, pagos y estado remoto

## 1. Resumen

Construir una aplicación web de juego de damas (checkers) con autenticación, persistencia remota de partidas, ranking de jugadores, pagos para personalización visual y un microservicio de inteligencia artificial separado del backend principal.

El sistema debe permitir jugar contra la computadora, con al menos 3 niveles de dificultad, usando un motor de decisión no basado en LLM. La arquitectura debe ser de microservicios y correr con Bun, Hono, MongoDB, Clerk, Stripe, WebSockets y Docker Compose.

---

## 2. Objetivo general

Desarrollar una plataforma funcional donde un usuario pueda:

- Iniciar sesión.
- Jugar damas contra la computadora.
- Guardar y retomar una partida desde otro dispositivo.
- Ver su ranking y estadísticas.
- Pagar para desbloquear diseños personalizados de fichas.
- Recibir respuestas de una IA separada que evalúa movimientos con heurística.

---

## 3. Alcance

### Incluye
- Login con Clerk.
- Autenticación con Google OAuth y email/password.
- Juego de damas con tablero interactivo.
- Modo contra computadora.
- Microservicio de IA separado.
- Persistencia remota del estado de la partida.
- Reanudación de partidas desde otro dispositivo.
- Ranking por victorias y desempeño.
- Conteo de movimientos por partida.
- Pago con Stripe para desbloquear diseños premium.
- WebSockets para sincronización en tiempo real.
- Observabilidad básica con logs y correlation ID.
- Contenerización con Docker Compose.

### No incluye
- LLMs o IA generativa.
- Chat entre jugadores.
- Marketplace complejo.
- Multijugador masivo.
- Funcionalidades que no aporten al juego de damas.
- Uso obligatorio de PokéAPI v2, salvo que el docente lo exija explícitamente.

---

## 4. Usuarios objetivo

### Jugador
Persona que inicia sesión, juega, guarda progreso y consulta su ranking.

### Jugador premium
Persona que además desbloquea personalización visual de fichas mediante pago.

### Administrador técnico
Persona que revisa logs, trazabilidad y estado general de la aplicación.

---

## 5. Problema que resuelve

El proyecto busca demostrar una arquitectura completa de software aplicando:

- Frontend moderno.
- Backend desacoplado.
- IA como microservicio aparte.
- Persistencia compartida y remota.
- Autenticación real.
- Pagos integrados.
- Observabilidad.
- Reglas de juego y evaluación algorítmica.

---

## 6. Requisitos funcionales

### 6.1 Autenticación
- El sistema debe permitir registro e inicio de sesión.
- Debe soportar Google OAuth y email/password.
- Las sesiones deben proteger rutas privadas.
- El usuario debe quedar vinculado a sus partidas y estadísticas.

### 6.2 Juego de damas
- El tablero debe ser interactivo.
- El sistema debe validar movimientos permitidos.
- Debe soportar capturas y reglas base del juego.
- Debe registrar cada jugada.
- Debe detectar victoria, derrota o empate si aplica.

### 6.3 Estado remoto compartido
- Cada partida debe tener un identificador único.
- El estado de la partida debe guardarse en MongoDB.
- El usuario debe poder cerrar sesión o cambiar de dispositivo y retomar la partida.
- El backend debe ser la fuente de verdad del estado.
- El frontend solo debe representar el estado que recibe.

### 6.4 Modo contra computadora
- Debe existir un oponente computacional.
- Debe haber al menos 3 niveles de dificultad:
  - Fácil
  - Medio
  - Difícil
- La IA debe evaluar estados del tablero y escoger el mejor movimiento.
- La IA no debe depender de LLMs.

### 6.5 Ranking y estadísticas
- El sistema debe guardar victorias, derrotas y partidas jugadas.
- Debe registrar cuántos movimientos tarda cada victoria.
- Debe mostrar ranking de jugadores.
- El ranking debe poder considerar:
  - cantidad de victorias
  - porcentaje de victorias
  - menor cantidad de movimientos para ganar

### 6.6 Pagos y premium
- El usuario debe poder pagar con Stripe.
- Stripe debe manejar checkout y portal de cliente.
- Webhooks deben actualizar el estado premium.
- El estado premium debe habilitar personalización visual de fichas.

### 6.7 Observabilidad
- Deben existir logs estructurados.
- Debe existir un correlation ID por petición.
- El flujo entre servicios debe poder rastrearse.
- Debe ser compatible con Grafana para visualización.

---

## 7. Requisitos no funcionales

- Arquitectura modular y desacoplada.
- Código mantenible y claro.
- Respuesta rápida para acciones del usuario.
- Seguridad básica en rutas, sesiones y webhooks.
- Contenerización con Docker Compose.
- Escalabilidad por servicios.
- Separación clara entre frontend, backend e IA.

---

## 8. Stack técnico

- **Frontend:** TanStack Start (React) + Framer Motion
- **Runtime:** Bun
- **Backend:** Hono sobre Bun + WebSockets
- **Base de datos:** MongoDB
- **Autenticación:** Clerk
- **Pagos:** Stripe
- **Gestor de paquetes:** pnpm
- **Contenedores:** Docker Compose
- **Observabilidad:** logs estructurados + correlation ID + Grafana
- **Microservicio IA:** Bun + Hono separado

---

## 9. Arquitectura propuesta

### Componentes
- Frontend
- Backend principal
- Microservicio de IA
- MongoDB
- Clerk
- Stripe
- WebSockets
- Sistema de observabilidad

### Flujo general
1. El usuario entra al frontend.
2. El frontend autentica con Clerk.
3. El frontend envía acciones al backend principal.
4. El backend valida, guarda y actualiza el estado.
5. Si la partida es contra IA, el backend envía el tablero al microservicio de IA.
6. El microservicio responde con el mejor movimiento.
7. El backend actualiza MongoDB y notifica al frontend por WebSockets.

### Separación de responsabilidades
- **Frontend:** interfaz, interacción, vista del tablero.
- **Backend principal:** validación, persistencia, autenticación de sesión, ranking, pagos, coordinación.
- **Microservicio IA:** análisis de estados, heurística, selección de jugadas.

---

## 10. Diseño del microservicio de IA

El motor de IA debe recibir un payload con el estado actual del tablero y responder con el movimiento sugerido.

### Entrada esperada
- Estado del tablero.
- Turno actual.
- Nivel de dificultad.
- Piezas disponibles.
- Posibles capturas o jugadas relevantes.

### Salida esperada
- Movimiento seleccionado.
- Evaluación del movimiento.
- Estado resultante opcional.
- Justificación técnica interna para depuración.

### Estrategia
La IA debe usar:
- generación de movimientos posibles
- exploración de estados
- heurística de evaluación
- selección del mejor camino según peso o score
- profundidad variable según dificultad

### Niveles
- **Fácil:** profundidad baja y heurística simple.
- **Medio:** profundidad media y evaluación más completa.
- **Difícil:** mayor profundidad, mejor evaluación y mejor selección.

### Heurística sugerida
- capturas realizadas
- piezas propias vs piezas rivales
- avance hacia coronación
- riesgo de ser capturado
- movilidad futura
- control de posiciones favorables

---

## 11. Modelo de datos

### User
- id
- clerkId
- name
- email
- premiumActive
- createdAt
- updatedAt

### Game
- id
- playerId
- opponentType
- difficulty
- boardState
- currentTurn
- status
- winnerId
- moveCount
- createdAt
- updatedAt

### Move
- id
- gameId
- playerId
- from
- to
- capturedPieces
- boardStateAfter
- createdAt

### Ranking
- userId
- wins
- losses
- draws
- totalGames
- avgMovesToWin
- updatedAt

### Subscription
- userId
- stripeCustomerId
- stripeSubscriptionId
- status
- currentPeriodEnd

---

## 12. API esperada

### Backend principal
- Crear partida
- Obtener partida
- Guardar movimiento
- Reanudar partida
- Consultar ranking
- Consultar perfil y estadísticas
- Iniciar checkout de Stripe
- Confirmar webhook de Stripe

### Microservicio IA
- Recibir estado del tablero
- Calcular mejor movimiento
- Devolver jugada sugerida

---

## 13. WebSockets

El sistema debe emitir eventos en tiempo real para:
- actualización del tablero
- turno actual
- partida terminada
- movimiento de IA
- sincronización de estado entre dispositivos

---

## 14. Observabilidad

El sistema debe incluir:
- correlation ID por request
- logs estructurados en JSON
- trazabilidad entre frontend, backend e IA
- compatibilidad con Grafana
- errores con contexto suficiente para depuración

---

## 15. Criterios de aceptación

- Un usuario puede iniciar sesión correctamente.
- Un usuario puede crear una partida y jugar.
- La partida se guarda remotamente.
- El usuario puede continuar la partida desde otro dispositivo.
- La IA responde con jugadas válidas.
- Existen al menos 3 niveles de dificultad.
- El ranking se actualiza al terminar una partida.
- El usuario premium puede cambiar el diseño de sus fichas.
- El proyecto corre con Docker Compose.
- Los servicios están separados por responsabilidad.

---

## 16. Restricciones

- No usar LLMs para la IA.
- No mezclar la lógica de IA dentro del frontend.
- No exponer el backend de IA directamente al cliente.
- No incluir funciones irrelevantes para el juego.
- Mantener la solución viable para un proyecto académico.

---

## 17. Entregables esperados

- Frontend funcional.
- Backend principal funcional.
- Microservicio de IA funcional.
- Base de datos MongoDB.
- Integración con Clerk.
- Integración con Stripe.
- WebSockets activos.
- Logs y observabilidad básica.
- Docker Compose con todo el sistema levantable.

---

## 18. Resultado esperado

Una aplicación de damas moderna, modular y demostrable, con persistencia remota, IA separada, ranking, autenticación, pagos y observabilidad.