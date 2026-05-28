import { Crown, LogOut, User } from "lucide-react";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";

interface Props {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

const cardStyle: React.CSSProperties = {
  position: "fixed",
  top: 56,
  right: 16,
  zIndex: 1000,
  background:
    "linear-gradient(180deg, rgba(22, 44, 30, 0.97) 0%, rgba(12, 26, 16, 0.98) 60%, rgba(8, 18, 10, 0.99) 100%)",
  border: "1px solid rgba(140, 110, 70, 0.42)",
  borderRadius: 20,
  padding: "28px 28px 16px",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.05), 0 28px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
  width: "100%",
  maxWidth: 320,
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 12,
  color: "#cbd5e1",
  fontSize: "0.95rem",
  fontWeight: 500,
  cursor: "pointer",
  border: "none",
  background: "none",
  width: "100%",
  textAlign: "left",
  textDecoration: "none",
};

export function ProfileModal({ open, onClose, onSignOut }: Props) {
  const { user } = useUser();

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 998,
          background: "transparent",
        }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* User info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            paddingBottom: 20,
            marginBottom: 12,
            borderBottom: "1px solid rgba(140, 110, 70, 0.25)",
          }}
        >
          {user?.imageUrl && (
            <img
              src={user.imageUrl}
              alt="avatar"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "2px solid rgba(245, 158, 11, 0.5)",
              }}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "#d6e9c8",
                fontWeight: 700,
                fontSize: "1rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.fullName ?? "Usuario"}
            </div>
            <div
              style={{
                color: "#94a3b8",
                fontSize: "0.8rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.primaryEmailAddress?.emailAddress ?? ""}
            </div>
          </div>
        </div>

        {/* Options */}
        <Link
          to="/profile"
          style={itemStyle}
          onClick={onClose}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "none")
          }
        >
          <User size={18} style={{ color: "#f59e0b" }} />
          Mi Perfil
        </Link>

        <Link
          to="/premium"
          style={itemStyle}
          onClick={onClose}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "none")
          }
        >
          <Crown size={18} style={{ color: "#f59e0b" }} />
          Premium
        </Link>

        <div
          style={{
            margin: "8px 0 4px",
            borderTop: "1px solid rgba(140, 110, 70, 0.25)",
          }}
        />

        {/* Sign out */}
        <button
          onClick={onSignOut}
          style={{
            ...itemStyle,
            color: "#f87171",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(220, 38, 38, 0.12)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "none")
          }
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </motion.div>
    </>
  );
}
