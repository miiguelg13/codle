import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dbPath = path.join(root, '.data', 'db');
const port = Number(process.env.DEV_MONGO_PORT ?? 27017);

async function main() {
  mkdirSync(dbPath, { recursive: true });
  console.log('[mongo] arrancando MongoDB local (la primera vez se descarga, ten paciencia)…');
  const server = await MongoMemoryServer.create({
    instance: { port, dbPath, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
  });
  console.log(`[mongo] listo en ${server.getUri()}  (datos en ${dbPath})`);

  const stop = async () => {
    console.log('[mongo] parando…');
    await server.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error('[mongo] no se pudo arrancar MongoDB:', err);
  process.exit(1);
});
