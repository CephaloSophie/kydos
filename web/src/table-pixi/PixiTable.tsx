import { useEffect, useMemo, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import type { Bid, Card, EngineView, ScoreSummary, Seat } from 'belote-core';
import { TableScene } from './scene';
import { TableHud } from './hud';
import { getTheme, themeCssVars, themeWith, type PixiTableTheme } from './theme';
import { enterFullscreen, exitFullscreen, isFullscreen, isPhone } from './fullscreen';
import { loadAtlasFonts } from './scene/cardAtlas';
import './styles/index.css';

export interface PixiTableProps {
  view: EngineView;
  names: string[];
  hands: (Card[] | null)[];
  mySeat: Seat | null;
  legal?: Card[];
  summary?: ScoreSummary;
  onPlay?: (card: Card) => void;
  onBid?: (bid: Omit<Bid, 'seat'>) => void;
  onLeave?: () => void;
  /** Toggle the belote announce for MY seat (engine-side). */
  onBeloteToggle?: (on: boolean) => void;
  /** Design-system theme: 'local' | 'vip' | 'competition' (or a registered one). */
  theme?: string;
  /** Fine-grained overrides on top of the named theme. */
  themeOverrides?: Partial<PixiTableTheme>;
  opponentCards?: 'hidden' | 'back' | 'faceup';
  showMenu?: boolean;
  showScoreSheet?: boolean;
  forceLandscape?: boolean;
  notifyMs?: number;
  annonceDelayMs?: number;
}

/**
 * PixiTable — the WHOLE table as one Pixi component (design-system implementation).
 * Fills its container. The HTML HUD (dialogs, score, toasts) is anchored to the
 * felt via CSS variables and follows the same theme tokens (data-theme).
 */
export function PixiTable(props: PixiTableProps) {
  const { view, names, hands, mySeat, legal = [], onPlay, forceLandscape = true } = props;
  const theme = useMemo(() => {
    const t = themeWith(props.theme ?? 'local', props.themeOverrides);
    if (props.opponentCards) t.opponentCards = props.opponentCards;
    return t;
  }, [props.theme, props.themeOverrides, props.opponentCards]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const sceneRef = useRef<TableScene | null>(null);
  const onPlayRef = useRef(onPlay); onPlayRef.current = onPlay;
  const themeRef = useRef(theme); themeRef.current = theme;
  const cleanupRef = useRef<(() => void) | null>(null);
  // Always call the LATEST renderScene from event handlers (never a stale closure).
  const renderRef = useRef<() => void>(() => {});
  const [showDemandeInPlay, setShowDemandeInPlay] = useState(false);
  const [showReflexion, setShowReflexion] = useState(false);

  useEffect(() => {
    let disposed = false;
    const host = hostRef.current!;
    const app = new Application();
    (async () => {
      await loadAtlasFonts(); // crisp Manrope/Playfair in the atlas
      await app.init({ resizeTo: host, antialias: true, backgroundAlpha: 0, resolution: window.devicePixelRatio || 1, autoDensity: true });
      if (disposed) { app.destroy(true); return; }
      host.appendChild(app.canvas);
      const scene = new TableScene({ onPlay: (c) => onPlayRef.current?.(c) }, themeRef.current);
      app.stage.addChild(scene);
      appRef.current = app; sceneRef.current = scene;
      const doLayout = () => {
        // Guard against zoom/resize events firing after the app is destroyed.
        if (disposed || !appRef.current || !appRef.current.renderer) return;
        const a = appRef.current;
        const dpr = window.devicePixelRatio || 1;
        if (a.renderer.resolution !== dpr) { a.renderer.resolution = dpr; a.resize(); }
        scene.layout(a.renderer.width / a.renderer.resolution, a.renderer.height / a.renderer.resolution);
        publishFeltVars();
      };
      doLayout();
      app.renderer.on('resize', () => { doLayout(); renderRef.current(); });
      window.addEventListener('resize', doLayout);
      cleanupRef.current = () => window.removeEventListener('resize', doLayout);
      renderRef.current();
    })();
    return () => {
      disposed = true;
      cleanupRef.current?.(); cleanupRef.current = null;
      if (appRef.current) { appRef.current.destroy(true, { children: true }); appRef.current = null; sceneRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme switch → scene + re-render.
  useEffect(() => {
    if (sceneRef.current) { sceneRef.current.setTheme(themeRef.current); renderScene(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  /** Mirror the felt rect to CSS vars so the HTML HUD anchors inside the table. */
  const publishFeltVars = () => {
    const scene = sceneRef.current; const root = rootRef.current;
    if (!scene || !root) return;
    const r = scene.rect();
    root.style.setProperty('--px-felt-x', `${Math.round(r.x)}px`);
    root.style.setProperty('--px-felt-y', `${Math.round(r.y)}px`);
    root.style.setProperty('--px-felt-w', `${Math.round(r.w)}px`);
    root.style.setProperty('--px-felt-h', `${Math.round(r.h)}px`);
  };

  const renderScene = () => {
    const scene = sceneRef.current; const app = appRef.current;
    if (!scene || !app || !app.renderer) return;
    scene.layout(app.renderer.width / app.renderer.resolution, app.renderer.height / app.renderer.resolution);
    publishFeltVars();
    scene.update({ view, names, hands, legal, mySeat: (mySeat ?? 0) as Seat, showDemandeInPlay, showReflexion, partnerFaceDown: mySeat != null });
  };
  renderRef.current = renderScene;
  useEffect(renderScene);

  const toggleFullscreen = () => {
    if (isFullscreen()) void exitFullscreen();
    else if (rootRef.current) void enterFullscreen(rootRef.current);
  };

  return (
    <div className="px-table" data-theme={theme.name} style={themeCssVars(theme) as any} ref={rootRef}>
      <div className="px-canvas-host" ref={hostRef} />
      <TableHud
        view={view} names={names} mySeat={mySeat} summary={props.summary}
        onBid={props.onBid} onLeave={props.onLeave}
        onFullscreen={toggleFullscreen}
        notifyMs={props.notifyMs} annonceDelayMs={props.annonceDelayMs}
        onShowDemandeInPlay={setShowDemandeInPlay}
        onShowReflexion={setShowReflexion}
        onBeloteToggle={props.onBeloteToggle}
        onEmote={(emoji) => sceneRef.current?.emote((mySeat ?? 0) as Seat, emoji)}
        showMenu={props.showMenu}
        showScoreSheet={props.showScoreSheet}
      />
      {forceLandscape && (
        <div className="px-rotate">
          <div className="px-rotate__icon">📱↻</div>
          <p>Tourne ton téléphone à l'horizontale pour jouer</p>
          {isPhone() && <button className="ky-bid__pass" onClick={toggleFullscreen}>⛶ Plein écran</button>}
        </div>
      )}
    </div>
  );
}

export { getTheme };
