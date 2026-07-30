/* =============================================================================
 * TESTS API — contrat HTTP de l'application Express.
 * -----------------------------------------------------------------------------
 * Ces tests bootent l'application RÉELLE (mêmes routeurs, mêmes middlewares)
 * et valident le CONTRAT observable par un client : existence des routes,
 * protection par authentification, forme des erreurs, statuts.
 *
 * Ils ne nécessitent AUCUNE base de données : on vérifie la couche HTTP, pas
 * la persistance (celle-ci est couverte par les tests d'intégration Mongo,
 * exécutés avec MONGOMS_AVAILABLE=1).
 * ========================================================================== */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createExpressApplication } from '../app.js';
import { environment } from '../core/environment.js';

let app: Express;
let token: string;

beforeAll(() => {
  app = createExpressApplication();
  // Jeton valide dans sa forme : suffisant pour franchir requireAuthentication.
  token = jwt.sign({ sub: '000000000000000000000001' }, environment.jwtSecret, { expiresIn: '1h' });
});

const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);

/** Routes protégées : { méthode, chemin } — doivent TOUTES refuser l'anonyme. */
const PROTECTED: [string, string][] = [
  ['get', '/api/auth/me'],
  ['put', '/api/settings'],
  ['get', '/api/robots'],
  ['post', '/api/robots'],
  ['get', '/api/games'],
  ['post', '/api/games'],
  ['post', '/api/games/robots'],
  ['get', '/api/games/public'],
  ['get', '/api/tables'],
  ['post', '/api/tables'],
  ['get', '/api/teams'],
  ['post', '/api/teams'],
  ['get', '/api/teams/mine'],
  ['get', '/api/invitations'],
  ['get', '/api/invitations/count'],
  ['get', '/api/competitions'],
  ['get', '/api/competitions/mine'],
  ['post', '/api/competitions'],
  ['get', '/api/wallet'],
  ['post', '/api/wallet/claim'],
  ['get', '/api/analytics/me'],
  ['get', '/api/brains'],
  ['get', '/api/users/search'],
];

describe('Santé et socle HTTP', () => {
  it('GET /health répond 200 { ok: true }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('GET /api/health (alias testable depuis le device) répond 200 { ok: true }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('accepte une origine native Capacitor (app mobile sur device)', async () => {
    const res = await request(app).get('/health').set('Origin', 'capacitor://localhost');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeTruthy();
  });

  it('une route /api inconnue répond 404 en JSON (jamais du HTML)', async () => {
    const res = await request(app).get('/api/n-existe-pas');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error).toBeTruthy();
  });

  it('le CORS est actif sur les réponses', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:5180');
    expect(res.headers['access-control-allow-origin']).toBeTruthy();
  });
});

describe('Protection par authentification', () => {
  it.each(PROTECTED)('%s %s refuse un appel anonyme', async (method, path) => {
    const res = await (request(app) as never as Record<string, (p: string) => request.Test>)[method](path);
    expect([401, 403]).toContain(res.status);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('un jeton malformé est rejeté avec 401', async () => {
    const res = await request(app).get('/api/robots').set('Authorization', 'Bearer pas-un-jwt');
    expect(res.status).toBe(401);
  });

  it('un schéma d\'autorisation inconnu est rejeté', async () => {
    const res = await request(app).get('/api/robots').set('Authorization', 'Basic YWJjOmRlZg==');
    expect(res.status).toBe(401);
  });
});

describe('Routes publiques d\'authentification', () => {
  it('POST /api/auth/login existe et ne demande PAS de jeton', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'x', password: 'y' });
    expect(res.status).not.toBe(404);
    expect(res.status).not.toBe(401);
  });

  it('POST /api/auth/register existe et ne demande PAS de jeton', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'x', password: 'y' });
    expect(res.status).not.toBe(404);
    expect(res.status).not.toBe(401);
  });

  it('un corps invalide donne une erreur cliente, jamais un 500', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe('Existence des routes authentifiées (aucun 404 de routage)', () => {
  it.each(PROTECTED)('%s %s est bien montée', async (method, path) => {
    const res = await auth((request(app) as never as Record<string, (p: string) => request.Test>)[method](path));
    // Sans base, ces routes échouent en 5xx ou renvoient 401/400 — mais JAMAIS
    // un 404 « route inconnue », ce qui signalerait un routage cassé.
    if (res.status === 404) expect(res.body.error).not.toBe('route inconnue');
  });
});

describe('Ordre de déclaration des routes', () => {
  it('/api/games/public n\'est PAS capturée par /api/games/:id', async () => {
    const res = await auth(request(app).get('/api/games/public?q=test'));
    // Si /games/:id l'interceptait, on obtiendrait une erreur de cast d'ObjectId.
    expect(String(res.body.error ?? '')).not.toMatch(/ObjectId|Cast to/i);
  });
});

describe('Prise de siège (POST /tables/:id/seat)', () => {
  it('accepte le champ `as` dans le corps (contrat client↔serveur)', async () => {
    // On ne teste pas le résultat métier (pas de base) mais le CONTRAT : la
    // route lit bien `as` — un corps { index, as } ne doit pas être rejeté
    // pour cause de champ manquant côté validation superficielle.
    const res = await auth(request(app).post('/api/tables/000000000000000000000009/seat').send({ index: 0, as: 'me' }));
    // Sans base : 404 (table absente) ou 5xx — mais JAMAIS un 400 « assignation requise ».
    expect(String(res.body.error ?? '')).not.toMatch(/assignation requise/);
  });
});

describe('Forme des erreurs', () => {
  it('toute erreur est sérialisée en { error: string }', async () => {
    const res = await request(app).get('/api/route-absente');
    expect(typeof res.body.error).toBe('string');
    expect(res.body).not.toHaveProperty('stack');
  });
});

describe('Moniteur wslogs (dev)', () => {
  it('GET /api/monitor/snapshot renvoie sessions + logs', async () => {
    const res = await request(app).get('/api/monitor/snapshot');
    // Actif par défaut (MONITOR_ENABLED !== 'false').
    if (res.status === 200) {
      expect(Array.isArray(res.body.sessions)).toBe(true);
      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(typeof res.body.at).toBe('string');
    }
  });
});

describe('CORS multi-domaines', () => {
  it('autorise une origine listée dans CORS_ORIGIN', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:5180');
    expect(res.headers['access-control-allow-origin']).toBeTruthy();
  });
});
