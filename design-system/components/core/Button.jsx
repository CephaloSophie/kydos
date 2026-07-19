import React from "react";

/**
 * Button — action primaire de Contrée. Variantes sémantiques, pilote ses
 * couleurs uniquement via tokens (jamais de couleur en dur).
 */
export function Button({
  variant = "primary",
  size = "md",
  iconLeft = null,
  iconRight = null,
  fullWidth = false,
  loading = false,
  disabled = false,
  type = "button",
  children,
  style,
  ...rest
}) {
  const heights = { sm: "var(--control-h-sm)", md: "var(--control-h)", lg: "var(--control-h-lg)" };
  const pads = { sm: "0 12px", md: "0 16px", lg: "0 22px" };
  const fonts = { sm: "var(--fs-sm)", md: "var(--fs-body)", lg: "var(--fs-body)" };

  const variants = {
    primary: { background: "var(--accent)", color: "var(--text-on-accent)", border: "1px solid transparent" },
    secondary: { background: "var(--bg-3)", color: "var(--text-1)", border: "1px solid var(--border-2)" },
    ghost: { background: "transparent", color: "var(--text-2)", border: "1px solid transparent" },
    danger: { background: "var(--error)", color: "#1a0a0c", border: "1px solid transparent" },
    spark: { background: "var(--spark)", color: "#06212c", border: "1px solid transparent" },
  };

  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
    height: heights[size], padding: pads[size], width: fullWidth ? "100%" : "auto",
    fontFamily: "var(--font-ui)", fontSize: fonts[size], fontWeight: "var(--fw-semibold)",
    lineHeight: 1, letterSpacing: "0.01em", borderRadius: "var(--r-md)", cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled ? "var(--disabled-opacity)" : 1,
    transition: "filter var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
    userSelect: "none", whiteSpace: "nowrap", ...variants[variant], ...style,
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className="focus-ring"
      style={base}
      onMouseDown={(e) => { if (!disabled && !loading) e.currentTarget.style.transform = "translateY(1px)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.filter = "none"; }}
      onMouseEnter={(e) => { if (!disabled && !loading) e.currentTarget.style.filter = "brightness(1.08)"; }}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      {children && <span>{children}</span>}
      {!loading && iconRight}
    </button>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 14, height: 14, borderRadius: "50%",
      border: "2px solid currentColor", borderTopColor: "transparent",
      display: "inline-block", animation: "m-ptr-spin 700ms linear infinite",
    }} />
  );
}
