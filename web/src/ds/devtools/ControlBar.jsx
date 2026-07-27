import React from "react";
import { IconButton } from "../core/IconButton.jsx";
import { Slider } from "../forms/Slider.jsx";

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 12];

const Play = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z" /></svg>;
const Pause = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>;
const Step = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 5v14l9-7z" /><rect x="16" y="5" width="3" height="14" rx="1" /></svg>;

/**
 * ControlBar — pilotage du moteur d'entraînement : pause/play, step,
 * vitesse 0.25×→12×, délais avant/après pli. N'altère pas l'état, émet des events.
 */
export function ControlBar({ playing = false, speed = 1, delayBefore = 400, delayAfter = 700, onTogglePlay, onStep, onSpeed, onDelayBefore, onDelayAfter }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", flexWrap: "wrap", background: "var(--bg-3)", border: "1px solid var(--border-1)", borderRadius: "var(--r-lg)", padding: "var(--sp-3) var(--sp-4)" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <IconButton label={playing ? "Pause" : "Lancer"} variant="accent" onClick={onTogglePlay}>{playing ? <Pause /> : <Play />}</IconButton>
        <IconButton label="Pas à pas" variant="solid" onClick={onStep} disabled={playing}><Step /></IconButton>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "var(--ls-caps)", marginRight: 4 }}>Vitesse</span>
        {SPEEDS.map((s) => {
          const on = s === speed;
          return (
            <button key={s} type="button" onClick={() => onSpeed && onSpeed(s)} className="focus-ring"
              style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 600, padding: "4px 8px", borderRadius: "var(--r-sm)", cursor: "pointer",
                border: `1px solid ${on ? "var(--spark)" : "var(--border-2)"}`,
                background: on ? "var(--spark-ghost)" : "transparent", color: on ? "var(--spark)" : "var(--text-2)",
              }}>{s}×</button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "var(--sp-5)", flex: 1, minWidth: 260 }}>
        <div style={{ flex: 1 }}>
          <Slider label="Délai avant pli" value={delayBefore} min={0} max={2000} step={50} onChange={onDelayBefore} format={(v) => `${v} ms`} accent="var(--spark)" />
        </div>
        <div style={{ flex: 1 }}>
          <Slider label="Délai après pli" value={delayAfter} min={0} max={2000} step={50} onChange={onDelayAfter} format={(v) => `${v} ms`} accent="var(--spark)" />
        </div>
      </div>
    </div>
  );
}
