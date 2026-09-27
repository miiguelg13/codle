import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function num(name: string, def: number): number {
  const v = process.env[name];
  return v ? Number(v) : def;
}

function optionalNum(name: string): number | undefined {
  const v = process.env[name];
  return v ? Number(v) : undefined;
}

const DEV_SECRET = 'dev-secret-cambia-esto';

export const config = {
  port: num('PORT', 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/codle',
  jwtSecret: process.env.JWT_SECRET ?? DEV_SECRET,
  isProd: process.env.NODE_ENV === 'production',
  /** Zona horaria que define cuándo cambia "el día" */
  timezone: process.env.APP_TIMEZONE ?? 'Europe/Madrid',
  maxAttempts: num('MAX_ATTEMPTS', 5),
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  retosUploadToken: process.env.RETOS_UPLOAD_TOKEN ?? '',
  seedOnStart: process.env.SEED_ON_START ?? '',
  runLimitPerMinute: num('RUN_LIMIT_PER_MINUTE', 20),
  submitLimitPerMinute: num('SUBMIT_LIMIT_PER_MINUTE', 10),
  retosDir: process.env.RETOS_DIR ? path.resolve(process.env.RETOS_DIR) : path.join(ROOT, 'retos'),

  executor: (process.env.EXECUTOR ?? 'wandbox') as 'wandbox' | 'judge0' | 'local',

  wandbox: {
    url: (process.env.WANDBOX_URL ?? 'https://wandbox.org').replace(/\/$/, ''),
    timeFactor: num('WANDBOX_TIME_FACTOR', 1),
    extraSeconds: num('WANDBOX_EXTRA_SECONDS', 20),
    compilers: {
      python: process.env.WANDBOX_COMPILER_PYTHON,
      javascript: process.env.WANDBOX_COMPILER_JAVASCRIPT,
      java: process.env.WANDBOX_COMPILER_JAVA,
      cpp: process.env.WANDBOX_COMPILER_CPP,
    },
  },

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

if (config.isProd) {
  if (config.jwtSecret === DEV_SECRET || config.jwtSecret.length < 32)
    throw new Error('En producción JWT_SECRET es obligatorio (al menos 32 caracteres aleatorios)');
  if (config.executor === 'judge0' && !config.judge0.rapidApiKey && !config.judge0.authToken && config.judge0.url.includes('rapidapi'))
    console.warn('⚠️  Falta JUDGE0_RAPIDAPI_KEY: "Ejecutar" y "Enviar" no funcionarán');
}
