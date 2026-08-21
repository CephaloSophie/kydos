/* =============================================================================
 * BACK-OFFICE · routes/robotAvatars.ts — CRUD du catalogue d'avatars robots.
 * -----------------------------------------------------------------------------
 * Un avatar = une variante de couleur de la mascotte, débloquée sur une plage
 * de niveau joueur [minLevel, maxLevel]. Les presets `builtIn` ne sont pas
 * supprimables. Servis à l'app mobile par le serveur de jeu.
 * ========================================================================== */
import { Router } from 'express';
import mongoose from 'mongoose';
import type { AdminRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/auditLog.js';
import { normalizeHex } from '../tableThemeColors.js';
import { resolveStatus } from '../statusSync.js';

const router = Router();

const BUILTIN = [
  { key: 'atne', name: 'Atné', accentColor: '#7ecb98', minLevel: 0, order: 0 },
  { key: 'bato', name: 'Bâto', accentColor: '#e6c46a', minLevel: 0, order: 1 },
  { key: 'celi', name: 'Céli', accentColor: '#e85d70', minLevel: 0, order: 2 },
  { key: 'doxa', name: 'Doxa', accentColor: '#9db4dd', minLevel: 0, order: 3 },
  { key: 'eris', name: 'Éris', accentColor: '#b39ddb', minLevel: 0, order: 4 },
];

async function ensureSeeded(Model: any) {
  if (await Model.estimatedDocumentCount() > 0) return;
  await Model.create(BUILTIN.map((a) => ({ ...a, maxLevel: null, builtIn: true, active: true, status: 'active' })));
}

const num = (v: any, min: number, max: number, cur: number) => {
  const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : cur;
};
const slugify = (s: string) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'avatar';

router.get('/', async (_req, res) => {
  try {
    const Model = mongoose.model('RobotAvatar');
    await ensureSeeded(Model);
    const avatars = await Model.find({}).sort({ order: 1, createdAt: 1 }).lean();
    res.json({ avatars });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const doc: any = await mongoose.model('RobotAvatar').findById(req.params.id).lean();
    if (!doc) { res.status(404).json({ error: 'Avatar introuvable' }); return; }
    res.json({ avatar: doc });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model('RobotAvatar');
    await ensureSeeded(Model);
    const b = req.body || {};
    if (!b.name || String(b.name).trim().length < 2) { res.status(400).json({ error: 'Le nom doit contenir au moins 2 caractères' }); return; }
    // Clé unique dérivée du nom.
    let key = slugify(b.key || b.name);
    if (await Model.exists({ key })) key = `${key}-${Date.now().toString(36).slice(-4)}`;
    const count = await Model.countDocuments();
    const doc = await Model.create({
      key,
      name: String(b.name).trim(),
      accentColor: normalizeHex(b.accentColor, '#7ecb98'),
      minLevel: num(b.minLevel, 0, 9999, 0),
      maxLevel: (b.maxLevel === null || b.maxLevel === '' || b.maxLevel === undefined) ? null : num(b.maxLevel, 0, 9999, 0),
      builtIn: false,
      ...resolveStatus({ status: b.status, active: b.active }, { status: 'draft', active: false }),
      order: num(b.order, 0, 999, count),
    });
    await logAudit(req.adminId!, 'robotAvatar.create', String(doc._id), { after: { key: doc.key, name: doc.name } });
    res.json({ avatar: doc.toObject() });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model('RobotAvatar');
    const doc: any = await Model.findById(req.params.id);
    if (!doc) { res.status(404).json({ error: 'Avatar introuvable' }); return; }
    const b = req.body || {};
    if (b.name !== undefined) doc.name = String(b.name).trim();
    if (b.accentColor !== undefined) doc.accentColor = normalizeHex(b.accentColor, doc.accentColor);
    if (b.minLevel !== undefined) doc.minLevel = num(b.minLevel, 0, 9999, doc.minLevel);
    if (b.maxLevel !== undefined) doc.maxLevel = (b.maxLevel === null || b.maxLevel === '') ? null : num(b.maxLevel, 0, 9999, doc.maxLevel ?? 0);
    if ((b.status !== undefined) || (b.active !== undefined)) {
      const s = resolveStatus({ status: b.status, active: b.active }, { status: doc.status, active: doc.active });
      doc.status = s.status; doc.active = s.active;
    }
    if (b.order !== undefined) doc.order = num(b.order, 0, 999, doc.order);
    await doc.save();
    await logAudit(req.adminId!, 'robotAvatar.update', String(doc._id), { after: { name: doc.name, active: doc.active } });
    res.json({ avatar: doc.toObject() });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/clone', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model('RobotAvatar');
    const src: any = await Model.findById(req.params.id).lean();
    if (!src) { res.status(404).json({ error: 'Avatar introuvable' }); return; }
    const count = await Model.countDocuments();
    let key = `${src.key}-copie`;
    if (await Model.exists({ key })) key = `${src.key}-${Date.now().toString(36).slice(-4)}`;
    const doc = await Model.create({
      key, name: `${src.name} (copie)`, accentColor: src.accentColor,
      minLevel: src.minLevel ?? 0, maxLevel: src.maxLevel ?? null,
      builtIn: false, status: 'draft', active: false, order: count,
    });
    await logAudit(req.adminId!, 'robotAvatar.clone', String(doc._id), { before: { source: String(src._id) } });
    res.json({ avatar: doc.toObject() });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model('RobotAvatar');
    const doc: any = await Model.findById(req.params.id);
    if (!doc) { res.status(404).json({ error: 'Avatar introuvable' }); return; }
    if (doc.builtIn) { res.status(400).json({ error: 'Un avatar intégré ne peut pas être supprimé.' }); return; }
    await Model.deleteOne({ _id: doc._id });
    await logAudit(req.adminId!, 'robotAvatar.delete', String(doc._id), { before: { key: doc.key } });
    res.json({ deleted: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
