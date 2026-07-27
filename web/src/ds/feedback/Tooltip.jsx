import React from "react";

/**
 * Tooltip — infobulle au survol/focus. Web uniquement (pas de hover mobile).
 */
export function Tooltip({ content, side = "top", children }) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
  }[side];
  return (
    <span style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocusCapture={() => setShow(true)} onBlurCapture={() => setShow(false)}>
      {children}
      {show && (
        <span role="tooltip" style={{
          position: "absolute", ...pos, zIndex: "var(--z-tooltip)", whiteSpace: "nowrap",
          background: "var(--bg-0)", color: "var(--text-1)", border: "1px solid var(--border-2)",
          borderRadius: "var(--r-sm)", padding: "5px 9px", fontSize: "var(--fs-xs)", fontFamily: "var(--font-ui)",
          boxShadow: "var(--shadow-2)", pointerEvents: "none",
        }}>{content}</span>
      )}
    </span>
  );
}
