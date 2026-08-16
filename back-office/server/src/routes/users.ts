import { Router } from 'express';
import mongoose from 'mongoose';
import type { AdminRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/auditLog.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const UserModel = mongoose.model('User');
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    const search = req.query.search as string;
    if (search) {
      filter.username = { $regex: search, $options: 'i' };
    }
    if (req.query.vip === 'true') {
      filter.vipExpiresAt = { $gt: new Date() };
    } else if (req.query.vip === 'false') {
      filter.$or = [{ vipExpiresAt: null }, { vipExpiresAt: { $lte: new Date() } }];
    }
    if (req.query.minBalance) {
      filter['wallet.tokens'] = { $gte: parseInt(req.query.minBalance as string) };
    }
    if (req.query.active === 'true') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filter.updatedAt = { $gte: thirtyDaysAgo };
    }

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select('-passwordHash -wallet.transactions')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);
    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const UserModel = mongoose.model('User');
    const RobotModel = mongoose.model('Robot');
    const GameModel = mongoose.model('Game');

    const user = await UserModel.findById(req.params.id).select('-passwordHash').lean() as any;
    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }
    const [robots, recentGames] = await Promise.all([
      RobotModel.find({ owner: user._id }).lean(),
      GameModel.find({ 'participants.user': user._id })
        .sort({ finishedAt: -1 })
        .limit(20)
        .lean(),
    ]);
    res.json({ user, robots, recentGames });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/credit', async (req: AdminRequest, res) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Montant invalide' });
      return;
    }
    const UserModel = mongoose.model('User');
    const user = await UserModel.findById(req.params.id) as any;
    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }
    user.wallet.tokens += amount;
    user.wallet.transactions.push({
      kind: 'refund',
      amount,
      balance: user.wallet.tokens,
      at: new Date(),
    });
    if (user.wallet.transactions.length > 200) {
      user.wallet.transactions = user.wallet.transactions.slice(-200);
    }
    await user.save();
    await logAudit(req.adminId!, 'user.credit', req.params.id, {
      after: { amount, reason, newBalance: user.wallet.tokens },
    });
    res.json({ newBalance: user.wallet.tokens });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/ban', async (req: AdminRequest, res) => {
  try {
    const UserModel = mongoose.model('User');
    const result = await UserModel.updateOne(
      { _id: req.params.id },
      { $set: { role: 'banned' } },
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }
    await logAudit(req.adminId!, 'user.ban', req.params.id, {
      after: { role: 'banned' },
    });
    res.json({ banned: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
