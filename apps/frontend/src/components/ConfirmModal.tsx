import { LogOut, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0, 0, 0, 0.65)",
  backdropFilter: "blur(6px)",
};

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(22, 44, 30, 0.97) 0%, rgba(12, 26, 16, 0.98) 60%, rgba(8, 18, 10, 0.99) 100%)",
  border: "1px solid rgba(140, 110, 70, 0.42)",
  borderRadius: 20,
  padding: "28px 28px 24px",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.05), 0 28px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
  width: "100%",
  maxWidth: 400,
  position: "relative",
};

const titleStyle: React.CSSProperties = {
  color: "#d6e9c8",
  fontWeight: 800,
  fontSize: "1.25rem",
  margin: "0 0 8px",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const msgStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "0.95rem",
  margin: "0 0 24px",
  lineHeight: 1.5,
};

const btnRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={overlay}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "none",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            borderRadius: 6,
          }}
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div style={titleStyle}>
          <LogOut size={20} style={{ color: "#f59e0b" }} />
          {title}
        </div>
        <p style={msgStyle}>{message}</p>

        <div style={btnRow}>
          <button
            className="btn ghost"
            onClick={onCancel}
            style={{ minWidth: 100, justifyContent: "center" }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className="btn"
            onClick={onConfirm}
            style={{
              minWidth: 100,
              justifyContent: "center",
              background: "linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)",
              color: "#fff",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
