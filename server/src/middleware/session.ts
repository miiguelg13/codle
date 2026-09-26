import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const SESSION_COOKIE = 'cdl_sid';
const ONE_YEAR_MS = 365 * 24 * 3600 * 1000;

interface SessionPayload {
  pid: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      playerId: string;
    }
  }
}

export function setSessionCookie(res: Response, pid: string): void {
  const token = jwt.sign({ pid } satisfies SessionPayload, config.jwtSecret, { expiresIn: '365d' });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: ONE_YEAR_MS,
  });
}

export function session(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as SessionPayload;
      if (payload?.pid) {
        req.playerId = payload.pid;
        return next();
      }
    } catch {
      // cookie inválida o caducada: se crea una nueva
    }
  }
  startGuestSession(req, res);
  next();
}

export function startGuestSession(req: Request, res: Response): void {
  req.playerId = `g:${randomUUID()}`;
  setSessionCookie(res, req.playerId);
}
