import React from "react";

/**
 * Dialog — fenêtre modale centrée + voile. Fermeture par Échap / clic voile.
 */
export function Dialog({ open, title, onClose, footer, width = 460, children }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && onClose) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: "var(--z-overlay)", display: "grid", placeItems: "center", padding: "var(--sp-6)" }}
      className="m-anim-scrim-in">
      <div role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}
        style={{
          width: "100%", maxWidth: width, maxHeight: "90vh", display: "flex", flexDirection: "column",
          background: "var(--bg-3)", border: "1px solid var(--border-2)", borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow-pop)", overflow: "hidden",
        }}>
        {title && (
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "var(--sp-4) var(--sp-5)", borderBottom: "1px solid var(--border-1)" }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "var(--fs-h3)", fontWeight: 600, color: "var(--text-1)" }}>{title}</h2>
            {onClose && (
              <button type="button" aria-label="Fermer" onClick={onClose} className="focus-ring"
                style={{ border: 0, background: "transparent", color: "var(--text-3)", cursor: "pointer", display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: "var(--r-sm)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            )}
          </header>
        )}
        <div style={{ padding: "var(--sp-5)", overflowY: "auto", color: "var(--text-2)", fontSize: "var(--fs-body)" }}>{children}</div>
        {footer && <footer style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-2)", padding: "var(--sp-4) var(--sp-5)", borderTop: "1px solid var(--border-1)" }}>{footer}</footer>}
      </div>
    </div>
  );
}
