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
  /**
   * Réaction (émote) à ENVOYER : appelé quand le joueur clique un smiley. Si
   * fourni, remplace l'animation locale par défaut — l'hôte décide de diffuser
   * (réseau) et d'afficher. Reçoit le siège de l'émetteur et l'emoji.
   */
  onEmote?: (seat: Seat, emoji: string) => void;
  /**
   * Émote DISTANTE à afficher (reçue d'un autre joueur/spectateur). Changez la
   * valeur `nonce` à chaque nouvelle émote pour la rejouer, même emoji/siège.
   */
  emoteSignal?: { seat: Seat; emoji: string; nonce: number } | null;
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
  // Affiche une émote reçue d'un autre joueur/spectateur (visible par tous).
  const lastEmoteNonce = useRef<number>(-1);
  useEffect(() => {
    const sig = props.emoteSignal;
    if (sig && sig.nonce !== lastEmoteNonce.current) {
      lastEmoteNonce.current = sig.nonce;
      sceneRef.current?.emote(sig.seat, sig.emoji);
    }
  }, [props.emoteSignal]);
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
      await app.init({ antialias: true, backgroundAlpha: 0, resolution: window.devicePixelRatio || 1, autoDensity: true });
      if (disposed) { app.destroy(true); return; }
      host.appendChild(app.canvas);
      const scene = new TableScene({ onPlay: (c) => onPlayRef.current?.(c) }, themeRef.current);
      app.stage.addChild(scene);
      appRef.current = app; sceneRef.current = scene;
      // La taille est pilotée par le HOST, mesuré directement : on ne dépend
      // plus du ResizePlugin de Pixi (qui n'écoute que le resize de la FENÊTRE
      // et laissait le canvas en 0×0 quand la table est montée dans un slot
      // dont la taille se stabilise après le premier paint — d'où la table
      // vide et le HUD collé en haut-gauche).
      const doLayout = () => applySizeRef.current();
      doLayout();

      window.addEventListener('resize', doLayout);
      // Toute variation de taille du conteneur ⇒ re-mesure + relayout + redraw.
      const ro = new ResizeObserver(() => { if (!disposed) { doLayout(); renderRef.current(); } });
      ro.observe(host);

      // Le conteneur peut encore mesurer 0 juste après l'init (CSS/polices en
      // cours). On retente à chaque frame jusqu'à obtenir une taille valide.
      let raf = 0;
      const settle = () => {
        if (disposed) return;
        const ok = applySizeRef.current();
        renderRef.current();
        if (!ok) raf = requestAnimationFrame(settle);
      };
      raf = requestAnimationFrame(settle);

      cleanupRef.current = () => { window.removeEventListener('resize', doLayout); ro.disconnect(); cancelAnimationFrame(raf); };
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

  /**
   * Mesure le conteneur et applique la taille au renderer PUIS à la scène.
   * Retourne false tant que le conteneur n'a pas de taille exploitable — le
   * caller retente alors à la frame suivante.
   */
  const applySize = (): boolean => {
    const app = appRef.current; const scene = sceneRef.current; const host = hostRef.current;
    if (!app || !app.renderer || !scene || !host) return false;
    const width = Math.round(host.clientWidth);
    const height = Math.round(host.clientHeight);
    if (width < 2 || height < 2) return false;
    const dpr = window.devicePixelRatio || 1;
    if (app.renderer.resolution !== dpr) app.renderer.resolution = dpr;
    // On ne redimensionne que si nécessaire (évite un thrash de textures).
    if (app.renderer.width !== width * dpr || app.renderer.height !== height * dpr) app.renderer.resize(width, height);
    scene.layout(width, height);
    publishFeltVars();
    return true;
  };
  const applySizeRef = useRef<() => boolean>(() => false);
  applySizeRef.current = applySize;

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
    applySize();
    scene.update({ view, names, hands, legal, mySeat: (mySeat ?? 0) as Seat, showDemandeInPlay, showReflexion, partnerFaceDown: true });
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
        onEmote={(emoji) => {
          const seat = (mySeat ?? 0) as Seat;
          if (props.onEmote) props.onEmote(seat, emoji);
          else sceneRef.current?.emote(seat, emoji);
        }}
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
