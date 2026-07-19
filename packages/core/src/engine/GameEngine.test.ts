import { describe, it, expect } from 'vitest';
import { GameEngine } from './GameEngine';
import { ContreeRules } from '../rules/ContreeRules';
import { DEFAULT_PARTIE } from './types';
import type { Seat } from '../domain/types';

const rules = new ContreeRules();
const players = (names: string[]) => names.map((name, s) => ({ seat: s as Seat, name, type: 'human' as const }));
const fresh = () => new GameEngine(players(['A', 'B', 'C', 'D']) as any, { ...DEFAULT_PARTIE }, rules);

/** Amène le tour au siège 0 (passes successives) puis fait prendre 90 pique. */
function takeBySeat0(e: GameEngine) {
  while (e.turn !== 0) e.submitBid(e.turn!, { action: 'pass' });
  e.submitBid(0, { action: 'bid', value: 90, suit: 'pique', saidSuit: true });
}

describe('Signaux d’enchère (réflexion / répéter la couleur)', () => {
  it('refuse une annonce sans couleur ni répétition (option A)', () => {
    const e = fresh();
    while (e.turn !== 0) e.submitBid(e.turn!, { action: 'pass' });
    expect(e.submitBid(0, { action: 'bid', value: 100 }).ok).toBe(false);
  });

  it('accepte une couleur explicite et l’affiche (saidSuit)', () => {
    const e = fresh();
    while (e.turn !== 0) e.submitBid(e.turn!, { action: 'pass' });
    expect(e.submitBid(0, { action: 'bid', value: 100, suit: 'pique', saidSuit: true }).ok).toBe(true);
    const last = e.view().bids.at(-1)!;
    expect(last.saidSuit).toBe(true);
    expect(last.suit).toBe('pique');
  });

  it('refuse réflexion sur un pass (signal sans annonce)', () => {
    const e = fresh();
    while (e.turn !== 0) e.submitBid(e.turn!, { action: 'pass' });
    expect(e.submitBid(0, { action: 'pass', reflexion: true }).ok).toBe(false);
  });

  it('répéter la couleur du coéquipier : non affichée mais couleur effective conservée', () => {
    const e = fresh();
    takeBySeat0(e); // A (0) prend 90 pique ; partenaire de C (2) = A
    while (e.turn !== 2) e.submitBid(e.turn!, { action: 'pass' });
    expect(e.submitBid(2, { action: 'bid', value: 100, repeatPartnerSuit: true, reflexion: true }).ok).toBe(true);
    const last = e.view().bids.at(-1)!;
    expect(last.saidSuit).toBe(false); // non affichée
    expect(last.suit).toBe('pique'); // couleur effective = celle du partenaire
    expect(last.reflexion).toBe(true);
  });
});

describe('Micro-phase surcontre', () => {
  it('contre → phase surcontre, popup pour le seul camp preneur', () => {
    const e = fresh();
    takeBySeat0(e); // A (0) preneur ; équipe A = sièges 0,2
    expect(e.submitBid(3, { action: 'contree' }).ok).toBe(true);
    expect(e.phase).toBe('surcontre');
    expect(e.view().surcontreSeats).toEqual([0, 2]);
  });

  it('le partenaire du contreur (sorti) ne peut plus rien faire', () => {
    const e = fresh();
    takeBySeat0(e);
    e.submitBid(3, { action: 'contree' }); // D contre ; B (1) sort
    expect(e.submitBid(1, { action: 'pass' }).ok).toBe(false);
    expect(e.submitBid(1, { action: 'surcontree' }).ok).toBe(false);
  });

  it('deux pass → on joue le contré (phase playing, contre conservé)', () => {
    const e = fresh();
    takeBySeat0(e);
    e.submitBid(3, { action: 'contree' });
    e.submitBid(0, { action: 'pass' });
    expect(e.view().surcontreSeats).toEqual([2]); // reste C
    e.submitBid(2, { action: 'pass' });
    expect(e.phase).toBe('playing');
    expect(e.view().contre).toBe('contree');
  });

  it('un surcontre clôt pour les deux (phase playing, contre = surcontree)', () => {
    const e = fresh();
    takeBySeat0(e);
    e.submitBid(3, { action: 'contree' });
    e.submitBid(0, { action: 'pass' });
    expect(e.submitBid(2, { action: 'surcontree' }).ok).toBe(true);
    expect(e.phase).toBe('playing');
    expect(e.view().contre).toBe('surcontree');
  });
});

describe('Annonces : multiples de 10 obligatoires', () => {
  it('rejette une annonce qui n’est pas un multiple de 10 (151, 162, 95…)', () => {
    for (const bad of [151, 162, 95, 101]) {
      const e = fresh();
      while (e.turn !== 0) e.submitBid(e.turn!, { action: 'pass' });
      const r = e.submitBid(0, { action: 'bid', value: bad, suit: 'pique', saidSuit: true });
      expect(r.ok).toBe(false);
    }
  });

  it('accepte les multiples de 10 légaux et impose ensuite +10 minimum', () => {
    const e = fresh();
    while (e.turn !== 0) e.submitBid(e.turn!, { action: 'pass' });
    expect(e.submitBid(0, { action: 'bid', value: 110, suit: 'pique', saidSuit: true }).ok).toBe(true);
    // Le joueur suivant ne peut pas annoncer 110 ni moins.
    const next = e.turn!;
    expect(e.submitBid(next, { action: 'bid', value: 110, suit: 'coeur', saidSuit: true }).ok).toBe(false);
    expect(e.submitBid(next, { action: 'bid', value: 100, suit: 'coeur', saidSuit: true }).ok).toBe(false);
    expect(e.submitBid(next, { action: 'bid', value: 120, suit: 'coeur', saidSuit: true }).ok).toBe(true);
  });
});

describe('Belote / Rebelote : annonce optionnelle', () => {
  /** Joue jusqu'à ce que le porteur de belote ait joué SA PREMIÈRE carte de belote. */
  function playFullDonneUntilBelotePlayed(): { e: GameEngine; holder: Seat } | { e: null; holder: null } {
    const e = fresh();
    for (let guard = 0; guard < 60; guard++) {
      while (e.turn !== 0) e.submitBid(e.turn!, { action: 'pass' });
      e.submitBid(0, { action: 'bid', value: 90, suit: 'pique', saidSuit: true });
      for (const s of [1, 2, 3] as Seat[]) if (e.phase === 'bidding') e.submitBid(s, { action: 'pass' });
      const holder = e.beloteSeat();
      while (e.phase === 'playing') {
        if (e.view().awaitingCollect) { e.collectTrick(); continue; }
        if (holder != null && e.view().belote?.playedCount === 1) return { e, holder };
        const t = e.turn!;
        e.playCard(t, e.legalCards(t)[0]);
      }
      if (e.phase === 'donne_end') e.nextDonne();
      if (e.phase !== 'bidding') break;
    }
    return { e: null, holder: null };
  }

  it('refuse de changer l’annonce après la première carte de belote jouée', () => {
    const { e, holder } = playFullDonneUntilBelotePlayed();
    if (e == null) return; // aucune donne avec belote trouvée dans la garde : rien à vérifier
    expect(e.setBeloteAnnounce(holder, false).ok).toBe(false);
  });

  it('setBeloteAnnounce est refusé pour un siège sans belote', () => {
    const e = fresh();
    while (e.turn !== 0) e.submitBid(e.turn!, { action: 'pass' });
    e.submitBid(0, { action: 'bid', value: 90, suit: 'pique', saidSuit: true });
    for (const s of [1, 2, 3] as Seat[]) if (e.phase === 'bidding') e.submitBid(s, { action: 'pass' });
    const holder = e.beloteSeat();
    const notHolder = ([0, 1, 2, 3] as Seat[]).find((x) => x !== holder)!;
    expect(e.setBeloteAnnounce(notHolder, false).ok).toBe(false);
  });

  it('la vue expose le porteur, son choix et le nombre de cartes jouées', () => {
    const e = fresh();
    while (e.turn !== 0) e.submitBid(e.turn!, { action: 'pass' });
    e.submitBid(0, { action: 'bid', value: 90, suit: 'pique', saidSuit: true });
    for (const s of [1, 2, 3] as Seat[]) if (e.phase === 'bidding') e.submitBid(s, { action: 'pass' });
    const holder = e.beloteSeat();
    if (holder == null) return; // donne sans belote : rien à vérifier
    const v = e.view();
    expect(v.belote).toEqual({ seat: holder, announcing: true, playedCount: 0 });
    e.setBeloteAnnounce(holder, false);
    expect(e.view().belote!.announcing).toBe(false);
  });
});
