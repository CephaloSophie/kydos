import React from "react";

/**
 * Slider — curseur de réglage (personnalité de robot, vitesse, délais).
 * Affiche la valeur et remplit la piste jusqu'au pouce, couleur token.
 */
export function Slider({ label, value, min = 0, max = 1, step = 0.01, onChange, format, disabled = false, accent = "var(--accent)", id, ...rest }) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  const pct = ((value - min) / (max - min)) * 100;
  const display = format ? format(value) : value;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", opacity: disabled ? "var(--disabled-opacity)" : 1 }}>
      {(label || format) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          {label && <label htmlFor={fieldId} style={{ fontSize: "var(--fs-sm)", color: "var(--text-2)" }}>{label}</label>}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-1)", fontWeight: 600 }}>{display}</span>
        </div>
      )}
      <input
        id={fieldId} type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange && onChange(parseFloat(e.target.value))}
        className="contree-slider"
        style={{
          width: "100%", height: 6, appearance: "none", WebkitAppearance: "none", borderRadius: "var(--r-full)",
          background: `linear-gradient(90deg, ${accent} ${pct}%, var(--bg-4) ${pct}%)`,
          outline: "none", cursor: disabled ? "not-allowed" : "pointer", "--thumb": accent,
        }}
        {...rest}
      />
      <style>{`
        .contree-slider::-webkit-slider-thumb{ -webkit-appearance:none; width:16px;height:16px;border-radius:50%;
          background:var(--text-1); border:3px solid var(--thumb); box-shadow:var(--shadow-1); cursor:pointer; }
        .contree-slider::-moz-range-thumb{ width:16px;height:16px;border-radius:50%;
          background:var(--text-1); border:3px solid var(--thumb); cursor:pointer; }
        .contree-slider:focus-visible{ outline:var(--focus-ring-w) solid var(--focus-ring); outline-offset:4px; }
      `}</style>
    </div>
  );
}
