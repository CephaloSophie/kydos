import React from "react";

/**
 * Card — surface posée standard. header/footer optionnels, padding réglable.
 */
export function Card({ as: Tag = "div", elevated = false, interactive = false, padding = "md", header = null, footer = null, children, style, ...rest }) {
  const pads = { none: 0, sm: "var(--sp-3)", md: "var(--sp-4)", lg: "var(--sp-6)" };
  return (
    <Tag
      style={{
        display: "flex", flexDirection: "column",
        background: "var(--bg-2)", border: "1px solid var(--border-1)",
        borderRadius: "var(--r-lg)", boxShadow: elevated ? "var(--shadow-2)" : "none",
        transition: "border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
        cursor: interactive ? "pointer" : "default", overflow: "hidden", ...style,
      }}
      onMouseEnter={interactive ? (e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.transform = "translateY(-2px)"; } : undefined}
      onMouseLeave={interactive ? (e) => { e.currentTarget.style.borderColor = "var(--border-1)"; e.currentTarget.style.transform = "translateY(0)"; } : undefined}
      {...rest}
    >
      {header && (
        <div style={{ padding: "var(--sp-3) var(--sp-4)", borderBottom: "1px solid var(--border-1)", color: "var(--text-1)", fontWeight: "var(--fw-semibold)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          {header}
        </div>
      )}
      <div style={{ padding: pads[padding], flex: 1, minHeight: 0 }}>{children}</div>
      {footer && <div style={{ padding: "var(--sp-3) var(--sp-4)", borderTop: "1px solid var(--border-1)" }}>{footer}</div>}
    </Tag>
  );
}
