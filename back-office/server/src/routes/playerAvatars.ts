/* =============================================================================
 * BACK-OFFICE · routes/playerAvatars.ts — CRUD des logos joueurs.
 * -----------------------------------------------------------------------------
 * Même rendu que les mascottes robots (mascotte paramétrique teintée), mais
 * pour les HUMAINS : choix libre (aucun niveau), collection indépendante. Les
 * logos `builtIn` ne sont pas supprimables.
 * ========================================================================== */
import { Router } from 'express';
import mongoose from 'mongoose';
import type { AdminRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/auditLog.js';
import { normalizeHex } from '../tableThemeColors.js';
import { resolveStatus } from '../statusSync.js';

const router = Router();
const MODEL = 'PlayerAvatar';

const BUILTIN = [
  { key: 'saphir', name: 'Saphir', accentColor: '#4f8ce0', order: 0 },
  { key: 'ambre', name: 'Ambre', accentColor: '#e0a63f', order: 1 },
  { key: 'rubis', name: 'Rubis', accentColor: '#e0556b', order: 2 },
  { key: 'jade', name: 'Jade', accentColor: '#3fae86', order: 3 },
  { key: 'amethyste', name: 'Améthyste', accentColor: '#a074d8', order: 4 },
  { key: 'onyx', name: 'Onyx', accentColor: '#8a95a6', order: 5 },
];

async function ensureSeeded(Model: any) {
  if (await Model.estimatedDocumentCount() > 0) return;
  await Model.create(BUILTIN.map((a) => ({ ...a, builtIn: true, active: true, status: 'active' })));
}

const num = (v: any, min: number, max: number, cur: number) => {
  const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : cur;
};
const EYE_STATES = ['open', 'wide', 'closed', 'wink-left', 'wink-right', 'closed-left', 'closed-right', 'wide-left', 'wide-right'];
const MOUTH_STATES = ['smile', 'grin', 'neutral', 'sad', 'angry', 'surprised'];
const eyesOf = (v: any, cur = 'open') => (EYE_STATES.includes(String(v)) ? String(v) : cur);
const mouthOf = (v: any, cur = 'smile') => (MOUTH_STATES.includes(String(v)) ? String(v) : cur);
const slugify = (s: string) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'logo';

router.get('/', async (_req, res) => {
  try {
    const Model = mongoose.model(MODEL);
    await ensureSeeded(Model);
    const avatars = await Model.find({}).sort({ order: 1, createdAt: 1 }).lean();
    res.json({ avatars });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const doc: any = await mongoose.model(MODEL).findById(req.params.id).lean();
    if (!doc) { res.status(404).json({ error: 'Logo introuvable' }); return; }
    res.json({ avatar: doc });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model(MODEL);
    await ensureSeeded(Model);
    const b = req.body || {};
    if (!b.name || String(b.name).trim().length < 2) { res.status(400).json({ error: 'Le nom doit contenir au moins 2 caractères' }); return; }
    let key = slugify(b.key || b.name);
    if (await Model.exists({ key })) key = `${key}-${Date.now().toString(36).slice(-4)}`;
    const count = await Model.countDocuments();
    const doc = await Model.create({
      key,
      name: String(b.name).trim(),
      accentColor: normalizeHex(b.accentColor, '#4f8ce0'),
      bodyColor: b.bodyColor ? normalizeHex(b.bodyColor, '#cfe0f5') : null,
      outlineColor: b.outlineColor ? normalizeHex(b.outlineColor, '#14283a') : null,
      antennas: num(b.antennas, 1, 5, 1),
      eyes: eyesOf(b.eyes),
      mouth: mouthOf(b.mouth),
      builtIn: false,
      ...resolveStatus({ status: b.status, active: b.active }, { status: 'draft', active: false }),
      order: num(b.order, 0, 999, count),
    });
    await logAudit(req.adminId!, 'playerAvatar.create', String(doc._id), { after: { key: doc.key, name: doc.name } });
    res.json({ avatar: doc.toObject() });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model(MODEL);
    const doc: any = await Model.findById(req.params.id);
    if (!doc) { res.status(404).json({ error: 'Logo introuvable' }); return; }
    const b = req.body || {};
    if (b.name !== undefined) doc.name = String(b.name).trim();
    if (b.accentColor !== undefined) doc.accentColor = normalizeHex(b.accentColor, doc.accentColor);
    if (b.bodyColor !== undefined) doc.bodyColor = b.bodyColor ? normalizeHex(b.bodyColor, doc.bodyColor || '#cfe0f5') : null;
    if (b.outlineColor !== undefined) doc.outlineColor = b.outlineColor ? normalizeHex(b.outlineColor, doc.outlineColor || '#14283a') : null;
    if (b.antennas !== undefined) doc.antennas = num(b.antennas, 1, 5, doc.antennas ?? 1);
    if (b.eyes !== undefined) doc.eyes = eyesOf(b.eyes, doc.eyes ?? 'open');
    if (b.mouth !== undefined) doc.mouth = mouthOf(b.mouth, doc.mouth ?? 'smile');
    if ((b.status !== undefined) || (b.active !== undefined)) {
      const s = resolveStatus({ status: b.status, active: b.active }, { status: doc.status, active: doc.active });
      doc.status = s.status; doc.active = s.active;
    }
    if (b.order !== undefined) doc.order = num(b.order, 0, 999, doc.order);
    await doc.save();
    await logAudit(req.adminId!, 'playerAvatar.update', String(doc._id), { after: { name: doc.name, active: doc.active } });
    res.json({ avatar: doc.toObject() });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/clone', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model(MODEL);
    const src: any = await Model.findById(req.params.id).lean();
    if (!src) { res.status(404).json({ error: 'Logo introuvable' }); return; }
    const count = await Model.countDocuments();
    let key = `${src.key}-copie`;
    if (await Model.exists({ key })) key = `${src.key}-${Date.now().toString(36).slice(-4)}`;
    const doc = await Model.create({
      key, name: `${src.name} (copie)`, accentColor: src.accentColor,
      bodyColor: src.bodyColor ?? null, outlineColor: src.outlineColor ?? null,
      antennas: src.antennas ?? 1, eyes: src.eyes ?? 'open', mouth: src.mouth ?? 'smile',
      builtIn: false, status: 'draft', active: false, order: count,
    });
    await logAudit(req.adminId!, 'playerAvatar.clone', String(doc._id), { before: { source: String(src._id) } });
    res.json({ avatar: doc.toObject() });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model(MODEL);
    const doc: any = await Model.findById(req.params.id);
    if (!doc) { res.status(404).json({ error: 'Logo introuvable' }); return; }
    if (doc.builtIn) { res.status(400).json({ error: 'Un logo intégré ne peut pas être supprimé.' }); return; }
    await Model.deleteOne({ _id: doc._id });
    await logAudit(req.adminId!, 'playerAvatar.delete', String(doc._id), { before: { key: doc.key } });
    res.json({ deleted: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
