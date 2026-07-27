import React from "react";

/**
 * Input — champ texte sombre. label, hint, état d'erreur, addon optionnels.
 */
export function Input({ label, hint, error, iconLeft, addonRight, id, style, ...rest }) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  const invalid = !!error;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {label && (
        <label htmlFor={fieldId} style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-medium)", color: "var(--text-2)" }}>
          {label}
        </label>
      )}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        height: "var(--control-h)", padding: "0 12px",
        background: "var(--bg-inset)", borderRadius: "var(--r-md)",
        border: `1px solid ${invalid ? "var(--error)" : "var(--border-2)"}`,
        transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
      }}
        onFocusCapture={(e) => { e.currentTarget.style.borderColor = invalid ? "var(--error)" : "var(--focus-ring)"; e.currentTarget.style.boxShadow = `0 0 0 3px ${invalid ? "var(--error-ghost)" : "var(--accent-ghost)"}`; }}
        onBlurCapture={(e) => { e.currentTarget.style.borderColor = invalid ? "var(--error)" : "var(--border-2)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        {iconLeft && <span style={{ color: "var(--text-3)", display: "flex" }}>{iconLeft}</span>}
        <input
          id={fieldId}
          aria-invalid={invalid || undefined}
          aria-describedby={(hint || error) ? `${fieldId}-msg` : undefined}
          style={{ flex: 1, minWidth: 0, height: "100%", background: "transparent", border: 0, outline: "none", color: "var(--text-1)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body)", ...style }}
          {...rest}
        />
        {addonRight}
      </div>
      {(hint || error) && (
        <span id={`${fieldId}-msg`} style={{ fontSize: "var(--fs-xs)", color: invalid ? "var(--error)" : "var(--text-3)" }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
