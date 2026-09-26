import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { MAX_CODE_LENGTH } from '../harness/runner.js';
import { LANGUAGES } from '../harness/types.js';
import { isAdminUser, User } from '../models/User.js';
import {
  computeOutputs,
  createProblem,
  deleteProblem,
  getProblemFull,
  listProblems,
  overview,
  setStatus,
  tryCode,
  updateProblem,
} from '../services/admin.js';
import { HttpError } from '../services/game.js';
import { importRetos } from '../services/importer.js';

export const admin = Router();

type Handler = (req: Request, res: Response) => Promise<unknown>;
const h = (fn: Handler) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res)
    .then((data) => {
      if (!res.headersSent) res.json(data);
    })
    .catch(next);

// Solo usuarios administradores.
admin.use((req, _res, next) => {
  const id = req.playerId.startsWith('u:') ? req.playerId.slice(2) : null;
  if (!id) return next(new HttpError(401, 'login_required'));
  User.findById(id)
    .select('email isAdmin')
    .lean()
    .then((u) => next(u && isAdminUser(u) ? undefined : new HttpError(403, 'forbidden')))
    .catch(next);
});

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

admin.get('/overview', h(async () => overview()));

admin.get(
  '/problems',
  h(async (req) =>
    listProblems({ status: str(req.query.status), from: str(req.query.from), to: str(req.query.to), search: str(req.query.q) }),
  ),
);
admin.get('/problems/:id', h(async (req) => getProblemFull(req.params.id)));
admin.post(
  '/problems',
  h(async (req, res) => {
    res.status(201);
    return createProblem(req.body);
  }),
);
admin.put('/problems/:id', h(async (req) => updateProblem(req.params.id, req.body)));
admin.post(
  '/problems/:id/status',
  h(async (req) => {
    const status = z.enum(['draft', 'pending', 'published', 'rejected']).safeParse(req.body?.status);
    if (!status.success) throw new HttpError(400, 'invalid_status');
    return setStatus(req.params.id, status.data);
  }),
);
admin.delete('/problems/:id', h(async (req) => deleteProblem(req.params.id)));

admin.post('/tools/compute-outputs', h(async (req) => computeOutputs(req.body?.problem)));
admin.post(
  '/tools/try',
  h(async (req) => {
    const b = z
      .object({ language: z.enum(LANGUAGES), code: z.string().min(1).max(MAX_CODE_LENGTH) })
      .safeParse(req.body);
    if (!b.success) throw new HttpError(400, 'invalid_body');
    return tryCode(req.body?.problem, b.data.language, b.data.code);
  }),
);
admin.post('/tools/import', h(async () => importRetos()));
