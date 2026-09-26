import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function num(name: string, def: number): number {
  const v = process.env[name];
  return v ? Number(v) : def;
}

function optionalNum(name: string): number | undefined {
  const v = process.env[name];
  return v ? Number(v) : undefined;
}

export const config = {
  port: num('PORT', 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/codle',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-cambia-esto',
  isProd: process.env.NODE_ENV === 'production',
  /** Zona horaria que define cuándo cambia "el día" */
  timezone: process.env.APP_TIMEZONE ?? 'Europe/Madrid',
  maxAttempts: num('MAX_ATTEMPTS', 5),
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  retosDir: process.env.RETOS_DIR ? path.resolve(process.env.RETOS_DIR) : path.join(ROOT, 'retos'),

  executor: (process.env.EXECUTOR ?? 'judge0') as 'judge0' | 'local',

  judge0: {
    url: (process.env.JUDGE0_URL ?? 'https://judge0-ce.p.rapidapi.com').replace(/\/$/, ''),
    rapidApiKey: process.env.JUDGE0_RAPIDAPI_KEY ?? '',
    authToken: process.env.JUDGE0_AUTH_TOKEN ?? '',
    languageIds: {
      python: optionalNum('JUDGE0_LANG_PYTHON'),
      javascript: optionalNum('JUDGE0_LANG_JAVASCRIPT'),
      java: optionalNum('JUDGE0_LANG_JAVA'),
      cpp: optionalNum('JUDGE0_LANG_CPP'),
    },
  },

  local: {
    python: process.env.LOCAL_PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3'),
    node: process.env.LOCAL_NODE ?? 'node',
    javac: process.env.LOCAL_JAVAC ?? 'javac',
    java: process.env.LOCAL_JAVA ?? 'java',
    gpp: process.env.LOCAL_GPP ?? 'g++',
  },
};
