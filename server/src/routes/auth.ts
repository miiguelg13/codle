import { Router, type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { setSessionCookie, startGuestSession } from '../middleware/session.js';
import { publicUser, User } from '../models/User.js';
import { getDummyHash, hashPassword, mergeGuestProgress, verifyPassword } from '../services/auth.js';
import { HttpError } from '../services/game.js';
import { getStats, getStreaks } from '../services/stats.js';

export const auth = Router();

type Handler = (req: Request, res: Response) => Promise<unknown>;
const h = (fn: Handler) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res)
    .then((data) => {
      if (!res.headersSent) res.json(data);
    })
    .catch(next);

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    const issue = r.error.issues[0];
    throw new HttpError(400, `invalid_${String(issue?.path[0] ?? 'body')}`, issue?.message);
  }
  return r.data;
}

const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

const registerBody = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.-]{3,20}$/, '3-20 caracteres: letras, números, "_", "." o "-"'),
  password: z.string().min(8).max(200),
});

const loginBody = z.object({
  login: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
});

const userIdOf = (pid: string) => (pid.startsWith('u:') ? pid.slice(2) : null);

async function currentUser(req: Request) {
  const id = userIdOf(req.playerId);
  if (!id) return null;
  return User.findById(id).select('email username isAdmin').lean();
}

auth.get(
  '/me',
  h(async (req, res) => {
    const user = await currentUser(req);
    if (userIdOf(req.playerId) && !user) {
      startGuestSession(req, res);
    }
    return { user: user ? publicUser(user) : null, streak: await getStreaks(req.playerId) };
  }),
);

auth.post(
  '/register',
  authLimiter,
  h(async (req, res) => {
    const { email, username, password } = parseBody(registerBody, req.body);
    if (await User.exists({ email })) throw new HttpError(409, 'email_taken');
    if (await User.exists({ usernameLower: username.toLowerCase() })) throw new HttpError(409, 'username_taken');
    let user;
    try {
      user = await User.create({
        email,
        username,
        usernameLower: username.toLowerCase(),
        passwordHash: await hashPassword(password),
        lastLoginAt: new Date(),
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw new HttpError(409, 'username_taken');
      throw err;
    }
    const pid = `u:${user._id}`;
    const merged = await mergeGuestProgress(req.playerId, pid);
    setSessionCookie(res, pid);
    res.status(201);
    return { user: publicUser(user), merged };
  }),
);

auth.post(
  '/login',
  authLimiter,
  h(async (req, res) => {
    const { login, password } = parseBody(loginBody, req.body);
    const query = login.includes('@') ? { email: login.toLowerCase() } : { usernameLower: login.toLowerCase() };
    const user = await User.findOne(query);
    const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !ok) throw new HttpError(401, 'invalid_credentials');
    user.lastLoginAt = new Date();
    await user.save();
    const pid = `u:${user._id}`;
    const merged = await mergeGuestProgress(req.playerId, pid);
    setSessionCookie(res, pid);
    return { user: publicUser(user), merged };
  }),
);

auth.post(
  '/logout',
  h(async (req, res) => {
    startGuestSession(req, res);
    return { ok: true };
  }),
);

export const stats = Router();
stats.get(
  '/',
  h(async (req) => getStats(req.playerId)),
);
