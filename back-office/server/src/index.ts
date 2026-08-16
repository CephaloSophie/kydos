import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import '../../server/src/modules/user/user.model.js';
import '../../server/src/modules/robot/robot.model.js';
import '../../server/src/modules/game/game.model.js';
import '../../server/src/modules/matches/match.model.js';
import '../../server/src/modules/tournaments/tournament.model.js';
import '../../server/src/modules/houseAccounting/houseTransaction.model.js';
import '../../server/src/modules/promo/promo.model.js';

import { requireAdmin } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import tournamentRoutes from './routes/tournaments.js';
import userRoutes from './routes/users.js';
import accountingRoutes from './routes/accounting.js';
import promoRoutes from './routes/promos.js';
import monitorRoutes from './routes/monitor.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/beloteKydosV14';
const PORT = parseInt(process.env.ADMIN_PORT || '3001');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/admin/auth', authRoutes);
app.use('/admin/tournaments', requireAdmin, tournamentRoutes);
app.use('/admin/users', requireAdmin, userRoutes);
app.use('/admin/accounting', requireAdmin, accountingRoutes);
app.use('/admin/promos', requireAdmin, promoRoutes);
app.use('/admin/monitor', requireAdmin, monitorRoutes);

app.get('/admin/health', (_req, res) => {
  res.json({ status: 'ok', mongo: mongoose.connection.readyState === 1 });
});

await mongoose.connect(MONGO_URI);
console.log('Connected to MongoDB');

app.listen(PORT, () => {
  console.log(`Back-office API running on http://localhost:${PORT}`);
});
