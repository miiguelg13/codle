import cookieParser from 'cookie-parser';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { session } from './middleware/session.js';
import { api, errorHandler } from './routes/api.js';
import { admin } from './routes/admin.js';
import { auth, stats } from './routes/auth.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  const smallJson = express.json({ limit: '256kb' });
  const bigJson = express.json({ limit: '8mb' });
  app.use((req, res, next) => (req.path.startsWith('/api/admin') ? bigJson : smallJson)(req, res, next));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/admin', session, admin);
  app.use('/api/auth', session, auth);
  app.use('/api/stats', session, stats);
  app.use('/api', session, api);

  const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
