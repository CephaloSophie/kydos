import React from "react";

const LEVELS = {
  error: { c: "var(--log-error)", label: "ERR" },
  warning: { c: "var(--log-warning)", label: "WRN" },
  info: { c: "var(--log-info)", label: "INF" },
  debug: { c: "var(--log-debug)", label: "DBG" },
  trace: { c: "var(--log-trace)", label: "TRC" },
};
const ORDER = ["error", "warning", "info", "debug", "trace"];

/**
 * LogConsole — console devtools : niveaux error→trace, filtres masquables,
 * repliable. Monospace, fond très sombre. Style outil, pas de jeu dedans.
 */
export function LogConsole({ entries = [], defaultHidden = [], collapsible = true, title = "Console" }) {
  const [hidden, setHidden] = React.useState(new Set(defaultHidden));
  const [open, setOpen] = React.useState(true);
  const bodyRef = React.useRef(null);

  React.useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [entries.length]);

  const toggle = (lvl) => setHidden((prev) => {
    const next = new Set(prev);
    next.has(lvl) ? next.delete(lvl) : next.add(lvl);
    return next;
  });

  const shown = entries.filter((e) => !hidden.has(e.level));

  return (
    <section style={{ display: "flex", flexDirection: "column", background: "var(--log-bg)", border: "1px solid var(--border-1)", borderRadius: "var(--r-lg)", minHeight: 0, height: "100%", overflow: "hidden", fontFamily: "var(--font-mono)" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid var(--border-1)", background: "var(--log-gutter)" }}>
        {collapsible && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "Replier" : "Déplier"} className="focus-ring"
            style={{ border: 0, background: "transparent", color: "var(--text-3)", cursor: "pointer", display: "grid", placeItems: "center", width: 20, height: 20 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform var(--dur-fast)" }}><path d="m6 9 6 6 6-6" /></svg>
          </button>
        )}
        <span style={{ fontFamily: "var(--font-ui)", fontWeight: 600, color: "var(--text-1)", fontSize: "var(--fs-sm)" }}>{title}</span>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {ORDER.map((lvl) => {
            const off = hidden.has(lvl);
            return (
              <button key={lvl} type="button" onClick={() => toggle(lvl)} aria-pressed={!off}
                title={`${off ? "Afficher" : "Masquer"} ${lvl}`} className="focus-ring"
                style={{
                  fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.04em", padding: "2px 6px", borderRadius: "var(--r-xs)",
                  border: `1px solid ${off ? "var(--border-2)" : LEVELS[lvl].c}`, cursor: "pointer",
                  background: off ? "transparent" : "color-mix(in srgb, " + LEVELS[lvl].c + " 14%, transparent)",
                  color: off ? "var(--text-3)" : LEVELS[lvl].c, opacity: off ? 0.5 : 1,
                }}>
                {LEVELS[lvl].label}
              </button>
            );
          })}
        </div>
      </header>
      {open && (
        <div ref={bodyRef} style={{ overflowY: "auto", minHeight: 0, padding: "6px 0", fontSize: "var(--fs-mono)", lineHeight: 1.55 }}>
          {shown.map((e, i) => {
            const L = LEVELS[e.level] || LEVELS.debug;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "auto auto 1fr", gap: 10, padding: "1px 12px", alignItems: "baseline" }}>
                <span style={{ color: "var(--log-trace)" }}>{e.ts || ""}</span>
                <span style={{ color: L.c, fontWeight: 700, width: 30 }}>{L.label}</span>
                <span style={{ color: e.level === "error" ? "var(--log-error)" : "var(--text-2)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{e.msg}</span>
              </div>
            );
          })}
          {shown.length === 0 && <div style={{ padding: "12px", color: "var(--text-3)", fontSize: "var(--fs-sm)" }}>Aucune ligne pour ces filtres.</div>}
        </div>
      )}
    </section>
  );
}
