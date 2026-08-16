import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/snapshot', async (req, res) => {
  try {
    const UserModel = mongoose.model('User');
    const MatchModel = mongoose.model('Match');
    const TournamentModel = mongoose.model('Tournament');

    const [totalUsers, activeUsers, activeMatches, liveTournaments, matchesByFormat] = await Promise.all([
      UserModel.countDocuments({}),
      UserModel.countDocuments({ activeSession: { $ne: null } }),
      MatchModel.countDocuments({ status: { $in: ['queued', 'pairing', 'running'] } }),
      TournamentModel.countDocuments({ status: 'live' }),
      MatchModel.aggregate([
        { $match: { status: { $in: ['queued', 'pairing', 'running'] } } },
        { $group: { _id: '$format', count: { $sum: 1 } } },
      ]),
    ]);

    const queueSizes: Record<string, number> = {};
    for (const m of matchesByFormat) {
      queueSizes[m._id] = m.count;
    }

    res.json({
      at: new Date().toISOString(),
      totalUsers,
      activeUsers,
      activeMatches,
      liveTournaments,
      queueSizes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/matches', async (req, res) => {
  try {
    const MatchModel = mongoose.model('Match');
    const matches = await MatchModel.find({ status: { $in: ['queued', 'pairing', 'running'] } })
      .sort({ queuedAt: -1 })
      .limit(50)
      .lean();
    res.json({ matches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
