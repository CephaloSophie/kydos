/* =============================================================================
 * PRESENTATION · screens/TableScreen.ts
 * Table de jeu FIDÈLE au design system : HUD (Quitter · NOUS/EUX · atout),
 * tapis feutré or, chips de contrôle (Pause · Vitesse · statut). Le composant
 * réutilisable « Table de jeu » (table Pixi) est monté dans l'EMPLACEMENT
 * RÉSERVÉ du DS : #game-table-mount.
 *
 * Flux :
 *   1. Ouverture du dialogue de configuration (sièges, visibilité, manches).
 *   2. Confirmation → construction du moteur + boucle + rendu Pixi.
 *   3. Fin de partie → sauvegarde du replay (/games).
 *
 * Le coéquipier reste toujours caché (règle de belote — PixiTable applique
 * `partnerFaceDown` quand `mySeat` est défini).
 * ========================================================================== */
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import {
  GameEngine,
  type Bid, type Card, type Seat,
} from 'belote-core';
import { PixiTable } from '@kydos/table-pixi';
import { h, clear } from '../../core/dom';
import { Button, Dialog, Slider } from '../components/ui';
import { soundService } from '../../services/sound/SoundService';
import { icon } from '../components/icons';
import { detectSoundEvents } from '../../services/sound/soundEvents';
import { GameLoop } from '../../services/gameLoop';
import { buildLocalGame } from '../../services/localGame';
import { type GameSetup } from '../../services/gameSetup';
import { TableSocket, type LiveGameState } from '../../data/TableSocket';
import { toast } from '../components/feedback';
import { openPlayerProfile } from '../components/PlayerProfile';
import { GameSetupDialog } from '../components/GameSetupDialog';
import type { AppContext } from '../context';
import type { ServerRobot } from '../../data/ApiClient';
import { toDomain } from '../../data/RobotRepository';



export function TableScreen(ctx: AppContext): HTMLElement {
  const { router, api, ads, vip } = ctx;
  // Mode « regarder » demandé via l'URL : on saute le dialogue et on lance
  // directement une partie 4 robots avec la première écurie de l'utilisateur.
  const watch = location.hash.includes('watch=1');
  // Mode EN LIGNE : ?online=<tableId>. Le jeu tourne sur le serveur ; on
  // s'abonne au socket, on affiche l'état reçu et on transmet nos gestes.
  // AUCUN dialogue de configuration ici (c'est une reprise/participation, pas
  // une nouvelle partie locale).
  const onlineId = new URLSearchParams(location.hash.split('?')[1] ?? '').get('online');
  let mySeat: Seat | null = watch ? null : 0;
  let opponentCards: 'back' | 'faceup' = 'back';
  /** Visibilité de la partie d'entraînement en cours (piloté par le dialogue). */
  let trainingVisibility: 'none' | 'robots' | 'all' = 'none';

  /* ── SON (voir docs/SOUNDS.md) ─────────────────────────────────────────
   * Effets déclenchés par diff de vues (detectSoundEvents) — mêmes vues en
   * local et en ligne. Mélodie d'ambiance par TYPE de table, en boucle.
   * L'audio est débloqué au premier geste (politique d'autoplay WebView). */
  let prevSoundView: ReturnType<GameEngine['view']> | null = null;
  const playDetected = (v: ReturnType<GameEngine['view']>, seat: Seat | null) => {
    for (const fx of detectSoundEvents(prevSoundView, v, seat)) soundService.playEffect(fx);
    prevSoundView = v;
  };


  /**
   * Écran de fin de partie EN LIGNE : bandeau soigné avec le résultat, le score
   * final et des actions claires (statistiques, rejeu, retour). Remplace le
   * simple toast pour un rendu pro et indicatif.
   */
  const showOnlineEnd = (info: { winner: 'A' | 'B' | null; gameId?: string }) => {
    const v = lastOnlineState?.view;
    // Repère NOUS/EUX selon le camp du spectateur (siège pair = A, impair = B).
    const usIsA = currentMySeat == null || currentMySeat % 2 === 0;
    const usScore = usIsA ? (v?.cumulative?.A ?? 0) : (v?.cumulative?.B ?? 0);
    const themScore = usIsA ? (v?.cumulative?.B ?? 0) : (v?.cumulative?.A ?? 0);
    const usWon = info.winner != null && ((info.winner === 'A') === usIsA);
    const themWon = info.winner != null && !usWon;
    const accent = usWon ? 'var(--c-success)' : themWon ? 'var(--c-danger)' : 'var(--c-gold)';
    const title = info.winner ? (usWon ? 'Victoire de NOUS' : "Victoire d'EUX") : 'Partie nulle';

    // Conteneur du bouton « Arbre du tournoi » (rempli plus bas si tournoi).
    const tournamentSlot = h('div', { class: 'col', style: { width: '100%' } });

    const card = h('div', { class: 'col center gap-3', style: {
      padding: '26px 30px', borderRadius: 'var(--r-2xl)', minWidth: '320px',
      background: 'linear-gradient(180deg, rgba(16,22,36,.98), rgba(9,13,22,.98))',
      border: `1px solid ${accent}`, boxShadow: `0 0 60px -12px ${accent}, var(--sh-float)`, textAlign: 'center',
    } },
      h('div', { style: { fontSize: '34px', lineHeight: '1' } }, info.winner ? '🏆' : '🤝'),
      h('div', { style: { fontSize: '10px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--c-text-mute)' } }, 'Fin de la partie'),
      h('div', { class: 'title', style: { fontSize: '22px', color: accent } }, title),
      // Score final NOUS / EUX (relatif au spectateur).
      h('div', { class: 'row center gap-3', style: { margin: '4px 0' } },
        h('div', { class: 'col center' },
          h('span', { style: { fontSize: '10px', letterSpacing: '.1em', color: 'var(--c-success)' } }, 'NOUS'),
          h('span', { class: 'mono', style: { fontSize: '30px', fontWeight: '800', color: usWon ? 'var(--c-success)' : 'var(--c-text)' } }, `${usScore}`)),
        h('span', { class: 'mono', style: { fontSize: '18px', color: 'var(--c-text-faint)' } }, '–'),
        h('div', { class: 'col center' },
          h('span', { style: { fontSize: '10px', letterSpacing: '.1em', color: 'var(--c-danger)' } }, 'EUX'),
          h('span', { class: 'mono', style: { fontSize: '30px', fontWeight: '800', color: themWon ? 'var(--c-danger)' : 'var(--c-text)' } }, `${themScore}`))),
      h('div', { class: 'row gap-2', style: { marginTop: '6px' } },
        info.gameId ? Button('📊 Statistiques', { variant: 'secondary', size: 'sm', onClick: () => { overlay.remove(); onlineSocket.disconnect(); router.go(`gamestats?id=${info.gameId}`); } }) : null,
        info.gameId ? Button('▶ Rejouer', { variant: 'ghost', size: 'sm', onClick: () => { overlay.remove(); onlineSocket.disconnect(); router.go(`replay?id=${info.gameId}`); } }) : null),
      // v16 — emplacement du bouton « Arbre du tournoi », injecté après coup si
      // ce match appartient à un tournoi LIVE (vainqueur OU éliminé).
      tournamentSlot,
      Button('Quitter la table', { size: 'sm', block: true, onClick: () => { overlay.remove(); leaveTable(); } }));

    const overlay = h('div', { class: 'center', style: {
      position: 'absolute', inset: '0', zIndex: '30', background: 'rgba(4,7,14,.72)', backdropFilter: 'blur(5px)',
    } }, card);
    root.append(overlay);

    // v16 — si ce match en ligne est un match de TOURNOI encore LIVE, on propose
    // d'aller à l'arbre pour choisir un match à regarder ou quitter. Vaut pour
    // le vainqueur (état waiting/pending/champion) comme pour le perdant
    // (éliminé) tant que le tournoi n'est pas terminé.
    void (async () => {
      try {
        const { active } = await api.getMyTournament();
        if (!active || !active.tournamentId) return;
        tournamentSlot.append(
          Button(`${active.icon || '♦'} Arbre du tournoi`, { variant: 'secondary', size: 'sm', block: true, onClick: () => {
            overlay.remove(); onlineSocket.disconnect(); router.go(`tournament?id=${active.tournamentId}`);
          } }));
      } catch { /* pas un tournoi ou hors-ligne : on n'ajoute rien */ }
    })();
  };

  const onlineSocket = new TableSocket();
  let reactRoot: Root | null = null;
  let loop: GameLoop | undefined;

  /** Sortie propre : coupe la boucle locale OU la connexion en ligne. */
  const leaveTable = () => { soundService.stopMelody(); loop?.dispose(); onlineSocket.disconnect(); reactRoot?.unmount(); router.go(onlineId ? 'online' : 'home'); };

  // --- HUD (fidèle au DS) ---------------------------------------------------

  // Emplacement réservé du DS → montage du composant table Pixi.
  const mount = h('div', { id: 'game-table-mount', 'data-slot': 'table-component', style: { position: 'absolute', inset: '0' } });
  const felt = h('div', {
    class: 'center', style: {
      // Table AU MAXIMUM : plus de barre en haut → le feutre monte à 6px du bord
      // haut. Gauche 60px : place du menu d'icônes vertical. Bas 64px : bannières.
      position: 'absolute', inset: '6px 14px 8px 60px', borderRadius: 'var(--r-2xl)', overflow: 'hidden',
      background: 'radial-gradient(520px 300px at 50% 45%, #2b8a52, #17673d 70%)', border: '2px solid rgba(230,196,106,.5)', boxShadow: 'inset 0 0 60px rgba(0,0,0,.35), var(--sh-float)',
    },
  }, mount);

  // --- Smileys / réactions (mode en ligne) ---------------------------------

  // Barre des joueurs (mode en ligne) : chaque nom humain ouvre son profil.
  // Barre de noms du haut RETIRÉE (demande ergonomie) : les noms des joueurs
  // restent affichés à côté de chaque siège sur la table. renderPlayersBar
  // devient inerte pour préserver les points d'appel.
  const renderPlayersBar = (_players: { seat: number; name: string; type: string; userId: string | null }[]) => { /* no-op */ };


  /**
   * Overlay des logs de partie (SPEC §3.2) — semi-transparent, ancré en bas
   * gauche du tapis, minimisable/maximisable. Les logs viennent du live game
   * quand la partie est en ligne ; en mode local ils reflètent les actions
   * du moteur.
   */
  let logsOpen = true;
  const logLines = h('div', { class: 'col gap-1', style: { padding: '6px 10px 8px', overflow: 'auto', maxHeight: '120px', fontSize: '10px', fontFamily: 'var(--f-mono)', color: 'var(--c-text-soft)', display: 'block' } });
  const logsHeader = h('div', { class: 'row gap-2', style: { padding: '4px 10px', borderBottom: '1px solid rgba(255,255,255,.06)', fontSize: '9px', color: 'var(--c-text-mute)', letterSpacing: '.14em' } },
    h('span', { class: 'fill' }, 'LOGS'),
    h('span', { style: { cursor: 'pointer' }, onClick: () => {
      logsOpen = !logsOpen;
      logLines.style.display = logsOpen ? 'block' : 'none';
      (logsHeader.lastChild as HTMLElement).textContent = logsOpen ? '▁' : '▔';
    } }, '▁'));
  const logsOverlay = h('div', { style: {
    position: 'absolute', left: '68px', bottom: '58px', width: '240px', maxHeight: '160px', overflow: 'hidden',
    background: 'rgba(6,10,20,.65)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 'var(--r-md)', zIndex: '4',
  } }, logsHeader, logLines);
  const appendLog = (line: string) => {
    const div = h('div', { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, line);
    logLines.append(div);
    // Trim to the last 40 entries.
    while (logLines.childElementCount > 40) logLines.firstChild?.remove();
    logLines.scrollTop = logLines.scrollHeight;
  };


  /** Bouton d'icône du menu de gauche. */
  const iconBtn = (name: string, title: string, onClick?: () => void, extra: Record<string, string> = {}) =>
    h('button', { class: 'table-menu__btn', title, onClick, style: extra }, icon(name));

  const openSoundSettings = () => {
    let lastTestAt = 0;
    const dialog = Dialog({
      icon: '🔊', title: 'Son de la table',
      body: h('div', { class: 'col gap-3', style: { minWidth: '260px', textAlign: 'left' } },
        Slider({ label: 'Melodie', value: soundService.melodyVolume(), fill: 'var(--g-gold, var(--c-gold))', onInput: (v) => soundService.setMelodyVolume(v) }),
        Slider({ label: 'Effets sonores', value: soundService.sfxVolume(), fill: 'var(--g-club, var(--c-success))', onInput: (v) => {
          soundService.setSfxVolume(v);
          const now = Date.now();
          if (now - lastTestAt > 350) { lastTestAt = now; soundService.playEffect('card-play'); }
        } }),
        h('div', { class: 'text-mute', style: { fontSize: '11px' } }, 'Reglages enregistres sur cet appareil.')),
      actions: [Button('Fermer', { variant: 'secondary', size: 'sm', onClick: () => dialog.remove() })],
      onClose: () => dialog.remove(),
    });
    document.body.append(dialog);
  };

  // Emotes : picker ouvert au clic sur le smiley ; envoi via sendEmote (cable
  // quand la table en ligne est prete). En local, pas d'emotes.
  const SMILEYS = ['👍', '😂', '😮', '😎', '😅', '👏', '🤔', '🔥'];
  let sendEmote: ((emoji: string) => void) | null = null;
  const emotePicker = h('div', { class: 'table-menu__picker', style: { display: 'none' } },
    ...SMILEYS.map((e2) => h('button', { class: 'table-menu__emoji', onClick: () => {
      sendEmote?.(e2); emotePicker.style.display = 'none';
    } }, e2)));
  const smileyBtn = iconBtn('smile', 'Réactions', () => {
    emotePicker.style.display = emotePicker.style.display === 'none' ? 'flex' : 'none';
  });
  const smileyWrap = h('div', { style: { position: 'relative', display: onlineId ? 'block' : 'none' } }, smileyBtn, emotePicker);

  const quitIcon = iconBtn('exit', 'Quitter la table', leaveTable);
  const spectatorIcon = iconBtn('eye', 'Spectateurs', undefined, { position: 'relative' });
  const spectatorCount = h('span', { class: 'table-menu__badge' }, '0');
  spectatorIcon.append(spectatorCount);
  const onlineIcon = h('div', { class: 'table-menu__btn is-online', title: watch ? 'Vous regardez' : 'En ligne' },
    h('span', { class: 'table-menu__dot' }));
  const soundIcon = iconBtn('sound', 'Son de la table', openSoundSettings);
  const speedBadge = h('span', { class: 'table-menu__badge table-menu__badge--speed' }, '1×');
  const pauseIcon = iconBtn('pause', 'Pause', () => { if (!loop) return; const p2 = loop.togglePause(); pauseIcon.replaceChildren(icon(p2 ? 'play' : 'pause')); pauseIcon.title = p2 ? 'Reprendre' : 'Pause'; });
  const speedIcon = iconBtn('fast', 'Vitesse 1×', () => { if (!loop) return; const sp = loop.cycleSpeed(); speedIcon.title = `Vitesse ${sp}×`; speedBadge.textContent = `${sp}×`; });
  speedIcon.append(speedBadge);

  const leftMenu = h('div', { class: 'table-menu' },
    quitIcon,
    onlineId ? spectatorIcon : null,
    onlineId ? onlineIcon : null,
    soundIcon,
    onlineId ? smileyWrap : null,
    onlineId ? null : pauseIcon,
    onlineId ? null : speedIcon,
  );

  const root = h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', background: 'linear-gradient(160deg,#070c17,#05070f)' } },
    felt,
    leftMenu,
    // Overlay de logs : réservé au REJEU/local. Jamais en ligne.
    onlineId ? null : logsOverlay,
  );

  // Audio : débloqué au premier geste (autoplay), effets préchargés, mélodie
  // lancée pour le type de table (local = entraînement ; en ligne, le kind du
  // lobby affinera). Coupée à la sortie d'écran (navigation quelconque).
  let melodyKind: string = onlineId ? 'default' : 'local';
  // v18 — override de thème (couleurs résolues du thème back-office), reçu via
  // la config de table du lobby. Converti hex string → hex number pour Pixi.
  let themeOverrides: Record<string, number | string> | undefined;
  const hexToNum = (s: string | null | undefined): number | null =>
    (typeof s === 'string' && /^#?[0-9a-fA-F]{6}$/.test(s)) ? parseInt(s.replace('#', ''), 16) : null;
  const buildThemeOverrides = (colors: any): Record<string, number | string> | undefined => {
    if (!colors) return undefined;
    const numKeys = ['felt1', 'felt2', 'rail', 'railHi', 'railLo', 'railInner', 'accent', 'accent2'] as const;
    const out: Record<string, number | string> = {};
    for (const k of numKeys) { const n = hexToNum(colors[k]); if (n != null) out[k] = n; }
    // v18 — dos des cartes : chaînes CSS (l'atlas dessine sur un canvas 2D).
    if (typeof colors.backHi === 'string') out.backHi = colors.backHi;
    if (typeof colors.backLo === 'string') out.backLo = colors.backLo;
    return Object.keys(out).length ? out : undefined;
  };
  root.addEventListener('pointerdown', () => {
    soundService.unlock();
    soundService.playMelodyForTable(melodyKind);
  }, { once: true });
  soundService.preloadEffects();
  // Cleanup complet au démontage : coupe la boucle locale, la connexion en
  // ligne, arrête la mélodie et démonte le React root de PixiTable. Le router
  // (main.tsx) appelle ce cleanup avant de remplacer l'écran → aucun socket
  // ni timer ne survit à la sortie de la table.
  (root as HTMLElement & { _cleanup?: () => void })._cleanup = () => {
    soundService.stopMelody();
    loop?.dispose();
    onlineSocket.disconnect();
    reactRoot?.unmount();
  };

  // --- Moteur + boucle (démarrés après chargement des robots) ---------------
  let saved = false;

  const buildAndStart = (robots: ServerRobot[], setup: GameSetup) => {
    // Visibilité pilotée par la configuration du joueur (entraînement) :
    //  - 'none'   → dos (adversaires cachés, comportement de partie normale).
    //  - 'robots' → face visible (le joueur veut voir/apprendre le jeu de ses robots).
    //  - 'all'    → face visible (tous les jeux visibles).
    // ⚠️ Le coéquipier reste toujours caché en jeu réel (règle belote appliquée
    // par PixiTable via partnerFaceDown quand mySeat est défini) ; ici c'est de
    // l'entraînement, on autorise donc l'affichage face visible.
    opponentCards = setup.visibility === 'none' ? 'back' : 'faceup';
    trainingVisibility = setup.visibility;

    // Fabrique UNIFIÉE — mêmes cerveaux que le web et le serveur (parité stricte).
    // Chaque robot choisi joue avec SON `algoSpec` (récupéré du serveur via /robots).
    const built = buildLocalGame(setup, robots);
    mySeat = built.mySeat;
    const { engine, players, robots: robotConfigs, brains } = built;

    loop = new GameLoop(engine, {
      brains,
      robots: robotConfigs, // requis pour la surcoinche (shouldSurcontrer a besoin de la fiche)
      onTick: () => render(engine, players.map((p) => p.name)),
      onEnd: () => {
        if (saved) return;
        saved = true;
        api.saveGame({ replay: engine.toReplay(), logs: [], mode: 'local', winner: engine.partieWinner }).catch(() => {});
        toast(`★ Partie terminée — victoire de l'équipe ${engine.partieWinner}`, 'success');
        void ads.afterGame(); // interstitiel après la partie (ignoré si VIP)
      },
    });
    render(engine, players.map((p) => p.name));
    loop.start();
  };

  const render = (engine: GameEngine, names: string[]) => {
    const v = engine.view();
    playDetected(v, mySeat);
    // Alimente l'overlay de logs (dernière action détectée dans la vue moteur).
    if (v.phase === 'bidding' && v.bids.length) {
      const b = v.bids[v.bids.length - 1];
      const label = b.action === 'pass' ? 'passe' : b.action === 'contree' ? 'contre' : b.action === 'surcontree' ? 'surcontre' : `${b.value ?? '?'} ${b.suit ?? ''}`;
      appendLog(`[annonce] ${names[b.seat] ?? `S${b.seat}`} → ${label}`);
    }
    if (v.currentTrick.length) {
      const last = v.currentTrick[v.currentTrick.length - 1];
      appendLog(`[jeu] ${names[last.seat] ?? `S${last.seat}`} joue ${last.card.rank}${last.card.suit[0].toUpperCase()}`);
    }

    const myTurn = mySeat != null && engine.turn === mySeat && !v.awaitingCollect;
    reactRoot ??= createRoot(mount);
    const vipSeatsLocal: boolean[] = [false, false, false, false];
    if (vip.isVipCached()) vipSeatsLocal[0] = true;
    reactRoot.render(createElement(PixiTable, {
      view: v, vipSeats: vipSeatsLocal, names,
      hands: [0, 1, 2, 3].map((i) => engine.handOf(i as Seat)),
      mySeat,
      legal: myTurn && v.phase === 'playing' ? engine.legalCards(mySeat as Seat) : [],
      onBid: mySeat != null ? (b: Omit<Bid, 'seat'>) => { engine.submitBid(mySeat as Seat, b); loop?.resume(); } : undefined,
      onPlay: mySeat != null ? (card: Card) => { engine.playCard(mySeat as Seat, card); loop?.resume(); } : undefined,
      onBeloteToggle: mySeat != null ? (on: boolean) => { engine.setBeloteAnnounce(mySeat as Seat, on); loop?.resume(); } : undefined,
      // Visibilité pilotée par le dialogue (entraînement) : en 'all', on
      // révèle aussi le coéquipier (partnerFaceDown=false).
      opponentCards, partnerFaceDown: trainingVisibility !== 'all',
      showMenu: false, showScoreSheet: true, forceLandscape: false,
      onLeave: leaveTable,
    }));
  };

  /* ── MODE EN LIGNE ─────────────────────────────────────────────────────
   * Le serveur envoie l'état complet (vue, ma main, coups légaux, mon siège).
   * On rend directement la table Pixi avec ces données — le mobile ne calcule
   * rien. Les robots jouent côté serveur ; la partie reste affichée jusqu'à sa
   * fin, même si on l'a rejointe en cours. */
  let lastOnlineState: LiveGameState | null = null;
  let currentMySeat: number | null = null;
  let emoteSignal: { seat: Seat; emoji: string; nonce: number } | null = null;
  let emoteNonce = 0;
  const renderOnline = (state: LiveGameState) => {
    lastOnlineState = state;
    const v = state.view;
    // v18 — le thème de table voyage AVEC l'état de jeu (seul canal reçu par un
    // joueur qui rejoint une table déjà en cours). On applique dès réception.
    const tc = (v as unknown as { themeColors?: any }).themeColors;
    if (tc) { const ov = buildThemeOverrides(tc); if (ov) themeOverrides = ov; }
    const seat = state.mySeat ?? null;
    currentMySeat = seat;
    playDetected(v, (seat ?? null) as Seat | null);
    renderPlayersBar((v as unknown as { players?: { seat: number; name: string; type: string; userId: string | null }[] }).players ?? []);
    for (const line of state.logs ?? []) if (line?.msg) appendLog(line.msg);

    const myTurn = seat != null && v.turn === seat && !v.awaitingCollect;
    // Les mains : seule la nôtre est connue (le serveur ne divulgue pas les
    // autres). On donne des tableaux de la bonne LONGUEUR aux autres sièges
    // pour que la table dessine le bon nombre de dos.
    const hands: (import('belote-core').Card[] | null)[] = [0, 1, 2, 3].map((i) => {
      if (i === seat) return state.myHand ?? [];
      const n = (v as unknown as { handCounts?: number[] }).handCounts?.[i] ?? 0;
      return Array.from({ length: n }, () => ({ rank: 'A', suit: 'pique' })) as import('belote-core').Card[];
    });

    reactRoot ??= createRoot(mount);
    // Le smiley du menu de gauche émet une réaction (diffusée à tous par le
    // serveur) et l'affiche localement pour l'émetteur.
    sendEmote = seat != null ? (emoji: string) => {
      onlineSocket.signal('smiley', { emoji });
      soundService.playEffect('emote');
      emoteSignal = { seat: seat as Seat, emoji, nonce: ++emoteNonce };
      renderOnline(state);
    } : null;
    reactRoot.render(createElement(PixiTable, {
      view: v, names: (v as unknown as { playerNames?: string[] }).playerNames ?? ['A', 'B', 'C', 'D'],
      vipSeats: (() => { const arr = [false, false, false, false]; if (vip.isVipCached() && seat != null) arr[seat] = true; return arr; })(),
      hands, mySeat: seat,
      legal: myTurn && v.phase === 'playing' ? (state.legal ?? []) : [],
      onBid: seat != null ? (b: Omit<Bid, 'seat'>) => onlineSocket.submitBid(b) : undefined,
      onPlay: seat != null ? (card: Card) => onlineSocket.playCard(card) : undefined,
      // Les émotes passent par le MENU DE GAUCHE (pas le dock HUD) : on ne passe
      // pas onEmote à PixiTable pour éviter deux listes de smileys.
      emoteSignal,
      // v14.7 — Thème visuel de la table calé sur son kind : hybride (jaune),
      // acier (bleu), royal (rouge), le reste tombe sur 'local' (vert).
      theme: melodyKind,
      // v18 — surcharge par le thème back-office choisi (feutre + bordure).
      themeOverrides,
      opponentCards: 'back', showMenu: false, showScoreSheet: true, forceLandscape: false,
      onLeave: () => { onlineSocket.disconnect(); reactRoot?.unmount(); router.go('online'); },
    }));
  };

  if (onlineId) {
    let gotState = false;
    // Voile d'attente tant qu'aucun état de partie n'est reçu (table encore en
    // lobby, ou connexion en cours) — évite d'afficher un tapis vide.
    const waiting = h('div', { class: 'center col gap-3', style: {
      position: 'absolute', inset: '6px 14px 8px 60px', borderRadius: 'var(--r-2xl)', zIndex: '6',
      background: 'rgba(6,10,20,.72)', backdropFilter: 'blur(4px)', textAlign: 'center',
    } },
      h('div', { class: 'title', style: { fontSize: '16px', color: 'var(--c-gold)' } }, 'En attente de la partie…'),
      h('div', { class: 'text-mute', style: { fontSize: '12px', maxWidth: '320px' } }, 'La partie s\'affiche dès qu\'elle démarre. Le jeu tourne sur le serveur : votre robot joue à votre place si vous partez, et vous reprenez la main à votre retour.'),
      Button('← Retour au lobby', { variant: 'secondary', size: 'sm', onClick: () => { onlineSocket.disconnect(); router.go('online'); } }));
    felt.append(waiting);

    // v14.7 — Bouton « Reprendre la main » visible seulement quand ce
    // joueur est en mode substitute (son robot joue à sa place). Positionné
    // en overlay sous le HUD pour être toujours accessible.
    const reclaimBtn = h('button', {
      class: 'btn',
      style: {
        display: 'none', position: 'absolute', top: '12px', left: '50%',
        transform: 'translateX(-50%)', zIndex: '10',
        background: 'linear-gradient(135deg,#e89644,#c96f1e)', color: '#1a0f00',
        fontWeight: '600', boxShadow: '0 4px 16px rgba(232,150,68,.4)',
        padding: '8px 16px',
      },
      onClick: () => { onlineSocket.reclaim(); },
    }, '↺ Reprendre la main') as HTMLButtonElement;
    felt.append(reclaimBtn);
    let myInSubstitute = false;
    const updateReclaimBtn = () => { reclaimBtn.style.display = myInSubstitute ? 'inline-flex' : 'none'; };

    onlineSocket.connect(onlineId, {
      // La mélodie suit le TYPE de la table (hybride/acier/royal), reçu du lobby.
      onLobby: (lobby) => {
        melodyKind = lobby.kind; soundService.playMelodyForTable(melodyKind);
        // v18 — applique le thème de table choisi (couleurs feutre + bordure).
        const ov = buildThemeOverrides(lobby.config?.themeColors);
        if (ov) { themeOverrides = ov; if (lastOnlineState) renderOnline(lastOnlineState); }
      },
      onGame: (state) => { gotState = true; waiting.style.display = 'none'; renderOnline(state); },
      onSpectators: (count) => { spectatorCount.textContent = `${count}`; },
      onSignal: (info) => { if (info.kind === 'smiley' && info.data && typeof (info.data as { emoji?: string }).emoji === 'string') { soundService.playEffect('emote'); emoteSignal = { seat: info.seat as Seat, emoji: (info.data as { emoji: string }).emoji, nonce: ++emoteNonce }; if (lastOnlineState) renderOnline(lastOnlineState); } },
      onFinished: (info) => { showOnlineEnd(info); void ads.afterGame(); },
      onSpectatorFull: (info) => toast(`Table pleine (${info.max} spectateurs max)`, 'error'),
      onConnectError: (msg) => toast(`Connexion impossible : ${msg}`),
      onSubstitute: (info) => {
        const mySeat = lastOnlineState?.mySeat;
        if (mySeat != null && info.seat === mySeat) { myInSubstitute = true; updateReclaimBtn(); }
      },
      onReclaimed: (info) => {
        const mySeat = lastOnlineState?.mySeat;
        if (mySeat != null && info.seat === mySeat) { myInSubstitute = false; updateReclaimBtn(); }
      },
    });
    // Si rien n'arrive au bout de 6 s, on informe sans bloquer (table pas lancée).
    return root;
  }

  // Point d'entrée : les robots viennent du CACHE de session (chargé au
  // bootstrap, persisté, disponible HORS-LIGNE). Le mode solo/entraînement
  // fonctionne donc sans réseau. On ne refetch pas ici — le cache est déjà à
  // jour (rafraîchi sur l'écran Robots ou après création).
  const cachedRobots = ctx.session.robots;
  if (watch) {
    buildAndStart(cachedRobots, { seats: ['auto', 'auto', 'auto', 'auto'], visibility: 'all', manches: 2 });
  } else if (cachedRobots.length > 0) {
    const dlg = GameSetupDialog({
      robots: cachedRobots.map(toDomain),
      onConfirm: (setup) => buildAndStart(cachedRobots, setup),
      onCancel: () => router.go('home'),
    });
    root.append(dlg);
  } else {
    // Aucun robot en cache (tout premier lancement sans réseau) : partie
    // d'entraînement contre 3 robots génériques, jouable immédiatement.
    buildAndStart([], { seats: ['me', 'auto', 'auto', 'auto'], visibility: 'none', manches: 2 });
  }
  return root;
}
