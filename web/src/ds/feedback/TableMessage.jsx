import React from "react";
import { EmotionIcon } from "../table/EmotionIcon.jsx";

/**
 * TableMessage — popup de message UNIQUE et réutilisable du tapis.
 * Même composant pour : message entre manches ET fin de partie.
 *   - emotion  : 'victoire' | 'frustration' | 'defaite' (pictogramme)
 *   - title    : titre principal
 *   - subtitle : ligne secondaire
 *   - countdown: compte à rebours optionnel (s) avant la suite
 *   - footer   : texte de pied optionnel
 * Purement présentation : ne pilote jamais l'état du moteur.
 */
export function TableMessage({ emotion = "victoire", title, subtitle, countdown, footer, visible = true }) {
  if (!visible) return null;
  return (
    <div className="gt-overlay">
      <div className="gt-msg">
        <EmotionIcon emotion={emotion} size={72} />
        <div className={`gt-msg-title ${emotion}`}>{title}</div>
        {subtitle && <div className="gt-msg-sub">{subtitle}</div>}
        {countdown != null && <div className="gt-chrono">{countdown}</div>}
        {footer && <div className="muted" style={{ marginTop: 6 }}>{footer}</div>}
      </div>
    </div>
  );
}
