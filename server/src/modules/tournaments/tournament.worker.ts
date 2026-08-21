/* =============================================================================
 * TOURNAMENTS · tournament.worker.ts — Démarrage automatique à startAt.
 * -----------------------------------------------------------------------------
 * Un simple setInterval (30 s par défaut) qui trouve les tournois UPCOMING
 * dont startAt est passé et les passe en LIVE. Le seed est en FIFO (ordre
 * d'inscription).
 *
 * Choix de simplicité : pas de dépendance à un scheduler externe (agenda,
 * bull) — au démarrage on cherche, on passe, on repart. Pour un vrai scale
 * plus tard, on pourra brancher un scheduler distribué sans toucher au reste.
 * ========================================================================== */
import { TournamentModel, TournamentStatus } from './tournament.model.js';
import { tournamentService } from './tournament.service.js';
import { tournamentOrchestrator } from './tournament.orchestrator.js';

const DEFAULT_TICK_MS = 30_000;

export class TournamentWorker {
  #handle: NodeJS.Timeout | null = null;

  start(tickMs = DEFAULT_TICK_MS): void {
    if (this.#handle) return;
    this.#handle = setInterval(() => { void this.tick(); }, tickMs);
    // Un tick immédiat au démarrage pour rattraper les retards.
    void this.tick();
  }

  stop(): void {
    if (this.#handle) { clearInterval(this.#handle); this.#handle = null; }
  }

  /** Cherche les tournois dont startAt est passé et les démarre, puis fait progresser les tournois LIVE. */
  async tick(): Promise<void> {
    try {
      const now = new Date();
      // 1) upcoming → live (startAt passé)
      const due = await TournamentModel.find({
        status: TournamentStatus.UPCOMING,
        startAt: { $lte: now },
      }).select('_id createdBy').limit(20).lean();
      for (const t of due) {
        try {
          await tournamentService.startNow(String((t as any)._id), { id: String((t as any).createdBy) });
        } catch { /* on ignore, un autre process a pu passer avant */ }
      }
      // 2) live → progression du bracket via l'orchestrateur
      await this.progressLive();
    } catch { /* worker ne doit jamais planter, ceinture + bretelles */ }
  }

  /**
   * v16 — Fait avancer TOUS les tournois LIVE (idempotent). Appelée aussi par
   * le sweep temps-réel (3 s) pour créer promptement les matchs dont le compte
   * à rebours est écoulé, sans attendre le tick worker (30 s).
   */
  async progressLive(): Promise<void> {
    const live = await TournamentModel.find({ status: TournamentStatus.LIVE }).select('_id').limit(50).lean();
    for (const t of live) {
      try { await tournamentOrchestrator.run(String((t as any)._id)); }
      catch { /* résilience : on retente au tick suivant */ }
    }
  }
}

export const tournamentWorker = new TournamentWorker();
