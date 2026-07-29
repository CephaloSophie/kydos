/* =============================================================================
 * SOUND · soundEvents.ts — détection PURE des événements sonores de la table.
 * -----------------------------------------------------------------------------
 * Compare deux vues moteur consécutives (prev → next) et renvoie la liste des
 * effets à jouer. Aucune dépendance audio : logique testable, utilisée telle
 * quelle par les modes LOCAL et EN LIGNE (le serveur envoie les mêmes vues).
 * L'effet 'emote' n'est PAS détecté ici (il vient du signal socket, pas de la
 * vue) — l'écran le déclenche directement.
 * ========================================================================== */
import type { EngineView, Seat } from 'belote-core';
import type { SoundEffect } from './soundConfig';

/**
 * Événements sonores induits par le passage de `prev` à `next`.
 * @param prev   vue précédente (null au premier rendu → aucun son, évite une
 *               rafale à l'arrivée sur une partie déjà entamée)
 * @param next   nouvelle vue
 * @param mySeat siège du joueur local (null = spectateur : toutes les cartes
 *               sonnent « autre joueur »)
 */
export function detectSoundEvents(prev: EngineView | null, next: EngineView, mySeat: Seat | null): SoundEffect[] {
  if (!prev) return [];
  const events: SoundEffect[] = [];

  // 1) Cartes jouées : nouvelles entrées du pli courant.
  if (next.currentTrick.length > prev.currentTrick.length && next.currentTrick.length >= 1) {
    for (const played of next.currentTrick.slice(prev.currentTrick.length)) {
      events.push(played.seat === mySeat ? 'card-play' : 'card-other');
    }
  }

  // 2) Ramassage du pli : le pli plein se vide (ou nouvelle donne).
  if (prev.awaitingCollect && !next.awaitingCollect && next.currentTrick.length === 0) {
    events.push('trick-collect');
  }

  // 3) Enchères : nouvelles annonces (les bids sont cumulées dans la donne).
  if (next.bids.length > prev.bids.length) {
    for (const bid of next.bids.slice(prev.bids.length)) {
      if (bid.action === 'pass') events.push('pass');
      else if (bid.action === 'contree') events.push('contre');
      else if (bid.action === 'surcontree') events.push('surcontre');
      else if (bid.action === 'bid' || bid.action === 'capot') {
        events.push(bid.reflexion ? 'bid-reflexion' : 'bid-raise');
      }
    }
  } else if (next.bids.length < prev.bids.length && next.bids.length === 1) {
    // Nouvelle donne dont la 1re annonce arrive dans la même mise à jour.
    const bid = next.bids[0];
    if (bid.action === 'pass') events.push('pass');
    else if (bid.action === 'bid' || bid.action === 'capot') events.push(bid.reflexion ? 'bid-reflexion' : 'bid-raise');
  }

  // 4) Belote : première carte de la paire Roi/Dame d'atout annoncée.
  const prevBelote = prev.belote?.announcing ? prev.belote.playedCount : null;
  const nextBelote = next.belote?.announcing ? next.belote.playedCount : null;
  if (nextBelote != null && nextBelote >= 1 && (prevBelote == null || nextBelote > prevBelote)) {
    events.push('belote');
  }

  return events;
}
