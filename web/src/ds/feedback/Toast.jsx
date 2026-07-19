import React from "react";

const TONES = {
  neutral: "var(--text-2)", accent: "var(--accent)", success: "var(--success)",
  warning: "var(--warning)", error: "var(--error)", info: "var(--info)", spark: "var(--spark)",
};

/**
 * Toast — notification éphémère (enchère, pli pris, fin de partie). Liseré de
 * tonalité, fermeture optionnelle. Web et mobile partagent le composant.
 */
export function Toast({ tone = "neutral", title, message, icon, onClose, action }) {
  const c = TONES[tone] || TONES.neutral;
  return (
    <div role="status" aria-live="polite" style={{
      display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
      background: "var(--bg-4)", border: "1px solid var(--border-2)", borderRadius: "var(--r-md)",
      boxShadow: "var(--shadow-3)", padding: "12px 14px", overflow: "hidden", position: "relative",
    }}>
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: c }} />
      {icon && <span style={{ color: c, display: "flex", marginTop: 1 }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "var(--fs-body)" }}>{title}</div>}
        {message && <div style={{ color: "var(--text-2)", fontSize: "var(--fs-sm)", marginTop: title ? 2 : 0 }}>{message}</div>}
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </div>
      {onClose && (
        <button type="button" aria-label="Fermer" onClick={onClose} className="focus-ring"
          style={{ border: 0, background: "transparent", color: "var(--text-3)", cursor: "pointer", display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: "var(--r-xs)", flex: "0 0 auto" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );
}
