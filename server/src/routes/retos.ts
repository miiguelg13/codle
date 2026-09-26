import { timingSafeEqual } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { config } from '../config.js';
import { isAdminUser, User } from '../models/User.js';
import { HttpError } from '../services/game.js';
import { importDayData } from '../services/importer.js';

export const retos = Router();

function tokenOk(req: Request): boolean {
  const expected = config.retosUploadToken;
  const header = req.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!expected || expected.length < 16 || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function isAdminSession(req: Request): Promise<boolean> {
  if (!req.playerId?.startsWith('u:')) return false;
  const u = await User.findById(req.playerId.slice(2)).select('email isAdmin').lean();
  return !!u && isAdminUser(u);
}

retos.post('/upload', (req: Request, res: Response, next: NextFunction) => {
  (async () => {
    if (!tokenOk(req) && !(await isAdminSession(req))) throw new HttpError(401, 'unauthorized');
    const report = await importDayData(req.body, typeof req.body?.date === 'string' ? `${req.body.date}.json` : 'subida');
    res.json(report); // los errores de validación van en report.errors
  })().catch(next);
});
