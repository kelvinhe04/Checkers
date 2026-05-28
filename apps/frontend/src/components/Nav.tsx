import { Crown } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth,
  useClerk,
  useUser,
} from "@clerk/clerk-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { api } from "../lib/api.js";
import { env } from "../lib/env.js";
import { ConfirmModal } from "./ConfirmModal.js";
import { ProfileModal } from "./ProfileModal.js";

const LINKS = [
  { to: "/", label: "Inicio" },
  { to: "/play", label: "Jugar" },
  { to: "/ranking", label: "Ranking" },
  { to: "/profile", label: "Perfil" },
  { to: "/premium", label: "Premium" },
] as const;

export function Nav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useUser();
  const { signOut } = useClerk();
  const auth = useAuth();
  const tokenGetter = () => auth.getToken({ template: env.clerkJwtTemplate });
  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getProfile(tokenGetter),
  });
  const premium = profile?.premiumActive ?? false;
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  return (
    <>
      <nav className="nav">
        <div className="nav-brand">
          <Crown size={22} />
          <span>Damas</span>
          {premium ? <span className="badge">Premium</span> : null}
        </div>
        <div className="nav-links">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link ${path === l.to ? "active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav-right">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn">Iniciar sesión</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            {user?.imageUrl && (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={user.imageUrl}
                  alt="avatar"
                  onClick={() => setShowProfileModal(true)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "2px solid rgba(245, 158, 11, 0.45)",
                    cursor: "pointer",
                  }}
                />
                {premium && (
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#f59e0b",
                      borderRadius: "50%",
                      width: 14,
                      height: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 6px rgba(245, 158, 11, 0.6)",
                    }}
                  >
                    <Crown size={9} color="#1f2937" strokeWidth={2.5} />
                  </div>
                )}
              </div>
            )}
          </SignedIn>
        </div>
      </nav>

      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSignOut={() => {
          setShowProfileModal(false);
          setShowSignOutModal(true);
        }}
      />

      <ConfirmModal
        open={showSignOutModal}
        title="Cerrar sesión"
        message="¿Estás seguro de que quieres cerrar sesión? Tus partidas se guardarán y podrás continuar después."
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        onConfirm={() => signOut({ redirectUrl: "/" })}
        onCancel={() => setShowSignOutModal(false)}
      />
    </>
  );
}
