import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { motion } from "framer-motion";

export function HomePage() {
  return (
    <div>
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="title">Damas con IA, ranking y partidas reanudables</h1>
        <p className="subtitle">
          Juega contra una IA con tres niveles de dificultad. Tus partidas se
          guardan en el servidor: puedes cerrar el navegador y continuar en
          otro dispositivo.
        </p>
      </motion.div>

      <div className="row">
        <motion.div
          className="card col"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <h3 style={{ marginTop: 0 }}>🎯 Empieza a jugar</h3>
          <p className="muted">
            Elige dificultad y arrasamos contra la IA. Capturas obligatorias,
            coronación, y multi-saltos.
          </p>
          <SignedIn>
            <Link to="/play" className="btn">
              Nueva partida
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn">Inicia sesión para jugar</button>
            </SignInButton>
          </SignedOut>
        </motion.div>

        <motion.div
          className="card col"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <h3 style={{ marginTop: 0 }}>🏆 Ranking global</h3>
          <p className="muted">
            Compite por victorias y rapidez. El ranking ordena por wins, win
            rate y menor cantidad de movimientos por victoria.
          </p>
          <Link to="/ranking" className="btn secondary">
            Ver ranking
          </Link>
        </motion.div>

        <motion.div
          className="card col"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <h3 style={{ marginTop: 0 }}>✨ Premium</h3>
          <p className="muted">
            Desbloquea skins de fichas (Océano, Neón, Oro). Pago con Stripe,
            cancela cuando quieras.
          </p>
          <Link to="/premium" className="btn ghost">
            Ver planes
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
