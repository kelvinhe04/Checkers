export const env = {
  backendUrl: import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000",
  backendWsUrl:
    import.meta.env.VITE_BACKEND_WS_URL ?? "ws://localhost:4000/ws",
  clerkPublishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "",
  clerkJwtTemplate:
    import.meta.env.VITE_CLERK_JWT_TEMPLATE ?? "checkers-backend",
} as const;
