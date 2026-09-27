import { Router, type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { MAX_CODE_LENGTH } from '../harness/runner.js';
import { LANGUAGES, VALUE_TYPES } from '../harness/types.js';
import { isValidDate, msUntilNextDay, today } from '../services/dates.js';
import { getArchive, getCalendar, getDay, getProblem, HttpError, runExamples, submit } from '../services/game.js';

export const api = Router();

type Handler = (req: Request, res: Response) => Promise<unknown>;
const h = (fn: Handler) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res)
    .then((data) => {
      if (!res.headersSent) res.json(data);
    })
    .catch(next);

const codeBody = z.object({
  language: z.enum(LANGUAGES),
  code: z.string().min(1).max(MAX_CODE_LENGTH),
});

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) throw new HttpError(400, 'invalid_body', r.error.issues.map((i) => i.message).join('; '));
  return r.data;
}

const byPlayer = (req: Request) => req.playerId ?? req.ip ?? 'anon';
const runLimiter = rateLimit({
  windowMs: 60_000,
  limit: config.runLimitPerMinute,
  keyGenerator: byPlayer,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const submitLimiter = rateLimit({
  windowMs: 60_000,
  limit: config.submitLimitPerMinute,
  keyGenerator: byPlayer,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

api.get(
  '/meta',
  h(async () => ({
    today: today(),
    msUntilNextDay: msUntilNextDay(),
    maxAttempts: config.maxAttempts,
    languages: LANGUAGES,
    valueTypes: VALUE_TYPES,
  })),
);

api.get(
  '/calendar',
  h(async (req) => getCalendar(req.playerId)),
);

api.get(
  '/archive',
  h(async (req) => getArchive(req.playerId)),
);

api.get(
  '/days/:date',
  h(async (req) => {
    const date = req.params.date === 'today' ? today() : req.params.date;
    if (!isValidDate(date)) throw new HttpError(400, 'invalid_date');
    return getDay(date, req.playerId);
  }),
);

api.get(
  '/problems/:id',
  h(async (req) => getProblem(req.params.id, req.playerId)),
);

const ipLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });

api.post(
  '/problems/:id/run',
  ipLimiter,
  runLimiter,
  h(async (req) => {
    const { language, code } = parseBody(codeBody, req.body);
    return runExamples(req.params.id, language, code);
  }),
);

api.post(
  '/problems/:id/submit',
  ipLimiter,
  submitLimiter,
  h(async (req) => {
    const { language, code } = parseBody(codeBody, req.body);
    return submit(req.params.id, req.playerId, language, code);
  }),
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }
  if (err instanceof Error && err.name === 'ExecutorQuotaError') {
    res.status(503).json({ error: 'executor_quota', message: err.message });
    return;
  }
  if ((err as { type?: string })?.type === 'entity.too.large') {
    res.status(413).json({ error: 'too_large' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
}
