import React from "react";

/**
 * Badge — pastille de statut compacte. tone sémantique, dot optionnel.
 */
export function Badge({ tone = "neutral", solid = false, dot = false, children, style, ...rest }) {
  const tones = {
    neutral: { fg: "var(--text-2)", bg: "var(--bg-3)", line: "var(--border-2)" },
    accent: { fg: "var(--accent-strong)", bg: "var(--accent-dim)", line: "var(--accent-line)" },
    success: { fg: "var(--success)", bg: "var(--success-ghost)", line: "var(--success)" },
    warning: { fg: "var(--warning)", bg: "var(--warning-ghost)", line: "var(--warning)" },
    error: { fg: "var(--error)", bg: "var(--error-ghost)", line: "var(--error)" },
    info: { fg: "var(--info)", bg: "var(--info-ghost)", line: "var(--info)" },
    spark: { fg: "var(--spark)", bg: "var(--spark-ghost)", line: "var(--spark)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 22, padding: "0 9px", borderRadius: "var(--r-full)",
        fontFamily: "var(--font-ui)", fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semibold)",
        letterSpacing: "0.02em", whiteSpace: "nowrap",
        color: solid ? "var(--text-on-accent)" : t.fg,
        background: solid ? t.fg : t.bg,
        border: solid ? "1px solid transparent" : `1px solid ${t.line}`,
        ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: solid ? "currentColor" : t.fg }} />}
      {children}
    </span>
  );
}
