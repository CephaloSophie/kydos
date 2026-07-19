import React from "react";

/**
 * Select — liste déroulante personnalisée (sombre, accessible au clavier).
 * options: [{ value, label }]. Contrôlé via value / onChange(value).
 */
export function Select({ label, value, options = [], onChange, placeholder = "Choisir…", disabled = false, id }) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const current = options.find((o) => o.value === value);

  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", position: "relative" }}>
      {label && <label htmlFor={fieldId} style={{ fontSize: "var(--fs-sm)", color: "var(--text-2)" }}>{label}</label>}
      <button
        id={fieldId} type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open}
        className="focus-ring" onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          height: "var(--control-h)", padding: "0 12px", width: "100%",
          background: "var(--bg-inset)", border: `1px solid ${open ? "var(--focus-ring)" : "var(--border-2)"}`,
          borderRadius: "var(--r-md)", color: current ? "var(--text-1)" : "var(--text-3)",
          fontFamily: "var(--font-ui)", fontSize: "var(--fs-body)", cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? "var(--disabled-opacity)" : 1,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current ? current.label : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-3)", transform: open ? "rotate(180deg)" : "none", transition: "transform var(--dur-fast)" }}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <ul role="listbox" tabIndex={-1} style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, margin: 0, padding: 4, listStyle: "none",
          background: "var(--bg-4)", border: "1px solid var(--border-2)", borderRadius: "var(--r-md)",
          boxShadow: "var(--shadow-3)", zIndex: "var(--z-dropdown)", maxHeight: 240, overflowY: "auto",
        }}>
          {options.map((o) => {
            const sel = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={sel}
                onClick={() => { onChange && onChange(o.value); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 10px", borderRadius: "var(--r-sm)", cursor: "pointer",
                  fontSize: "var(--fs-body)", color: sel ? "var(--accent)" : "var(--text-1)",
                  background: sel ? "var(--accent-ghost)" : "transparent",
                }}
                onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "var(--state-hover)"; }}
                onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = "transparent"; }}
              >
                {o.label}
                {sel && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m20 6-11 11-5-5" /></svg>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
