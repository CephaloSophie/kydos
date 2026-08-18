import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

import './models.js';
import './middleware/auditLog.js';

import { requireAdmin } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import tournamentRoutes from './routes/tournaments.js';
import userRoutes from './routes/users.js';
import accountingRoutes from './routes/accounting.js';
import promoRoutes from './routes/promos.js';
import monitorRoutes from './routes/monitor.js';
import auditRoutes from './routes/audit.js';
import matchFormatRoutes from './routes/matchFormats.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://root:toor@127.0.0.1:27017/belote15?authSource=admin';
const PORT = parseInt(process.env.ADMIN_PORT || '3001');

const app = express();
app.use(cors());
app.use(express.json());

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans une minute.' },
});
app.use('/admin', adminLimiter);

app.use('/admin/auth', authRoutes);
app.use('/admin/tournaments', requireAdmin, tournamentRoutes);
app.use('/admin/users', requireAdmin, userRoutes);
app.use('/admin/accounting', requireAdmin, accountingRoutes);
app.use('/admin/promos', requireAdmin, promoRoutes);
app.use('/admin/monitor', requireAdmin, monitorRoutes);
app.use('/admin/audit', requireAdmin, auditRoutes);
app.use('/admin/match-formats', requireAdmin, matchFormatRoutes);

app.get('/admin/health', (_req, res) => {
  res.json({ status: 'ok', mongo: mongoose.connection.readyState === 1 });
});

await mongoose.connect(MONGO_URI);
console.log('Connected to MongoDB');

app.listen(PORT, () => {
  console.log(`Back-office API running on http://localhost:${PORT}`);
});
