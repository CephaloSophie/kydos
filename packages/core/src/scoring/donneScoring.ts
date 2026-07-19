import type { MancheScoreInput, MancheScoreResult } from '../rules/RulesEngine';
import type { RulesConfig } from '../rules/RulesConfig';

/**
 * SCORING — calcul de score PUR et INDÉPENDANT (aucune dépendance au moteur de jeu).
 *
 * RÈGLES (confirmées) :
 *  • Base 162 (152 cartes + 10 de der). Le der est ajouté à l'équipe du dernier pli AVANT arrondi.
 *  • Arrondi par équipe, 5 qui monte → total naturel 160 OU 170 (« casse » = score finissant par 5/6/7).
 *  • Belote (+20) : uniquement si ANNONCÉE ; compte pour valider le contrat.
 *      - si le camp qui l'a annoncée PERD (chute simple ou contre) → les 20 passent à l'adversaire ;
 *      - si personne ne l'annonce → personne ne prend les 20.
 *  • SANS contre : contrat réussi → chaque équipe marque ses points arrondis (chacune garde sa belote).
 *                  contrat chuté → défense = 160 FIXE, preneur = 0.
 *  • AVEC contre  : le camp gagnant marque 320 FIXE ; surcontre → 640 FIXE ; l'autre 0.
 *  • La belote finit TOUJOURS chez le gagnant (qu'il l'ait annoncée ou qu'elle lui revienne).
 */

/** Arrondi à la dizaine, >= 5 vers le haut (65 -> 70, 64 -> 60). Par équipe, sans lissage. */
export function roundPoints(raw: number, roundTo: number): number {
  return Math.round(raw / roundTo) * roundTo;
}

/**
 * Score d'une manche (donne). Fonction PURE : (entrée, barème) -> résultat.
 * Note : comme la belote (20) est un multiple de l'arrondi (10), l'ajouter avant ou après
 * l'arrondi donne le même résultat — on l'ajoute donc proprement après.
 */
export function scoreManche(input: MancheScoreInput, config: RulesConfig): MancheScoreResult {
  const c = config;
  const taker = input.takerTeam;
  const defense: 'A' | 'B' = taker === 'A' ? 'B' : 'A';
  const hasBelote = input.beloteTeam !== null;
  const beloteOf = (team: 'A' | 'B') => (input.beloteTeam === team ? c.beloteBonus : 0);

  // Dix de der ajouté à l'équipe du dernier pli (la base totale vaut 162), puis arrondi par équipe.
  const raw = { ...input.rawPoints };
  raw[input.lastTrickTeam] += c.dixDeDer;
  const rounded = { A: roundPoints(raw.A, c.roundTo), B: roundPoints(raw.B, c.roundTo) };

  // Validation du contrat : points arrondis du preneur + sa belote (si annoncée par lui).
  const takerForContract = rounded[taker] + beloteOf(taker);
  const met = takerForContract >= input.contract;

  // CAPOT (barème dédié ; à reconfirmer ensemble — non revu dans cette passe de règles).
  if (input.isCapot) {
    const mult = input.contre === 'surcontree' ? c.surcontreMultiplier : input.contre === 'contree' ? c.contreMultiplier : 1;
    const base = input.capotDeclared ? c.capotDeclared : c.capotUndeclared;
    return {
      [taker]: base * mult + beloteOf(taker),
      [defense]: beloteOf(defense),
      contractMet: true,
      detail: { capot: base, mult },
    } as unknown as MancheScoreResult;
  }

  // AVEC CONTRE / SURCONTRE : forfait FIXE au camp gagnant ; la belote finit chez le gagnant.
  if (input.contre === 'contree' || input.contre === 'surcontree') {
    const winner = met ? taker : defense;
    const loser = met ? defense : taker;
    const base = input.contre === 'surcontree' ? c.surcontreWin : c.contreWin; // 640 / 320
    return {
      [winner]: base + (hasBelote ? c.beloteBonus : 0),
      [loser]: 0,
      contractMet: met,
      detail: { contre: input.contre, base, belote: hasBelote },
    } as unknown as MancheScoreResult;
  }

  // SANS CONTRE — contrat réussi : chaque équipe garde ses points arrondis + sa propre belote.
  if (met) {
    return {
      [taker]: rounded[taker] + beloteOf(taker),
      [defense]: rounded[defense] + beloteOf(defense),
      contractMet: true,
      detail: { takerTotal: takerForContract, contract: input.contract },
    } as unknown as MancheScoreResult;
  }

  // SANS CONTRE — contrat chuté : défense = 160 FIXE (+ belote, qui revient au gagnant = défense), preneur = 0.
  return {
    [defense]: c.dedansBase + (hasBelote ? c.beloteBonus : 0),
    [taker]: 0,
    contractMet: false,
    detail: { dedans: true, contract: input.contract },
  } as unknown as MancheScoreResult;
}
