import { Crown, LogOut } from "lucide-react";
import { useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useClerk,
  useUser,
} from "@clerk/clerk-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ConfirmModal } from "./ConfirmModal.js";

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
  const premium = (user?.publicMetadata?.premium as boolean | undefined) ?? false;
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  return (
    <>
      <nav className="nav">
        <div className="nav-brand">
          <Crown size={22} />
          <span>Checkers</span>
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
              <img
                src={user.imageUrl}
                alt="avatar"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "2px solid rgba(245, 158, 11, 0.45)",
                }}
              />
            )}
            <button
              className="btn ghost"
              onClick={() => setShowSignOutModal(true)}
              style={{ padding: "8px 14px", fontSize: 13 }}
            >
              <LogOut size={16} />
              Salir
            </button>
          </SignedIn>
        </div>
      </nav>

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
