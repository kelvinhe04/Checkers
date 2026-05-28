import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { env } from "../lib/env.js";

export function ProfilePage() {
  return (
    <>
      <SignedOut>
        <div className="card">
          <p>Inicia sesión para ver tu perfil.</p>
          <SignInButton mode="modal">
            <button className="btn">Iniciar sesión</button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <ProfileInner />
      </SignedIn>
    </>
  );
}

function ProfileInner() {
  const auth = useAuth();
  const tokenGetter = () => auth.getToken({ template: env.clerkJwtTemplate });
  const { data, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getProfile(tokenGetter),
  });

  return (
    <div>
      <h1 className="title">Tu perfil</h1>
      {isLoading && <p className="muted">Cargando…</p>}
      {error && (
        <p style={{ color: "var(--danger)" }}>Error: {(error as Error).message}</p>
      )}
      {data && (
        <div className="row">
          <div className="card col">
            <h3 style={{ marginTop: 0 }}>{data.name}</h3>
            <p className="muted">{data.email}</p>
            <p>
              Estado:{" "}
              {data.premiumActive ? (
                <span className="badge">Premium</span>
              ) : (
                <span className="badge muted">Gratuito</span>
              )}
            </p>
          </div>
          <div className="card col">
            <h3 style={{ marginTop: 0 }}>Estadísticas</h3>
            <Stat label="Partidas" value={data.stats.totalGames} />
            <Stat label="Victorias" value={data.stats.wins} />
            <Stat label="Derrotas" value={data.stats.losses} />
            <Stat label="Empates" value={data.stats.draws} />
            <Stat
              label="Rendimiento"
              value={`${(data.stats.winRate * 100).toFixed(1)}%`}
            />
            <Stat
              label="Movs / victoria"
              value={data.stats.avgMovesToWin ?? "—"}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid rgba(148,163,184,0.12)",
      }}
    >
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
