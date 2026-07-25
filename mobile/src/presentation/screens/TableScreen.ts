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
  ContreeRules, DEFAULT_PARTIE, GameEngine, SUIT_SYMBOL, createAlgorithm, makeRobot, robotFromFiche,
  type Bid, type Card, type EnginePlayer, type Seat,
} from 'belote-core';
import { PixiTable } from '@kydos/table-pixi';
import { h } from '../../core/dom';
import { Button } from '../components/ui';
import { GameLoop } from '../../services/gameLoop';
import { mySeatFromSetup, type GameSetup } from '../../services/gameSetup';
import { TableSocket, type LiveGameState } from '../../data/TableSocket';
import { toast } from '../components/feedback';
import { GameSetupDialog } from '../components/GameSetupDialog';
import type { AppContext } from '../context';
import type { ServerRobot } from '../../data/ApiClient';
import { toDomain } from '../../data/RobotRepository';

const rules = new ContreeRules();
const GREEK = ['Athéna', 'Borée', 'Calliope', 'Damon'];

const chip = (content: HTMLElement[] | string, style: Record<string, string>, onClick?: () => void) =>
  h('div', { class: 'row gap-1 mono', onClick, style: { padding: '6px 14px', borderRadius: 'var(--r-md)', fontSize: '10px', cursor: onClick ? 'pointer' : 'default', ...style } }, ...(Array.isArray(content) ? content : [content]));

export function TableScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;
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

  const onlineSocket = new TableSocket();
  let reactRoot: Root | null = null;
  let loop: GameLoop | undefined;

  /** Sortie propre : coupe la boucle locale OU la connexion en ligne. */
  const leaveTable = () => { loop?.dispose(); onlineSocket.disconnect(); reactRoot?.unmount(); router.go(onlineId ? 'online' : 'home'); };

  // --- HUD (fidèle au DS) ---------------------------------------------------
  const scoreEl = h('div', { class: 'row gap-3 mono', style: { fontSize: '11px' } },
    h('span', { style: { color: 'var(--c-success)' } }, 'NOUS 0'),
    h('span', { style: { color: 'var(--c-text-faint)' } }, '/'),
    h('span', { style: { color: 'var(--c-danger)' } }, 'EUX 0'));
  const trumpEl = h('div', { class: 'badge badge--gold', style: { visibility: 'hidden' } }, '♥ Atout');

  // Emplacement réservé du DS → montage du composant table Pixi.
  const mount = h('div', { id: 'game-table-mount', 'data-slot': 'table-component', style: { position: 'absolute', inset: '0' } });
  const felt = h('div', {
    class: 'center', style: {
      position: 'absolute', inset: '52px 22px 58px 60px', borderRadius: 'var(--r-2xl)', overflow: 'hidden',
      background: 'radial-gradient(520px 300px at 50% 45%, #2b8a52, #17673d 70%)', border: '2px solid rgba(230,196,106,.5)', boxShadow: 'inset 0 0 60px rgba(0,0,0,.35), var(--sh-float)',
    },
  }, mount);

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

  const pauseChip = chip([h('span', { class: 'gold' }, '⏸'), h('span', {}, ' Pause')], { background: 'rgba(16,21,31,.85)', border: '1px solid var(--c-line)', color: 'var(--c-text-soft)' }, () => {
    if (!loop) return;
    const paused = loop.togglePause();
    pauseChip.textContent = paused ? '▶ Reprendre' : '⏸ Pause';
  });
  const speedChip = chip('Vitesse 1×', { background: 'rgba(16,21,31,.85)', border: '1px solid var(--c-line)', color: 'var(--c-text-soft)' }, () => {
    if (loop) speedChip.textContent = `Vitesse ${loop.cycleSpeed()}×`;
  });
  const statusChip = chip(watch ? '● Vous regardez' : '● Partie en cours', { background: 'rgba(126,203,152,.14)', border: '1px solid rgba(126,203,152,.35)', color: 'var(--c-success)' });
  const spectatorChip = chip('👁 0', { background: 'rgba(16,21,31,.85)', border: '1px solid var(--c-line)', color: 'var(--c-text-soft)' });
  spectatorChip.style.display = onlineId ? 'inline-flex' : 'none';

  const root = h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', background: 'linear-gradient(160deg,#070c17,#05070f)' } },
    h('div', { style: { position: 'absolute', top: '0', left: '0', right: '0', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px 0 60px', zIndex: '5' } },
      Button('← Quitter', { variant: 'secondary', size: 'sm', onClick: leaveTable }),
      h('div', { class: 'row gap-3' }, scoreEl, trumpEl)),
    felt,
    // Overlay de logs : réservé au REJEU/local. Jamais en ligne.
    onlineId ? null : logsOverlay,
    h('div', { class: 'row center gap-2', style: { position: 'absolute', bottom: '12px', left: '60px', right: '22px', height: '38px', justifyContent: 'center' } },
      // Pause + vitesse : uniquement hors ligne (le rythme d'une partie en
      // ligne est piloté par le serveur). En ligne : statut + spectateurs.
      onlineId ? null : pauseChip, onlineId ? null : speedChip, statusChip, spectatorChip),
  );

  // --- Moteur + boucle (démarrés après chargement des robots) ---------------
  let saved = false;

  const buildAndStart = (robots: ServerRobot[], setup: GameSetup) => {
    mySeat = mySeatFromSetup(setup);
    // Adversaires TOUJOURS dos : on ne révèle jamais les cartes des autres joueurs.
    opponentCards = 'back';
    const byId = new Map(robots.map((r) => [r.id, r]));
    const cfg = ([0, 1, 2, 3] as Seat[]).map((i) => {
      if (i === mySeat) return makeRobot({ id: 'human', name: 'Vous' });
      const choice = setup.seats[i];
      const chosen = choice !== 'auto' && choice !== 'me' ? byId.get(choice) : undefined;
      if (chosen) return robotFromFiche({ ...chosen, _id: chosen.id } as never, { id: chosen.id, name: chosen.name });
      // « Auto » : robot générique (personnalité paramétrée pour de la variété).
      return makeRobot({ id: `bot${i}`, name: GREEK[i], personality: { aggressiveness: 3 + i * 2, concentration: 5, velocity: 5 } });
    });
    const players: EnginePlayer[] = cfg.map((c, i) => ({ seat: i as Seat, name: c.name, type: i === mySeat ? 'human' : 'robot', robotId: c.id }));
    const engine = new GameEngine(players, { ...DEFAULT_PARTIE, manches: setup.manches, local: true }, rules);
    const brains = players.map((p, i) => (p.type === 'robot' ? createAlgorithm(cfg[i], rules, () => {}) : null));

    loop = new GameLoop(engine, {
      brains,
      onTick: () => render(engine, players.map((p) => p.name)),
      onEnd: () => {
        if (saved) return;
        saved = true;
        api.saveGame({ replay: engine.toReplay(), logs: [], mode: 'local', winner: engine.partieWinner }).catch(() => {});
        statusChip.textContent = `★ Terminé — équipe ${engine.partieWinner}`;
      },
    });
    render(engine, players.map((p) => p.name));
    loop.start();
  };

  const render = (engine: GameEngine, names: string[]) => {
    const v = engine.view();
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
    (scoreEl.children[0] as HTMLElement).textContent = `NOUS ${v.cumulative.A}`;
    (scoreEl.children[2] as HTMLElement).textContent = `EUX ${v.cumulative.B}`;
    if (v.trump) { trumpEl.textContent = `${SUIT_SYMBOL[v.trump]} Atout`; trumpEl.style.visibility = 'visible'; } else trumpEl.style.visibility = 'hidden';

    const myTurn = mySeat != null && engine.turn === mySeat && !v.awaitingCollect;
    reactRoot ??= createRoot(mount);
    reactRoot.render(createElement(PixiTable, {
      view: v, names,
      hands: [0, 1, 2, 3].map((i) => engine.handOf(i as Seat)),
      mySeat,
      legal: myTurn && v.phase === 'playing' ? engine.legalCards(mySeat as Seat) : [],
      onBid: mySeat != null ? (b: Omit<Bid, 'seat'>) => { engine.submitBid(mySeat as Seat, b); loop?.resume(); } : undefined,
      onPlay: mySeat != null ? (card: Card) => { engine.playCard(mySeat as Seat, card); loop?.resume(); } : undefined,
      onBeloteToggle: mySeat != null ? (on: boolean) => { engine.setBeloteAnnounce(mySeat as Seat, on); loop?.resume(); } : undefined,
      // Coéquipier TOUJOURS caché (règle de belote — appliqué par PixiTable via `partnerFaceDown`).
      opponentCards, showMenu: false, showScoreSheet: true, forceLandscape: false,
      onLeave: leaveTable,
    }));
  };

  /* ── MODE EN LIGNE ─────────────────────────────────────────────────────
   * Le serveur envoie l'état complet (vue, ma main, coups légaux, mon siège).
   * On rend directement la table Pixi avec ces données — le mobile ne calcule
   * rien. Les robots jouent côté serveur ; la partie reste affichée jusqu'à sa
   * fin, même si on l'a rejointe en cours. */
  const renderOnline = (state: LiveGameState) => {
    const v = state.view;
    const seat = state.mySeat ?? null;
    (scoreEl.children[0] as HTMLElement).textContent = `NOUS ${v.cumulative?.A ?? 0}`;
    (scoreEl.children[2] as HTMLElement).textContent = `EUX ${v.cumulative?.B ?? 0}`;
    if (v.trump) { trumpEl.textContent = `${SUIT_SYMBOL[v.trump]} Atout`; trumpEl.style.visibility = 'visible'; } else trumpEl.style.visibility = 'hidden';
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
    reactRoot.render(createElement(PixiTable, {
      view: v, names: (v as unknown as { playerNames?: string[] }).playerNames ?? ['A', 'B', 'C', 'D'],
      hands, mySeat: seat,
      legal: myTurn && v.phase === 'playing' ? (state.legal ?? []) : [],
      onBid: seat != null ? (b: Omit<Bid, 'seat'>) => onlineSocket.submitBid(b) : undefined,
      onPlay: seat != null ? (card: Card) => onlineSocket.playCard(card) : undefined,
      opponentCards: 'back', showMenu: false, showScoreSheet: true, forceLandscape: false,
      onLeave: () => { onlineSocket.disconnect(); reactRoot?.unmount(); router.go('online'); },
    }));
  };

  if (onlineId) {
    statusChip.textContent = '● Connexion…';
    let gotState = false;
    // Voile d'attente tant qu'aucun état de partie n'est reçu (table encore en
    // lobby, ou connexion en cours) — évite d'afficher un tapis vide.
    const waiting = h('div', { class: 'center col gap-3', style: {
      position: 'absolute', inset: '52px 22px 58px 60px', borderRadius: 'var(--r-2xl)', zIndex: '6',
      background: 'rgba(6,10,20,.72)', backdropFilter: 'blur(4px)', textAlign: 'center',
    } },
      h('div', { class: 'title', style: { fontSize: '16px', color: 'var(--c-gold)' } }, 'En attente de la partie…'),
      h('div', { class: 'text-mute', style: { fontSize: '12px', maxWidth: '320px' } }, 'La partie s\'affiche dès qu\'elle démarre. Le jeu tourne sur le serveur : votre robot joue à votre place si vous partez, et vous reprenez la main à votre retour.'),
      Button('← Retour au lobby', { variant: 'secondary', size: 'sm', onClick: () => { onlineSocket.disconnect(); router.go('online'); } }));
    felt.append(waiting);

    onlineSocket.connect(onlineId, {
      onGame: (state) => { gotState = true; statusChip.textContent = '● En ligne'; waiting.style.display = 'none'; renderOnline(state); },
      onSpectators: (count) => { spectatorChip.textContent = `👁 ${count}`; },
      onFinished: (info) => { toast(info.winner ? `Partie terminée — ${info.winner === 'A' ? 'NOUS' : 'EUX'} gagne` : 'Partie terminée', 'success'); },
      onSpectatorFull: (info) => toast(`Table pleine (${info.max} spectateurs max)`, 'error'),
      onConnectError: (msg) => toast(`Connexion impossible : ${msg}`),
    });
    // Si rien n'arrive au bout de 6 s, on informe sans bloquer (table pas lancée).
    setTimeout(() => { if (!gotState) statusChip.textContent = '● En attente du lancement'; }, 6000);
    return root;
  }

  // Point d'entrée : chargement des robots, puis dialogue (sauf mode « regarder »).
  api.listRobots().then(({ robots }) => {
    if (watch) { buildAndStart(robots, { seats: ['auto', 'auto', 'auto', 'auto'], visibility: 'all', manches: 2 }); return; }
    const dlg = GameSetupDialog({
      robots: robots.map(toDomain),
      onConfirm: (setup) => buildAndStart(robots, setup),
      onCancel: () => router.go('home'),
    });
    root.append(dlg);
  }).catch(() => {
    // Pas de robots (offline) : on lance quand même une partie contre 3 génériques.
    buildAndStart([], { seats: ['me', 'auto', 'auto', 'auto'], visibility: 'none', manches: 2 });
  });
  return root;
}
