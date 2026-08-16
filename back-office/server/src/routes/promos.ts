import { Router } from 'express';
import mongoose from 'mongoose';
import type { AdminRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/auditLog.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const PromoCodeModel = mongoose.model('PromoCode');
    const promos = await PromoCodeModel.find({}).sort({ createdAt: -1 }).lean();
    res.json({ promos });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AdminRequest, res) => {
  try {
    const { code, tokens, expiresAt, maxRedemptions, label } = req.body;
    if (!code || !tokens || !expiresAt) {
      res.status(400).json({ error: 'Champs requis: code, tokens, expiresAt' });
      return;
    }
    const normalized = code.replace(/\D/g, '');
    if (normalized.length !== 12) {
      res.status(400).json({ error: 'Le code doit contenir exactement 12 chiffres' });
      return;
    }
    const PromoCodeModel = mongoose.model('PromoCode');
    const promo = await PromoCodeModel.create({
      code: normalized,
      tokens,
      expiresAt: new Date(expiresAt),
      maxRedemptions: maxRedemptions || 1,
      label: label || '',
    });
    await logAudit(req.adminId!, 'promo.create', promo._id.toString(), {
      after: { code: normalized, tokens, maxRedemptions: maxRedemptions || 1 },
    });
    res.json({ promo });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ error: 'Ce code existe déjà' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AdminRequest, res) => {
  try {
    const PromoCodeModel = mongoose.model('PromoCode');
    const promo = await PromoCodeModel.findById(req.params.id) as any;
    if (!promo) {
      res.status(404).json({ error: 'Code promo non trouvé' });
      return;
    }
    const { tokens, expiresAt, maxRedemptions, label, active } = req.body;
    if (tokens !== undefined) promo.tokens = tokens;
    if (expiresAt !== undefined) promo.expiresAt = new Date(expiresAt);
    if (maxRedemptions !== undefined) promo.maxRedemptions = maxRedemptions;
    if (label !== undefined) promo.label = label;
    if (active !== undefined) promo.active = active;
    await promo.save();
    await logAudit(req.adminId!, 'promo.update', req.params.id, {
      after: { tokens: promo.tokens, active: promo.active, maxRedemptions: promo.maxRedemptions },
    });
    res.json({ promo });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AdminRequest, res) => {
  try {
    const PromoCodeModel = mongoose.model('PromoCode');
    const promo = await PromoCodeModel.findById(req.params.id) as any;
    if (!promo) {
      res.status(404).json({ error: 'Code promo non trouvé' });
      return;
    }
    await PromoCodeModel.deleteOne({ _id: promo._id });
    await logAudit(req.adminId!, 'promo.delete', req.params.id, {
      before: { code: promo.code, tokens: promo.tokens },
    });
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
