import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/summary', async (req, res) => {
  try {
    const HouseTransactionModel = mongoose.model('HouseTransaction');
    const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const transactions = await HouseTransactionModel.find({
      createdAt: { $gte: from, $lte: to },
    }).sort({ createdAt: -1 }).lean() as any[];

    let matchRake = 0;
    let tournamentEntries = 0;
    let tournamentPrizes = 0;

    const byDayMap = new Map<string, { matchRake: number; tournamentNet: number }>();

    for (const t of transactions) {
      const day = t.createdAt.toISOString().slice(0, 10);
      if (!byDayMap.has(day)) byDayMap.set(day, { matchRake: 0, tournamentNet: 0 });
      const dayData = byDayMap.get(day)!;

      switch (t.kind) {
        case 'match_rake':
          matchRake += t.amount;
          dayData.matchRake += t.amount;
          break;
        case 'tournament_entry':
          tournamentEntries += t.amount;
          dayData.tournamentNet += t.amount;
          break;
        case 'tournament_prize':
          tournamentPrizes += t.amount;
          dayData.tournamentNet += t.amount;
          break;
      }
    }

    const byDay = Array.from(byDayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      period: { from: from.toISOString(), to: to.toISOString() },
      totals: {
        matchRake,
        tournamentEntries,
        tournamentPrizes,
        net: matchRake + tournamentEntries + tournamentPrizes,
      },
      byDay,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const HouseTransactionModel = mongoose.model('HouseTransaction');
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.kind) filter.kind = req.query.kind;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from as string);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to as string);
    }

    const [transactions, total] = await Promise.all([
      HouseTransactionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      HouseTransactionModel.countDocuments(filter),
    ]);

    res.json({ transactions, total, page, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
