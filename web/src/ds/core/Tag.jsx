import React from "react";

/**
 * Tag — étiquette filtre/attribut, optionnellement sélectionnable ou retirable.
 */
export function Tag({ selected = false, onRemove, children, style, ...rest }) {
  const clickable = !!rest.onClick;
  return (
    <span
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={clickable ? "focus-ring" : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 26, padding: onRemove ? "0 6px 0 10px" : "0 10px",
        borderRadius: "var(--r-sm)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-sm)", fontWeight: "var(--fw-medium)",
        color: selected ? "var(--accent)" : "var(--text-2)",
        background: selected ? "var(--accent-ghost)" : "var(--bg-3)",
        border: `1px solid ${selected ? "var(--accent-line)" : "var(--border-2)"}`,
        cursor: clickable ? "pointer" : "default", userSelect: "none", ...style,
      }}
      {...rest}
    >
      {children}
      {onRemove && (
        <button
          type="button" aria-label="Retirer"
          onClick={(e) => { e.stopPropagation(); onRemove(e); }}
          style={{ display: "grid", placeItems: "center", width: 16, height: 16, border: 0, background: "transparent", color: "inherit", cursor: "pointer", borderRadius: "var(--r-xs)", lineHeight: 1, fontSize: 13 }}
        >×</button>
      )}
    </span>
  );
}
