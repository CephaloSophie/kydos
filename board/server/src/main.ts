/* =============================================================================
 * MAIN — Serveur Bord (API JSON pour le backoffice de tâches).
 * ========================================================================== */
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { environment } from './core/environment.js';
import { connectMongo } from './core/mongo.js';
import { HttpError } from './core/HttpError.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { taskRouter } from './modules/tasks/task.routes.js';
import { archiveRouter } from './modules/archive/archive.routes.js';

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl/postman
    if (environment.corsOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`origine CORS non autorisée : ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'bord-api', version: '1.0.0' }));

app.use('/api', authRouter);
app.use('/api', taskRouter);
app.use('/api', archiveRouter);

// Middleware d'erreur global — traduit les HttpError en réponse propre.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) { res.status(err.status).json({ error: err.message }); return; }
  // eslint-disable-next-line no-console
  console.error('[bord] erreur interne :', err);
  res.status(500).json({ error: 'erreur interne' });
};
app.use(errorHandler);

async function bootstrap(): Promise<void> {
  await connectMongo();
  app.listen(environment.port, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`[bord] API prête sur http://0.0.0.0:${environment.port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[bord] démarrage impossible :', error);
  process.exit(1);
});
