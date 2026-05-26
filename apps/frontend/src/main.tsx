// =========================================================================
// Entry point del frontend (Vite + React 18).
// =========================================================================

import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router.js";
import { env } from "./lib/env.js";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("missing #root");

if (!env.clerkPublishableKey) {
  // No bloqueamos el render: mostramos un mensaje en pantalla para que el
  // desarrollador sepa que hay que configurar Clerk.
  rootEl.innerHTML = `
    <div style="padding:40px;font-family:system-ui;color:#f8fafc;background:#0f172a;min-height:100vh">
      <h1>Configura Clerk</h1>
      <p>Falta <code>VITE_CLERK_PUBLISHABLE_KEY</code> en <code>apps/frontend/.env</code>.</p>
      <p>Cópialo desde <code>.env.example</code> y reinicia el dev server.</p>
    </div>
  `;
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={env.clerkPublishableKey}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ClerkProvider>
    </React.StrictMode>,
  );
}
