/* =============================================================================
 * PRESENTATION · screens/ReplayScreen.ts
 * Rejeu LIVE d'une partie sauvegardée : rejoue chaque opération avec ses
 * délais (annonce, carte, ramassage), pause et vitesse x1/x2/x4. Rend l'état
 * courant dans la table Pixi montée dans l'emplacement réservé du DS.
 * ========================================================================== */
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { SUIT_SYMBOL, type Bid, type Card, type EngineView, type Operation, type Seat } from 'belote-core';
import { PixiTable } from '@kydos/table-pixi';
import { h } from '../../core/dom';
import { Button } from '../components/ui';
import type { AppContext } from '../context';

interface ReplayDonne {
  dealer: Seat; hands: Card[][]; trump: EngineView['trump']; bidderSeat: Seat | null;
  contract: number | null; contre: EngineView['contre']; operations: Operation[];
}

/**
 * Forme RÉELLE d'un replay moteur (`GameEngine.toReplay()`) :
 * `manches[].donnes[]` — et NON `donnes[]` à la racine.
 */
interface StoredReplay { manches: { donnes: ReplayDonne[] }[]; players?: { name?: string }[] }
interface StoredGame { replay?: StoredReplay }

/** Aplatit toutes les donnes de toutes les manches, dans l'ordre de jeu. */
function flattenDonnes(replay: StoredReplay): ReplayDonne[] {
  return (replay.manches ?? []).flatMap((manche) => manche.donnes ?? []);
}

const chip = (content: string, style: Record<string, string>, onClick?: () => void) =>
  h('div', { class: 'row gap-1 mono', onClick, style: { padding: '6px 14px', borderRadius: 'var(--r-md)', fontSize: '10px', cursor: onClick ? 'pointer' : 'default', ...style } }, content);

// Rejeu 100% local d'une partie sauvegardée : on relit le JSON et on rejoue
// EXACTEMENT les mêmes actions, avec un minimum de 2 s entre chacune (annonce,
// mise de l'annonce, jeu de carte, ramassage). La vitesse peut être augmentée
// (x1 → x2 → x4) via le bouton dédié.
const BASE_STEP_MS = 2000; // minimum imposé entre deux actions
const delayOf = (op: Operation): number =>
  op.type === 'trick' ? BASE_STEP_MS + 400 : op.type === 'donne_score' ? BASE_STEP_MS + 800 : BASE_STEP_MS;

export function ReplayScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;
  const id = new URLSearchParams(location.hash.split('?')[1] ?? '').get('id');

  const scoreEl = h('div', { class: 'row gap-3 mono', style: { fontSize: '11px' } },
    h('span', { style: { color: 'var(--c-success)' } }, 'NOUS 0'),
    h('span', { style: { color: 'var(--c-text-faint)' } }, '/'),
    h('span', { style: { color: 'var(--c-danger)' } }, 'EUX 0'));
  const trumpEl = h('div', { class: 'badge badge--gold', style: { visibility: 'hidden' } }, '♥');
  const mount = h('div', { id: 'game-table-mount', style: { position: 'absolute', inset: '0' } });
  const felt = h('div', { class: 'center', style: {
    position: 'absolute', inset: '52px 22px 58px 60px', borderRadius: 'var(--r-2xl)', overflow: 'hidden',
    background: 'radial-gradient(520px 300px at 50% 45%, #2b8a52, #17673d 70%)', border: '2px solid rgba(230,196,106,.5)', boxShadow: 'inset 0 0 60px rgba(0,0,0,.35), var(--sh-float)',
  } }, mount);

  let paused = false; let speed = 1; let timer: ReturnType<typeof setTimeout> | null = null; let reactRoot: Root | null = null;

  const pauseChip = chip('⏸ Pause', { background: 'rgba(16,21,31,.85)', border: '1px solid var(--c-line)', color: 'var(--c-text-soft)' }, () => {
    paused = !paused; pauseChip.textContent = paused ? '▶ Reprendre' : '⏸ Pause'; if (!paused) tick();
  });
  const speedChip = chip('Vitesse 1×', { background: 'rgba(16,21,31,.85)', border: '1px solid var(--c-line)', color: 'var(--c-text-soft)' }, () => {
    speed = speed === 1 ? 2 : speed === 2 ? 4 : speed === 4 ? 8 : 1; speedChip.textContent = `Vitesse ${speed}×`;
  });
  const statusChip = chip('▶ Rejeu en direct', { background: 'rgba(126,203,152,.14)', border: '1px solid rgba(126,203,152,.35)', color: 'var(--c-success)' });

  const root = h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', background: 'linear-gradient(160deg,#070c17,#05070f)' } },
    h('div', { style: { position: 'absolute', top: '0', left: '0', right: '0', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px 0 60px', zIndex: '5' } },
      Button('← Quitter', { variant: 'secondary', size: 'sm', onClick: () => { if (timer) clearTimeout(timer); reactRoot?.unmount(); router.go('history'); } }),
      h('div', { class: 'row gap-3' }, scoreEl, trumpEl)),
    felt,
    h('div', { class: 'row center gap-2', style: { position: 'absolute', bottom: '12px', left: '60px', right: '22px', height: '38px', justifyContent: 'center' } }, pauseChip, speedChip, statusChip),
  );

  if (!id) { statusChip.textContent = '✕ Identifiant manquant'; return root; }

  // --- Chargement + rejeu ---------------------------------------------------
  interface State { donne: number; trick: { seat: Seat; card: Card }[]; hands: Card[][]; bids: Bid[] }
  let state: State | null = null; let cum = { A: 0, B: 0 };
  let stream: { donne: number; op: Operation }[] = [];
  let cursor = 0;
  let replay: StoredReplay | null = null;
  let donnes: ReplayDonne[] = [];

  const resetDonne = (di: number) => {
    if (!replay) return;
    const d = donnes[di];
    state = { donne: di, trick: [], hands: d.hands.map((x) => [...x]), bids: [] };
  };

  const applyOp = ({ donne, op }: { donne: number; op: Operation }) => {
    if (!replay || !state) return;
    if (donne !== state.donne) resetDonne(donne);
    // IMPORTANT : le siège émetteur est porté par `op.seat` (niveau supérieur),
    // pas par `op.data.seat`. Sans ça, aucune carte n'était posée dans le pli.
    const seat = (op as unknown as { seat?: Seat }).seat;
    const data = op.data as { bid?: Bid; card?: Card; A?: number; B?: number; on?: boolean };
    if (op.type === 'bid' && data.bid && seat != null) state!.bids.push({ ...data.bid, seat });
    if (op.type === 'play' && data.card && seat != null) {
      state!.trick.push({ seat, card: data.card });
      state!.hands[seat] = state!.hands[seat].filter((x) => !(x.rank === data.card!.rank && x.suit === data.card!.suit));
    }
    if (op.type === 'trick') state!.trick = [];
    if (op.type === 'donne_score' && data.A != null && data.B != null) { cum = { A: cum.A + data.A, B: cum.B + data.B }; }
  };

  const render = () => {
    if (!replay || !state) return;
    const d = donnes[state.donne];
    (scoreEl.children[0] as HTMLElement).textContent = `NOUS ${cum.A}`;
    (scoreEl.children[2] as HTMLElement).textContent = `EUX ${cum.B}`;
    if (d.trump) { trumpEl.textContent = `${SUIT_SYMBOL[d.trump]} Atout`; trumpEl.style.visibility = 'visible'; } else trumpEl.style.visibility = 'hidden';
    const view = {
      phase: 'playing', turn: null, trump: d.trump, bidderSeat: d.bidderSeat, dealer: d.dealer,
      firstBidderSeat: ((d.dealer + 1) % 4) as Seat, currentBidValue: d.contract, contre: d.contre,
      contreSeats: [], surcontreSeats: [], bids: state.bids, currentTrick: state.trick, currentTrickLeader: null,
      awaitingCollect: false, pendingWinnerSeat: null, lastTrick: null,
      manchesWon: { A: 0, B: 0 }, cumulative: { ...cum }, belote: null, board: {}, target: 1000, mancheIndex: 0,
    } as unknown as EngineView;

    const names = (replay.players ?? []).map((p) => p.name ?? '—');
    reactRoot ??= createRoot(mount);
    reactRoot.render(createElement(PixiTable, {
      view, names: names.length ? names : ['Athéna', 'Borée', 'Calliope', 'Damon'],
      // Rejeu présenté comme une partie EN COURS : on observe depuis le siège 0,
      // les cartes jouées apparaissent dans le pli, les mains adverses en dos.
      hands: state.hands, mySeat: 0 as Seat, legal: [], opponentCards: 'back',
      showMenu: false, showScoreSheet: true, forceLandscape: false,
    }));
  };

  const tick = () => {
    if (paused || timer || cursor >= stream.length) {
      if (cursor >= stream.length && stream.length) statusChip.textContent = '★ Rejeu terminé';
      return;
    }
    const item = stream[cursor++];
    timer = setTimeout(() => { timer = null; applyOp(item); render(); tick(); }, Math.max(150, delayOf(item.op) / speed));
  };

  api.getGame(id).then(({ game }) => {
    replay = (game as StoredGame).replay ?? null;
    donnes = replay ? flattenDonnes(replay) : [];
    if (!donnes.length) { statusChip.textContent = '✕ Rejeu introuvable'; return; }
    donnes.forEach((d, di) => (d.operations ?? []).forEach((op) => stream.push({ donne: di, op })));
    resetDonne(0);
    render();
    tick();
  }).catch((e) => { statusChip.textContent = `✕ ${(e as Error).message}`; });

  return root;
}
