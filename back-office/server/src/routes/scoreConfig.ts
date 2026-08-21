/* =============================================================================
 * BACK-OFFICE · routes/scoreConfig.ts — Modèle UNIQUE de score & niveau Kýdos.
 * -----------------------------------------------------------------------------
 * Un SEUL document (`key: 'default'`) pilote tout le calcul de score de
 * l'application. Ces routes permettent de le LIRE, le METTRE À JOUR et de le
 * DIAGNOSTIQUER (détection des incohérences), avec un aperçu calculé (échelle de
 * niveaux + exemples de gain) pour l'interface de gestion.
 * ========================================================================== */
import { Router } from 'express';
import mongoose from 'mongoose';
import type { AdminRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/auditLog.js';
import {
  resolveScoreKydosConfig, diagnoseScoreKydos, buildLevelTable, levelForScore, computeScoreGain,
  gameTypeCoefficient, GAME_CATEGORIES, GAME_KINDS, gameTypeKey,
  type ScoreKydosConfig, type GameCategory, type GameKind,
} from '../scoreKydos.js';

const router = Router();

const MODEL = 'ScoreConfig';

async function ensureSeeded() {
  const Model = mongoose.model(MODEL);
  if (!(await Model.exists({ key: 'default' }))) await Model.create({ key: 'default' });
}

/** Nombre de lignes de l'aperçu de l'échelle (les premiers niveaux suffisent). */
const PREVIEW_LEVELS = 25;

/** Construit l'aperçu complet (échelle tronquée + exemples de gain) d'une config. */
function buildPreview(config: ScoreKydosConfig) {
  const fullTable = buildLevelTable(config);
  const levelTable = fullTable.slice(0, PREVIEW_LEVELS);
  // Matrice des coefficients de type de jeu (catégorie × genre), défaut 1.
  const gameTypeMatrix = GAME_CATEGORIES.map((category: GameCategory) => ({
    category,
    kinds: GAME_KINDS.map((kind: GameKind) => ({ kind, key: gameTypeKey(category, kind), coefficient: gameTypeCoefficient(config, category, kind) })),
  }));
  // Exemple concret de gain (coefficient de partie 1, jetons 200).
  const example = (isRobot: boolean, category: GameCategory, kind: GameKind) =>
    computeScoreGain(config, { isRobot, partieCoefficient: 1, gameTypeCoefficient: gameTypeCoefficient(config, category, kind), tokensAccumulated: 200 });
  return {
    diagnostics: diagnoseScoreKydos(config),
    levelTable,
    totalLevels: fullTable.length,
    gameTypeMatrix,
    gainExamples: {
      player: example(false, 'quick', 'hybride'),
      robot: example(true, 'quick', 'hybride'),
    },
    // Repères d'échelle : score cumulé pour quelques niveaux clés.
    milestones: [2, 5, 10, 25, 50, 100]
      .filter((l) => l <= config.maxLevel)
      .map((l) => ({ level: l, cumulativeToReach: fullTable[l - 1]?.cumulative ?? null })),
    sampleProgress: levelForScore(config, config.firstLevelThreshold),
  };
}

/** GET — configuration courante + aperçu (échelle, diagnostic, coefficients). */
router.get('/', async (_req, res) => {
  try {
    await ensureSeeded();
    const doc: any = await mongoose.model(MODEL).findOne({ key: 'default' }).lean();
    const config = resolveScoreKydosConfig(doc ?? undefined);
    res.json({ config, ...buildPreview(config) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/**
 * POST /preview — aperçu (diagnostic + échelle) d'une configuration CANDIDATE,
 * SANS l'enregistrer. Alimente le retour LIVE de l'interface pendant l'édition.
 */
router.post('/preview', async (req, res) => {
  try {
    const config = resolveScoreKydosConfig(req.body?.config ?? req.body ?? {});
    res.json({ config, ...buildPreview(config) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/**
 * PUT — enregistre la configuration. REFUSE l'enregistrement s'il subsiste des
 * erreurs de diagnostic (les avertissements/infos sont tolérés). Renvoie la
 * config normalisée + le nouvel aperçu.
 */
router.put('/', async (req: AdminRequest, res) => {
  try {
    await ensureSeeded();
    const config = resolveScoreKydosConfig(req.body?.config ?? req.body ?? {});
    const diagnostics = diagnoseScoreKydos(config);
    const errors = diagnostics.filter((d) => d.severity === 'error');
    if (errors.length && !req.body?.force) {
      res.status(400).json({ error: 'Configuration incohérente : corrigez les erreurs avant d\'enregistrer.', diagnostics });
      return;
    }
    const doc: any = await mongoose.model(MODEL).findOneAndUpdate(
      { key: 'default' },
      { $set: { ...config, key: 'default' } },
      { new: true, upsert: true },
    ).lean();
    const saved = resolveScoreKydosConfig(doc ?? config);
    await logAudit(req.adminId!, 'scoreConfig.update', 'default', {
      after: { baseWinnerPlayer: saved.baseWinnerPlayer, baseWinnerRobot: saved.baseWinnerRobot, firstLevelThreshold: saved.firstLevelThreshold, levelUpPercent: saved.levelUpPercent },
    });
    res.json({ config: saved, ...buildPreview(saved) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
