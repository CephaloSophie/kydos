import { Router } from 'express';
import mongoose from 'mongoose';
import type { AdminRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/auditLog.js';

const router = Router();

/**
 * Structure + valeurs catalogue par format (miroir de matchFormat.ts). Sert au
 * calcul du net maison EFFECTIF : rake catalogue + delta de mise/gain — cohérent
 * avec le serveur (le rake Duo d'acier reste 50 par défaut, pas 250).
 */
const STRUCTURE: Record<string, { humansPerMatch: number; winnersPerMatch: number; baseRake: number; defaultBuyIn: number; defaultPrize: number }> = {
  duo_steel: { humansPerMatch: 2, winnersPerMatch: 1, baseRake: 50, defaultBuyIn: 200, defaultPrize: 150 },
  hybrid_alliance: { humansPerMatch: 2, winnersPerMatch: 1, baseRake: 75, defaultBuyIn: 150, defaultPrize: 225 },
  royal_square: { humansPerMatch: 4, winnersPerMatch: 2, baseRake: 100, defaultBuyIn: 100, defaultPrize: 150 },
};

/** Valeurs par défaut (reprises du catalogue serveur) si la collection est vide. */
const DEFAULTS = [
  { format: 'duo_steel', label: 'Duo d’acier', subtitle: 'Un affrontement 100 % en coulisses.', buyInPerPlayer: 200, prizePerWinner: 150, manches: 2, baseTarget: 1500, labelTarget: 2000, color: '#3f6ea1', icon: '♦', minLevel: 0, maxLevel: null, active: true, order: 0 },
  { format: 'hybrid_alliance', label: 'Alliance hybride', subtitle: 'Vous + votre robot, tous ensemble.', buyInPerPlayer: 150, prizePerWinner: 225, manches: 2, baseTarget: 1500, labelTarget: 2000, color: '#c99c3f', icon: '♠', minLevel: 0, maxLevel: null, active: true, order: 1 },
  { format: 'royal_square', label: 'Carrée royale', subtitle: 'Quatre humains, deux équipes, une couronne.', buyInPerPlayer: 100, prizePerWinner: 150, manches: 2, baseTarget: 1500, labelTarget: 2000, color: '#b0384a', icon: '♥', minLevel: 0, maxLevel: null, active: true, order: 2 },
];

async function ensureSeeded() {
  const Model = mongoose.model('MatchFormatConfig');
  for (const d of DEFAULTS) {
    const exists = await Model.exists({ format: d.format });
    if (!exists) await Model.create(d);
  }
}

/** Net maison EFFECTIF d'un match = rake catalogue + delta mise/gain. */
function houseNet(cfg: any): number {
  const s = STRUCTURE[cfg.format] ?? { humansPerMatch: 2, winnersPerMatch: 1, baseRake: 0, defaultBuyIn: 0, defaultPrize: 0 };
  return s.baseRake
    + (cfg.buyInPerPlayer - s.defaultBuyIn) * s.humansPerMatch
    - (cfg.prizePerWinner - s.defaultPrize) * s.winnersPerMatch;
}

router.get('/', async (_req, res) => {
  try {
    await ensureSeeded();
    const Model = mongoose.model('MatchFormatConfig');
    const formats = await Model.find({}).sort({ order: 1 }).lean();
    res.json({ formats: formats.map((f: any) => ({ ...f, houseNet: houseNet(f) })) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:format', async (req: AdminRequest, res) => {
  try {
    await ensureSeeded();
    const Model = mongoose.model('MatchFormatConfig');
    const cfg = await Model.findOne({ format: req.params.format }) as any;
    if (!cfg) { res.status(404).json({ error: 'Format inconnu' }); return; }

    const { label, subtitle, buyInPerPlayer, prizePerWinner, manches, baseTarget, labelTarget, color, icon, minLevel, maxLevel, active, order } = req.body;
    const num = (v: any, min: number, max: number, cur: number) => {
      const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : cur;
    };
    if (label !== undefined) cfg.label = String(label);
    if (subtitle !== undefined) cfg.subtitle = String(subtitle);
    if (buyInPerPlayer !== undefined) cfg.buyInPerPlayer = num(buyInPerPlayer, 0, 1_000_000, cfg.buyInPerPlayer);
    if (prizePerWinner !== undefined) cfg.prizePerWinner = num(prizePerWinner, 0, 1_000_000, cfg.prizePerWinner);
    if (manches !== undefined && [1, 2, 4].includes(Number(manches))) cfg.manches = Number(manches);
    if (baseTarget !== undefined) cfg.baseTarget = num(baseTarget, 100, 100_000, cfg.baseTarget);
    if (labelTarget !== undefined) cfg.labelTarget = num(labelTarget, 100, 100_000, cfg.labelTarget);
    if (color !== undefined) cfg.color = String(color);
    if (icon !== undefined) cfg.icon = String(icon);
    if (minLevel !== undefined) cfg.minLevel = num(minLevel, 0, 9999, cfg.minLevel);
    if (maxLevel !== undefined) cfg.maxLevel = (maxLevel === null || maxLevel === '') ? null : num(maxLevel, 0, 9999, cfg.maxLevel ?? 0);
    if (active !== undefined) cfg.active = !!active;
    if (order !== undefined) cfg.order = num(order, 0, 999, cfg.order);
    await cfg.save();

    await logAudit(req.adminId!, 'matchFormat.update', req.params.format, {
      after: { buyInPerPlayer: cfg.buyInPerPlayer, prizePerWinner: cfg.prizePerWinner, manches: cfg.manches, baseTarget: cfg.baseTarget, active: cfg.active },
    });
    res.json({ format: { ...cfg.toObject(), houseNet: houseNet(cfg) } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
