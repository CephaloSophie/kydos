/* =============================================================================
 * BACK-OFFICE · routes/tableThemes.ts — CRUD de la bibliothèque de thèmes.
 * -----------------------------------------------------------------------------
 * Un thème de table est une entité réutilisable (feutre + bordure + accent)
 * proposée à la création des tournois et des variantes de MATCH RAPIDE.
 * Les presets `builtIn` ne sont pas supprimables. Toutes les réponses
 * incluent `colors` (rendu résolu) pour l'aperçu direct dans l'IHM.
 * ========================================================================== */
import { Router } from 'express';
import mongoose from 'mongoose';
import type { AdminRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/auditLog.js';
import { resolveThemeColors, normalizeHex } from '../tableThemeColors.js';

const router = Router();

/** Presets intégrés (miroir du serveur de jeu) si la collection est vide. */
const BUILTIN = [
  { key: 'classic', name: 'Classique (vert)', order: 0, feltColor: '#1a5c3a', feltEdgeColor: '#0f3f27', railColor: '#6b3a1a', accentColor: '#f0c46a' },
  { key: 'acier', name: 'Acier (bleu)', order: 1, feltColor: '#1b3a63', feltEdgeColor: '#0a1c34', railColor: '#2f3a4a', accentColor: '#a8c5e8' },
  { key: 'hybride', name: 'Hybride (or)', order: 2, feltColor: '#6b5518', feltEdgeColor: '#3a2c08', railColor: '#4a3618', accentColor: '#f0c46a' },
  { key: 'royal', name: 'Royale (bordeaux)', order: 3, feltColor: '#5c1c2b', feltEdgeColor: '#2a0812', railColor: '#2a1418', accentColor: '#e28aa4' },
  { key: 'cosmos', name: 'Cosmos (indigo)', order: 4, feltColor: '#2a2350', feltEdgeColor: '#120e2c', railColor: '#3a2f5a', accentColor: '#b7a6ff' },
  { key: 'olympus', name: 'Olympe (marbre)', order: 5, feltColor: '#3a4a4f', feltEdgeColor: '#1a2427', railColor: '#5a5040', accentColor: '#e6d8a8' },
];

async function ensureSeeded(Model: any) {
  const count = await Model.estimatedDocumentCount();
  if (count > 0) return;
  await Model.create(BUILTIN.map((t) => ({ ...t, builtIn: true, active: true })));
}

/** Enrichit un thème avec son rendu de couleurs résolu (pour l'aperçu). */
function withColors(doc: any) {
  return {
    ...doc,
    colors: resolveThemeColors({
      feltColor: doc.feltColor, feltEdgeColor: doc.feltEdgeColor,
      railColor: doc.railColor, accentColor: doc.accentColor,
    }),
  };
}

// Liste (option ?active=1 pour ne renvoyer que les thèmes proposables).
router.get('/', async (req, res) => {
  try {
    const Model = mongoose.model('TableTheme');
    await ensureSeeded(Model);
    const filter: any = {};
    if (req.query.active === '1') filter.active = true;
    const themes = await Model.find(filter).sort({ order: 1, createdAt: 1 }).lean();
    res.json({ themes: themes.map(withColors) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Création d'un thème personnalisé.
router.post('/', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model('TableTheme');
    await ensureSeeded(Model);
    const b = req.body || {};
    if (!b.name || String(b.name).trim().length < 2) {
      res.status(400).json({ error: 'Le nom doit contenir au moins 2 caractères' });
      return;
    }
    const count = await Model.countDocuments();
    const doc = await Model.create({
      name: String(b.name).trim(),
      key: null, builtIn: false,
      feltColor: normalizeHex(b.feltColor, '#1a5c3a'),
      feltEdgeColor: b.feltEdgeColor ? normalizeHex(b.feltEdgeColor, '#0f3f27') : null,
      railColor: normalizeHex(b.railColor, '#6b3a1a'),
      accentColor: b.accentColor ? normalizeHex(b.accentColor, '#f0c46a') : null,
      active: b.active !== false,
      order: Number.isFinite(Number(b.order)) ? Number(b.order) : count,
    });
    await logAudit(req.adminId!, 'tableTheme.create', String(doc._id), { after: { name: doc.name } });
    res.json({ theme: withColors(doc.toObject()) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Modification (les presets intégrés restent modifiables sauf leur nature).
router.put('/:id', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model('TableTheme');
    const doc: any = await Model.findById(req.params.id);
    if (!doc) { res.status(404).json({ error: 'Thème introuvable' }); return; }
    const b = req.body || {};
    if (b.name !== undefined) doc.name = String(b.name).trim();
    if (b.feltColor !== undefined) doc.feltColor = normalizeHex(b.feltColor, doc.feltColor);
    if (b.feltEdgeColor !== undefined) doc.feltEdgeColor = b.feltEdgeColor ? normalizeHex(b.feltEdgeColor, doc.feltEdgeColor) : null;
    if (b.railColor !== undefined) doc.railColor = normalizeHex(b.railColor, doc.railColor);
    if (b.accentColor !== undefined) doc.accentColor = b.accentColor ? normalizeHex(b.accentColor, doc.accentColor) : null;
    if (b.active !== undefined) doc.active = !!b.active;
    if (b.order !== undefined && Number.isFinite(Number(b.order))) doc.order = Number(b.order);
    await doc.save();
    await logAudit(req.adminId!, 'tableTheme.update', String(doc._id), { after: { name: doc.name, active: doc.active } });
    res.json({ theme: withColors(doc.toObject()) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Suppression (interdite pour un preset intégré).
router.delete('/:id', async (req: AdminRequest, res) => {
  try {
    const Model = mongoose.model('TableTheme');
    const doc: any = await Model.findById(req.params.id);
    if (!doc) { res.status(404).json({ error: 'Thème introuvable' }); return; }
    if (doc.builtIn) { res.status(400).json({ error: 'Un thème intégré ne peut pas être supprimé.' }); return; }
    await Model.deleteOne({ _id: doc._id });
    await logAudit(req.adminId!, 'tableTheme.delete', String(doc._id), { before: { name: doc.name } });
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
