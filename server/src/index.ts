import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb } from './db.js';
import { getExecutor } from './executor/index.js';
import { startRetosWatcher } from './services/importer.js';
import { seedExamples } from './seed/examples.js';

async function main() {
  await connectDb();
  const executor = getExecutor();
  if (config.seedOnStart === 'if-empty') {
    await seedExamples({ ifNeeded: true }).catch((err) => console.warn('[seed] no se pudieron cargar los ejemplos', err));
  }
  startRetosWatcher();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[server] http://localhost:${config.port}  (ejecutor: ${executor.name}, zona horaria: ${config.timezone})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
