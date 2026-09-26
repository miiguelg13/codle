import cookieParser from 'cookie-parser';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { session } from './middleware/session.js';
import { api, errorHandler } from './routes/api.js';
import { admin } from './routes/admin.js';
import { auth, stats } from './routes/auth.js';
import { retos } from './routes/retos.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  const smallJson = express.json({ limit: '256kb' });
  const bigJson = express.json({ limit: '8mb' });
  app.use((req, res, next) =>
    (req.path.startsWith('/api/admin') || req.path.startsWith('/api/retos') ? bigJson : smallJson)(req, res, next),
  );

  // Cabeceras de seguridad básicas
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (config.isProd) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    next();
  });
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/admin', session, admin);
  app.use('/api/retos', session, retos);
  app.use('/api/auth', session, auth);
  app.use('/api/stats', session, stats);
  app.use('/api', session, api);

  const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (existsSync(clientDist)) {
    app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(clientDist, { index: false }));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
