// Paleta "mesa de billar" — coherente con globals.css
// Verdes oscuros, bordes con tono madera, acento ámbar.

export const clerkAppearance = {
  variables: {
    colorPrimary: "#f59e0b",
    colorText: "#f1f5f9",
    colorTextSecondary: "#94a3b8",
    colorBackground: "#0b1a10",
    colorInputBackground: "#0e2016",
    colorInputText: "#f1f5f9",
    colorDanger: "#ef4444",
    colorSuccess: "#22c55e",
    borderRadius: "0.75rem",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    // spacingUnit controla el espaciado interno de todos los elementos de Clerk
    spacingUnit: "14px",
    fontSize: "1rem",
  },
  elements: {
    // ── Backdrop del modal ──────────────────────────────────────────────────
    modalBackdrop: {
      background: "rgba(0, 0, 0, 0.65)",
      backdropFilter: "blur(6px)",
    },

    // ── Tarjeta principal ───────────────────────────────────────────────────
    card: {
      background:
        "linear-gradient(180deg, rgba(22, 44, 30, 0.97) 0%, rgba(12, 26, 16, 0.98) 60%, rgba(8, 18, 10, 0.99) 100%)",
      border: "1px solid rgba(140, 110, 70, 0.42)",
      borderRadius: "20px",
      padding: "12px 4px",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.05), 0 28px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
    },

    // ── Encabezado ──────────────────────────────────────────────────────────
    headerTitle: {
      color: "#d6e9c8",
      fontWeight: 800,
      fontSize: "1.4rem",
      letterSpacing: "1px",
      textTransform: "uppercase",
    },
    headerSubtitle: {
      color: "#7a9a80",
      fontSize: "0.9rem",
    },

    // ── Sección de botones OAuth ────────────────────────────────────────────
    socialButtonsBlockButton: {
      background:
        "linear-gradient(180deg, rgba(38, 72, 48, 0.95) 0%, rgba(22, 48, 30, 0.95) 100%)",
      border: "1px solid rgba(140, 110, 70, 0.5)",
      borderRadius: "12px",
      color: "#e8e0d0",
      padding: "14px 20px",
      minHeight: "52px",
      fontSize: "0.95rem",
      fontWeight: 600,
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 8px rgba(0,0,0,0.25)",
      justifyContent: "center",
      gap: "12px",
    },
    socialButtonsBlockButtonText: {
      color: "#ece8e0",
      fontWeight: 600,
      fontSize: "0.95rem",
      letterSpacing: "0.2px",
    },
    // Badge "Last used"
    socialButtonsBlockButtonBadge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2px 8px",
      fontSize: "0.7rem",
      borderRadius: "999px",
      pointerEvents: "none",
    },

    // ── Divisor ─────────────────────────────────────────────────────────────
    dividerLine: {
      background: "rgba(140, 110, 70, 0.28)",
    },
    dividerText: {
      color: "#5a7060",
      fontSize: "0.8rem",
      letterSpacing: "0.5px",
    },

    // ── Campos ──────────────────────────────────────────────────────────────
    formFieldLabel: {
      color: "#a8c89a",
      fontWeight: 600,
      fontSize: "0.8rem",
      textTransform: "uppercase",
      letterSpacing: "1px",
    },
    formFieldInput: {
      background: "rgba(5, 14, 8, 0.9)",
      border: "1px solid rgba(140, 110, 70, 0.5)",
      color: "#f1f5f9",
      borderRadius: "10px",
      padding: "0.8rem 1rem",
      fontSize: "0.95rem",
      minHeight: "50px",
      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
    },
    formFieldErrorText: {
      color: "#f87171",
      fontSize: "0.8rem",
    },
    formFieldSuccessText: {
      color: "#4ade80",
      fontSize: "0.8rem",
    },

    // ── Botón primario (CONTINUE) ───────────────────────────────────────────
    formButtonPrimary: {
      background: "linear-gradient(180deg, #3a8a5a 0%, #2a6a42 100%)",
      color: "#ffffff",
      fontWeight: 700,
      fontSize: "1rem",
      letterSpacing: "1.5px",
      borderRadius: "999px",
      border: "none",
      padding: "0.8rem 1.5rem",
      minHeight: "52px",
      textTransform: "uppercase",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 18px rgba(0,0,0,0.35)",
    },

    // ── Footer — ocultar branding de Clerk ──────────────────────────────────
    footer: {
      display: "none",
    },
    badge: {
      display: "none",
    },

    // ── Acción de footer ("¿No tienes cuenta?") ─────────────────────────────
    footerActionText: {
      color: "#7a9a80",
      fontSize: "0.9rem",
    },
    footerActionLink: {
      color: "#f59e0b",
      fontWeight: 600,
      fontSize: "0.9rem",
    },

    // ── Vista previa de identidad (OTP / paso 2) ────────────────────────────
    identityPreviewText: {
      color: "#d6e9c8",
    },
    identityPreviewEditButton: {
      color: "#f59e0b",
    },

    // ── OTP ─────────────────────────────────────────────────────────────────
    otpCodeFieldInput: {
      background: "rgba(10, 24, 14, 0.7)",
      border: "1px solid rgba(140, 110, 70, 0.4)",
      borderRadius: "10px",
      color: "#f1f5f9",
      fontWeight: 700,
      fontSize: "1.2rem",
      minHeight: "52px",
    },

    // ── Avatar ──────────────────────────────────────────────────────────────
    avatarBox: {
      border: "2px solid rgba(245, 158, 11, 0.5)",
      borderRadius: "50%",
      boxShadow: "0 0 0 3px rgba(245, 158, 11, 0.12)",
    },
    userButtonAvatarBox: {
      border: "2px solid rgba(245, 158, 11, 0.45)",
      borderRadius: "50%",
    },

    // ── Popover de perfil (click en el avatar en la nav) ────────────────────
    userButtonPopoverCard: {
      background:
        "linear-gradient(180deg, rgba(22, 44, 30, 0.99) 0%, rgba(10, 22, 15, 0.99) 100%)",
      border: "1px solid rgba(140, 110, 70, 0.42)",
      borderRadius: "16px",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.05), 0 16px 40px rgba(0,0,0,0.7)",
    },
    userButtonPopoverActionButton: {
      borderRadius: "10px",
      color: "#e8e0d0",
      padding: "10px 14px",
      minHeight: "40px",
      transition: "all 200ms ease",
      "&:hover": {
        background: "rgba(58, 138, 90, 0.25)",
        color: "#e8e0d0",
      },
    },
    userButtonPopoverActionButtonText: {
      color: "#d6e9c8",
      fontWeight: 500,
      fontSize: "0.9rem",
    },
    userButtonPopoverActionButtonIcon: {
      color: "#a8c89a",
      width: "18px",
      height: "18px",
    },
    userButtonPopoverFooter: {
      borderTop: "1px solid rgba(140, 110, 70, 0.2)",
      paddingTop: "6px",
      background: "transparent",
      display: "none",  // también oculta el "Secured by Clerk" en el popover
    },

    // ── Cabecera del popover ─────────────────────────────────────────────────
    userPreviewMainIdentifier: {
      color: "#d6e9c8",
      fontWeight: 700,
      fontSize: "1rem",
    },
    userPreviewSecondaryIdentifier: {
      color: "#7a9a80",
      fontSize: "0.82rem",
    },
    userPreviewAvatarBox: {
      border: "2px solid rgba(245, 158, 11, 0.5)",
      boxShadow: "0 0 10px rgba(245, 158, 11, 0.18)",
    },
  },
};
