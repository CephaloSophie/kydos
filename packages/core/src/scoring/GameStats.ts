/* =============================================================================
 * GameStats — Statistiques détaillées d'une partie, dérivées du REPLAY.
 * -----------------------------------------------------------------------------
 * Fonction PURE : à partir d'un ReplayRecord (structure froide déjà produite par
 * GameEngine.toReplay()), calcule des agrégats affichables dans le tableau
 * d'historique détaillé : plis par équipe, contrées/surcontrées et leur réussite,
 * capots réalisés et annoncés, belotes, et le score final.
 *
 * Aucune dépendance au moteur vivant : on relit les opérations enregistrées.
 * ========================================================================== */
import type { ReplayRecord, MancheRecord, DonneRecord, Operation } from '../engine/types';
import type { Seat } from '../domain/types';

/** Équipe d'un siège : A = sièges 0/2, B = sièges 1/3. */
function teamOfSeat(seat: Seat): 'A' | 'B' {
  return seat % 2 === 0 ? 'A' : 'B';
}

export interface DonneStat {
  manche: number;
  donne: number;
  bidderTeam: 'A' | 'B' | null;
  contract: number | null;
  trump: string | null;
  contre: 'none' | 'contree' | 'surcontree';
  /** Le contrat a-t-il été rempli par le camp preneur ? */
  contractMet: boolean;
  /** Donne remportée en capot (8 plis) par le camp preneur ? */
  capot: boolean;
  /** Capot annoncé (contrat = capot) ? */
  capotDeclared: boolean;
  tricks: { A: number; B: number };
  score: { A: number; B: number };
}

export interface GameStats {
  winner: 'A' | 'B' | null;
  finalScore: { A: number; B: number };
  manchesWon: { A: number; B: number };
  totalDonnes: number;
  totalTricks: { A: number; B: number };
  /** Nombre de contrées (et surcontrées) posées, par le camp qui contre. */
  contres: { total: number; surcontres: number };
  /** Contrées « réussies » = le camp contré a chuté (contrat NON rempli). */
  contresReussies: number;
  /** Capots réalisés (8 plis), par équipe. */
  capots: { A: number; B: number; total: number };
  /** Capots annoncés (contrat capot), par équipe. */
  capotsAnnonces: { A: number; B: number; total: number };
  belotes: { A: number; B: number };
  donnes: DonneStat[];
}

/** Extrait la valeur numérique d'un contrat depuis les opérations de la donne. */
function contractFromOps(donne: DonneRecord): { value: number | null; capotDeclared: boolean } {
  let value: number | null = donne.contract;
  let capotDeclared = false;
  for (const op of donne.operations as Operation[]) {
    if (op.type === 'bid') {
      const action = op.data?.action as string | undefined;
      if (action === 'capot') { capotDeclared = true; value = (op.data?.value as number) ?? 250; }
      else if (typeof op.data?.value === 'number' && (op.data?.action == null || op.data?.action === 'bid')) {
        value = op.data.value as number;
      }
    }
  }
  return { value, capotDeclared };
}

/** Compte les plis gagnés par équipe dans une donne (via op('trick')). */
function tricksOfDonne(donne: DonneRecord): { A: number; B: number } {
  const tricks = { A: 0, B: 0 };
  for (const op of donne.operations as Operation[]) {
    if (op.type === 'trick' && typeof op.data?.winnerSeat === 'number') {
      tricks[teamOfSeat(op.data.winnerSeat as Seat)]++;
    }
  }
  return tricks;
}

/** Détecte les contrées / surcontrées posées dans une donne. */
function contreLevelOfDonne(donne: DonneRecord): 'none' | 'contree' | 'surcontree' {
  let level: 'none' | 'contree' | 'surcontree' = donne.contre ?? 'none';
  for (const op of donne.operations as Operation[]) {
    if (op.type === 'bid') {
      if (op.data?.action === 'surcontree') level = 'surcontree';
      else if (op.data?.action === 'contree' && level === 'none') level = 'contree';
    }
  }
  return level;
}

/** Nombre de belotes annoncées par équipe (via op('belote_announce', {on:true})). */
function belotesOfDonne(donne: DonneRecord): { A: number; B: number } {
  const belotes = { A: 0, B: 0 };
  for (const op of donne.operations as Operation[]) {
    if (op.type === 'belote_announce' && op.data?.on === true && typeof op.data?.seat === 'number') {
      belotes[teamOfSeat(op.data.seat as Seat)]++;
    }
  }
  return belotes;
}

/**
 * Calcule les statistiques détaillées d'une partie à partir de son replay.
 */
export function computeGameStats(replay: ReplayRecord): GameStats {
  const donnes: DonneStat[] = [];
  const totalTricks = { A: 0, B: 0 };
  const capots = { A: 0, B: 0, total: 0 };
  const capotsAnnonces = { A: 0, B: 0, total: 0 };
  const belotes = { A: 0, B: 0 };
  let contresTotal = 0;
  let surcontres = 0;
  let contresReussies = 0;

  for (const manche of replay.manches as MancheRecord[]) {
    manche.donnes.forEach((donne, di) => {
      const tricks = tricksOfDonne(donne);
      totalTricks.A += tricks.A; totalTricks.B += tricks.B;

      const { value, capotDeclared } = contractFromOps(donne);
      const contre = contreLevelOfDonne(donne);
      const bidderTeam = donne.bidderSeat != null ? teamOfSeat(donne.bidderSeat) : null;
      const score = donne.donneScore ?? { A: 0, B: 0 };

      // Contrat rempli : le camp preneur marque (score > 0 de son côté).
      const contractMet = bidderTeam != null ? score[bidderTeam] > 0 : false;

      // Capot réalisé = le camp preneur a fait les 8 plis.
      const capot = bidderTeam != null && tricks[bidderTeam] === 8;
      if (capot && bidderTeam) { capots[bidderTeam]++; capots.total++; }
      if (capotDeclared && bidderTeam) { capotsAnnonces[bidderTeam]++; capotsAnnonces.total++; }

      // Contrées.
      if (contre === 'contree' || contre === 'surcontree') {
        contresTotal++;
        if (contre === 'surcontree') surcontres++;
        // « Réussie » du point de vue du camp qui contre = le preneur chute.
        if (!contractMet) contresReussies++;
      }

      const b = belotesOfDonne(donne);
      belotes.A += b.A; belotes.B += b.B;

      donnes.push({
        manche: manche.index, donne: di + 1, bidderTeam,
        contract: value, trump: donne.trump, contre, contractMet,
        capot, capotDeclared, tricks, score,
      });
    });
  }

  const last = replay.manches[replay.manches.length - 1] as MancheRecord | undefined;
  const finalScore = last ? last.cumulative : { A: 0, B: 0 };

  return {
    winner: replay.winner ?? null,
    finalScore,
    manchesWon: replay.manchesWon,
    totalDonnes: donnes.length,
    totalTricks,
    contres: { total: contresTotal, surcontres },
    contresReussies,
    capots,
    capotsAnnonces,
    belotes,
    donnes,
  };
}
