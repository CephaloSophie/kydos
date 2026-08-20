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
  { format: 'duo_steel', label: 'Duo d’acier', subtitle: 'Un affrontement 100 % en coulisses.', buyInPerPlayer: 200, prizePerWinner: 150, manches: 2, baseTarget: 1500, labelTarget: 2000, openingBidMin: 90, countBelote: true, clockwise: false, color: '#3f6ea1', icon: '♦', minLevel: 0, maxLevel: null, active: true, order: 0 },
  { format: 'hybrid_alliance', label: 'Alliance hybride', subtitle: 'Vous + votre robot, tous ensemble.', buyInPerPlayer: 150, prizePerWinner: 225, manches: 2, baseTarget: 1500, labelTarget: 2000, openingBidMin: 90, countBelote: true, clockwise: false, color: '#c99c3f', icon: '♠', minLevel: 0, maxLevel: null, active: true, order: 1 },
  { format: 'royal_square', label: 'Carrée royale', subtitle: 'Quatre humains, deux équipes, une couronne.', buyInPerPlayer: 100, prizePerWinner: 150, manches: 2, baseTarget: 1500, labelTarget: 2000, openingBidMin: 90, countBelote: true, clockwise: false, color: '#b0384a', icon: '♥', minLevel: 0, maxLevel: null, active: true, order: 2 },
];

let legacyIndexChecked = false;

/** v16 — Supprime l'ancien index UNIQUE `format_1` (bloque le multi-variantes). */
async function dropLegacyUniqueIndex(Model: any) {
  if (legacyIndexChecked) return;
  legacyIndexChecked = true;
  try {
    const indexes = await Model.collection.indexes();
    if (indexes.find((i: any) => i.name === 'format_1' && i.unique)) {
      await Model.collection.dropIndex('format_1');
    }
  } catch { /* absent : rien à faire */ }
}

async function ensureSeeded() {
  const Model = mongoose.model('MatchFormatConfig');
  await dropLegacyUniqueIndex(Model);
  // Seed initial uniquement si la collection est vide (sinon on préserve les
  // variantes existantes créées par l'admin).
  const count = await Model.estimatedDocumentCount();
  if (count > 0) return;
  for (const d of DEFAULTS) await Model.create(d);
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

const num = (v: any, min: number, max: number, cur: number) => {
  const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : cur;
};

const VALID_FORMATS = ['duo_steel', 'hybrid_alliance', 'royal_square'];

// v16 — Créer une NOUVELLE variante d'un format (mise/niveau/titre propres).
router.post('/', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model('MatchFormatConfig');
    const { format } = req.body;
    if (!VALID_FORMATS.includes(format)) { res.status(400).json({ error: 'Format invalide' }); return; }
    const base = DEFAULTS.find(d => d.format === format)!;
    const count = await Model.countDocuments({ format });
    const b = req.body;
    const cfg = await Model.create({
      format,
      label: b.label ? String(b.label) : `${base.label} #${count + 1}`,
      subtitle: b.subtitle !== undefined ? String(b.subtitle) : base.subtitle,
      buyInPerPlayer: num(b.buyInPerPlayer, 0, 1_000_000, base.buyInPerPlayer),
      prizePerWinner: num(b.prizePerWinner, 0, 1_000_000, base.prizePerWinner),
      manches: [1, 2, 4].includes(Number(b.manches)) ? Number(b.manches) : base.manches,
      baseTarget: num(b.baseTarget, 100, 100_000, base.baseTarget),
      labelTarget: num(b.labelTarget, 100, 100_000, base.labelTarget),
      color: b.color ? String(b.color) : base.color,
      icon: b.icon ? String(b.icon) : base.icon,
      minLevel: num(b.minLevel, 0, 9999, 0),
      maxLevel: (b.maxLevel === null || b.maxLevel === '' || b.maxLevel === undefined) ? null : num(b.maxLevel, 0, 9999, 0),
      autoRejoinSec: num(b.autoRejoinSec, 0, 60, 5),
      // v17 — règles de belote configurables.
      openingBidMin: num(b.openingBidMin, 80, 180, 90),
      countBelote: b.countBelote !== false,
      clockwise: b.clockwise === true,
      active: b.active !== false,
      order: num(b.order, 0, 999, count),
    });
    await logAudit(req.adminId!, 'matchFormat.create', String(cfg._id), { after: { format, label: cfg.label, buyInPerPlayer: cfg.buyInPerPlayer } });
    res.json({ format: { ...cfg.toObject(), houseNet: houseNet(cfg) } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Modifier une variante par son _id.
router.put('/:id', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model('MatchFormatConfig');
    const cfg = await Model.findById(req.params.id) as any;
    if (!cfg) { res.status(404).json({ error: 'Variante introuvable' }); return; }

    const { label, subtitle, buyInPerPlayer, prizePerWinner, manches, baseTarget, labelTarget, color, icon, minLevel, maxLevel, autoRejoinSec, openingBidMin, countBelote, clockwise, active, order } = req.body;
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
    if (autoRejoinSec !== undefined) cfg.autoRejoinSec = num(autoRejoinSec, 0, 60, cfg.autoRejoinSec ?? 5);
    if (openingBidMin !== undefined) cfg.openingBidMin = num(openingBidMin, 80, 180, cfg.openingBidMin ?? 90);
    if (countBelote !== undefined) cfg.countBelote = !!countBelote;
    if (clockwise !== undefined) cfg.clockwise = !!clockwise;
    if (active !== undefined) cfg.active = !!active;
    if (order !== undefined) cfg.order = num(order, 0, 999, cfg.order);
    await cfg.save();

    await logAudit(req.adminId!, 'matchFormat.update', String(cfg._id), {
      after: { buyInPerPlayer: cfg.buyInPerPlayer, prizePerWinner: cfg.prizePerWinner, manches: cfg.manches, minLevel: cfg.minLevel, active: cfg.active },
    });
    res.json({ format: { ...cfg.toObject(), houseNet: houseNet(cfg) } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une variante.
router.delete('/:id', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model('MatchFormatConfig');
    const cfg = await Model.findById(req.params.id) as any;
    if (!cfg) { res.status(404).json({ error: 'Variante introuvable' }); return; }
    await Model.deleteOne({ _id: cfg._id });
    await logAudit(req.adminId!, 'matchFormat.delete', String(cfg._id), { before: { format: cfg.format, label: cfg.label } });
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
