import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { Progress } from '../models/Progress.js';

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('contraseña-de-relleno');
  return dummyHash;
}

export async function mergeGuestProgress(guestPid: string, userPid: string): Promise<number> {
  if (!guestPid.startsWith('g:') || !userPid.startsWith('u:')) return 0;
  const guestDocs = await Progress.find({ playerId: guestPid }).lean();
  if (guestDocs.length === 0) return 0;
  const userDocs = await Progress.find({
    playerId: userPid,
    problemId: { $in: guestDocs.map((d) => d.problemId) },
  })
    .select('problemId solved attempts')
    .lean();
  const byProblem = new Map(userDocs.map((d) => [String(d.problemId), d]));
  let moved = 0;
  for (const g of guestDocs) {
    if (!g.attempts?.length) {
      await Progress.deleteOne({ _id: g._id });
      continue;
    }
    const u = byProblem.get(String(g.problemId));
    if (!u) {
      await Progress.updateOne({ _id: g._id }, { $set: { playerId: userPid } });
      moved++;
    } else if (g.solved && !u.solved) {
      await Progress.deleteOne({ _id: u._id });
      await Progress.updateOne({ _id: g._id }, { $set: { playerId: userPid } });
      moved++;
    } else {
      await Progress.deleteOne({ _id: g._id });
    }
  }
  return moved;
}
