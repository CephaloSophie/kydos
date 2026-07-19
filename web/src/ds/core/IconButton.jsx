import React from "react";

/**
 * IconButton — bouton carré pour une seule icône. Exige un aria-label.
 */
export function IconButton({
  variant = "ghost",
  size = "md",
  label,
  active = false,
  disabled = false,
  children,
  style,
  ...rest
}) {
  const dims = { sm: "var(--control-h-sm)", md: "var(--control-h)", lg: "var(--control-h-lg)" };
  const variants = {
    ghost: { background: active ? "var(--accent-ghost)" : "transparent", color: active ? "var(--accent)" : "var(--text-2)", border: "1px solid transparent" },
    solid: { background: "var(--bg-3)", color: "var(--text-1)", border: "1px solid var(--border-2)" },
    accent: { background: "var(--accent)", color: "var(--text-on-accent)", border: "1px solid transparent" },
  };
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active || undefined}
      title={label}
      disabled={disabled}
      className="focus-ring"
      style={{
        display: "inline-grid", placeItems: "center",
        width: dims[size], height: dims[size], padding: 0,
        borderRadius: "var(--r-md)", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? "var(--disabled-opacity)" : 1,
        transition: "background var(--dur-fast) var(--ease-out), filter var(--dur-fast) var(--ease-out)",
        ...variants[variant], ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = "brightness(1.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
      {...rest}
    >
      {children}
    </button>
  );
}
