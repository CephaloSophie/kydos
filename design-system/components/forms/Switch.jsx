import React from "react";

/**
 * Switch — bascule on/off accessible (timings auto, robot actif…).
 */
export function Switch({ checked = false, onChange, label, disabled = false, id, ...rest }) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  const toggle = () => { if (!disabled && onChange) onChange(!checked); };
  return (
    <label htmlFor={fieldId} style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? "var(--disabled-opacity)" : 1, userSelect: "none" }}>
      <button
        id={fieldId} type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
        onClick={toggle} className="focus-ring"
        style={{
          width: 40, height: 24, borderRadius: "var(--r-full)", border: 0, position: "relative", flex: "0 0 auto",
          background: checked ? "var(--accent)" : "var(--bg-4)", cursor: disabled ? "not-allowed" : "pointer",
          transition: "background var(--dur-fast) var(--ease-out)",
        }}
        {...rest}
      >
        <span style={{
          position: "absolute", top: 3, left: checked ? 19 : 3, width: 18, height: 18, borderRadius: "50%",
          background: checked ? "var(--text-on-accent)" : "var(--text-1)", boxShadow: "var(--shadow-1)",
          transition: "left var(--dur-fast) var(--ease-out)",
        }} />
      </button>
      {label && <span style={{ fontSize: "var(--fs-body)", color: "var(--text-2)" }}>{label}</span>}
    </label>
  );
}
