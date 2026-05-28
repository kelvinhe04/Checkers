// =========================================================================
// Página premium: skins + checkout/portal de Stripe.
// =========================================================================

import { Lock } from "lucide-react";
import { useState, useEffect } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth,
} from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { api } from "../lib/api.js";
import { env } from "../lib/env.js";
import { SKINS, readSkinId, writeSkinId } from "../lib/skins.js";

export function PremiumPage() {
  return (
    <>
      <SignedOut>
        <div className="card">
          <p>Inicia sesión para gestionar tu suscripción premium.</p>
          <SignInButton mode="modal">
            <button className="btn">Iniciar sesión</button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <PremiumInner />
      </SignedIn>
    </>
  );
}

function PremiumInner() {
  const auth = useAuth();
  const tokenGetter = () => auth.getToken({ template: env.clerkJwtTemplate });
  const search = useSearch({ strict: false }) as { status?: string };

  const { data: profile, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getProfile(tokenGetter),
  });
  const premium = profile?.premiumActive ?? false;

  const [skinId, setSkinId] = useState<string>(() => {
    const stored = readSkinId();
    const s = SKINS.find((x) => x.id === stored);
    if (s?.premium && !premium) return "classic";
    return stored;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Si el usuario perdió premium (cerró sesión, expiró), resetea el skin.
  useEffect(() => {
    setSkinId((prev) => {
      const s = SKINS.find((x) => x.id === prev);
      if (s?.premium && !premium) return "classic";
      return prev;
    });
  }, [premium]);

  // Si volvemos del checkout con success, sincronizamos con Stripe y refrescamos.
  useEffect(() => {
    if (search?.status !== "success") return;

    let cancelled = false;

    async function syncAndRefetch() {
      try {
        await api.syncPremium(tokenGetter);
      } catch {
        // Si sync falla, igual intentamos refetch (el webhook puede haber llegado).
      }
      if (!cancelled) refetch();
    }

    // Pequeño delay para dar tiempo a Stripe de procesar en caso de que el
    // webhook sí llegue (producción). En desarrollo sync lo resuelve igual.
    const t = setTimeout(syncAndRefetch, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function startCheckout() {
    setBusy(true);
    setErr(null);
    try {
      const res = await api.startCheckout(tokenGetter);
      window.location.href = res.url;
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    setErr(null);
    try {
      const res = await api.openPortal(tokenGetter);
      window.location.href = res.url;
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function chooseSkin(id: string, locked: boolean) {
    if (locked && !premium) return;
    setSkinId(id);
    writeSkinId(id);
  }

  return (
    <div>
      <h1 className="title">Premium</h1>
      <p className="subtitle">
        Desbloquea skins de fichas. Una sola suscripción, cancela cuando quieras.
      </p>

      {search?.status === "success" && !premium && (
        <div className="card" style={{ marginBottom: 16 }}>
          <span className="badge success">Pago confirmado</span>{" "}
          Estamos sincronizando tu estado premium con Stripe…
        </div>
      )}
      {search?.status === "cancel" && (
        <div className="card" style={{ marginBottom: 16 }}>
          <span className="badge muted">Cancelaste el checkout</span>
        </div>
      )}

      <div className="row">
        <div className="card col" style={{ flex: "0 0 320px" }}>
          <h3 style={{ marginTop: 0 }}>Tu plan</h3>
          {premium ? (
            <>
              <span className="badge">Premium activo</span>
              <p className="muted" style={{ marginTop: 8 }}>
                Gracias por apoyar el proyecto.
              </p>
              <button className="btn ghost" disabled={busy} onClick={openPortal}>
                Gestionar suscripción
              </button>
            </>
          ) : (
            <>
              <span className="badge muted">Plan Gratuito</span>
              <ul style={{ paddingLeft: 18, lineHeight: 1.7 }}>
                <li>Acceso a todas las skins de fichas</li>
                <li>Apoyo al proyecto</li>
              </ul>
              <button className="btn" disabled={busy} onClick={startCheckout}>
                {busy ? "Redirigiendo…" : "Suscribirme con Stripe"}
              </button>
              {err && (
                <p style={{ color: "var(--danger)", marginTop: 10 }}>{err}</p>
              )}
            </>
          )}
        </div>

        <div className="card col">
          <h3 style={{ marginTop: 0 }}>Skins de fichas</h3>
          <p className="muted">Selecciona el diseño que quieres usar en tus partidas.</p>
          <div className="skins-grid">
            {SKINS.map((s) => {
              const locked = s.premium && !premium;
              return (
                <motion.div
                  key={s.id}
                  whileHover={{ scale: locked ? 1 : 1.02 }}
                  className={`skin-tile ${
                    skinId === s.id && !locked ? "active" : ""
                  } ${locked ? "locked" : ""}`}
                  onClick={() => chooseSkin(s.id, locked)}
                >
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div className="skin-preview">
                    <div
                      className="skin-dot"
                      style={{
                        background: s.palette.red,
                        border: `3px solid ${s.palette.redStroke}`,
                      }}
                    />
                    <div
                      className="skin-dot"
                      style={{
                        background: s.palette.black,
                        border: `3px solid ${s.palette.blackStroke}`,
                      }}
                    />
                  </div>
                  {s.premium ? (
                    <span className={`badge ${locked ? "muted" : ""}`}>
                      {locked ? <><Lock size={14} /> Premium</> : "Premium"}
                    </span>
                  ) : (
                    <span className="badge muted">Gratuito</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
