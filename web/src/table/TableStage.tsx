import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export interface TableStageProps {
  children: ReactNode;
  /** Largeur de référence du design (px). Défaut 980. */
  baseWidth?: number;
  /** Hauteur de référence du design (px). Défaut 620. */
  baseHeight?: number;
  /** Affiche le bouton plein écran. Défaut true. */
  fullscreenButton?: boolean;
  /** Échelle maximale (évite le sur-zoom sur très grand écran). Défaut 1.6. */
  maxScale?: number;
}

/**
 * TableStage — rend la table à une TAILLE DE RÉFÉRENCE fixe puis la met à l'ÉCHELLE
 * (`transform: scale`) pour remplir son conteneur, en préservant le design AU PIXEL PRÈS
 * (aucune réorganisation du layout interne → aucun risque de casser la mise en page).
 * Gère aussi le plein écran via la Fullscreen API du navigateur.
 */
export function TableStage({ children, baseWidth = 980, baseHeight = 620, fullscreenButton = true, maxScale = 1.6 }: TableStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const recompute = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    const next = Math.min(width / baseWidth, height / baseHeight, maxScale);
    setScale(next > 0 ? next : 1);
  }, [baseWidth, baseHeight, maxScale]);

  useEffect(() => {
    recompute();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', recompute);
      return () => window.removeEventListener('resize', recompute);
    }
    const observer = new ResizeObserver(recompute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [recompute]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);

  return (
    <div ref={containerRef} className="bt-stage">
      <div
        className="bt-stage__inner"
        style={{ width: baseWidth, height: baseHeight, transform: `scale(${scale})` }}
      >
        {children}
      </div>
      {fullscreenButton && (
        <button className="bt-stage__fs" onClick={toggleFullscreen} title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}>
          {isFullscreen ? '⤧' : '⤢'}
        </button>
      )}
    </div>
  );
}
