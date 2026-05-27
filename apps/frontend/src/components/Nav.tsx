import { Crown } from "lucide-react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { clerkAppearance } from "../lib/clerkTheme.js";

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
  const premium = (user?.publicMetadata?.premium as boolean | undefined) ?? false;

  return (
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
          <UserButton afterSignOutUrl="/" appearance={clerkAppearance} />
        </SignedIn>
      </div>
    </nav>
  );
}
