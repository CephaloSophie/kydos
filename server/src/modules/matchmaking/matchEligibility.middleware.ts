/* =============================================================================
 * MATCHMAKING · matchEligibility.middleware.ts — Garde d'inscription (v16).
 * -----------------------------------------------------------------------------
 * Vérifie côté SERVEUR les critères d'acceptation d'un MATCH RAPIDE avant
 * d'autoriser l'inscription : le format doit être ACTIF et le NIVEAU du joueur
 * doit être compris dans [minLevel, maxLevel]. Le front ne fait que masquer ce
 * qui n'est pas éligible (et plafonne l'affichage) — c'est ce middleware qui
 * FAIT AUTORITÉ. Renvoie 403 avec un message clair sinon.
 * ========================================================================== */
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/authentication.js';
import { UserModel } from '../user/user.model.js';
import { MatchFormat } from '../matches/matchFormat.js';
import { matchFormatConfigService, isLevelEligible } from '../matches/matchFormatConfig.service.js';
import { badRequest, forbidden } from '../../core/HttpError.js';

/** Niveau du joueur (0 par défaut tant que la progression n'est pas branchée). */
async function levelOf(userId: string): Promise<number> {
  const u: any = await UserModel.findById(userId).select('level').lean();
  return u?.level ?? 0;
}

export async function requireMatchEligibility(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const format = req.body?.format as MatchFormat;
    if (!format || !Object.values(MatchFormat).includes(format)) throw badRequest('Format de match invalide.');

    const eff = await matchFormatConfigService.getEffective(format);
    if (!eff.active) throw forbidden('Ce match rapide n’est pas disponible actuellement.');

    const level = await levelOf(req.userId!);
    if (!isLevelEligible(level, eff.minLevel, eff.maxLevel)) {
      if (level < eff.minLevel) {
        throw forbidden(`Niveau ${eff.minLevel} requis pour « ${eff.label} » (vous êtes niveau ${level}).`);
      }
      throw forbidden(`« ${eff.label} » est réservé au niveau ${eff.maxLevel} maximum (vous êtes niveau ${level}).`);
    }
    next();
  } catch (e) {
    next(e);
  }
}
