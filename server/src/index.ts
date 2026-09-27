import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb } from './db.js';
import { getExecutor } from './executor/index.js';
import { startRetosWatcher } from './services/importer.js';
import { startSolutionVerifier } from './services/solutionVerifier.js';
import { seedExamples } from './seed/examples.js';

async function main() {
  const executor = getExecutor();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[server] http://localhost:${config.port}  (ejecutor: ${executor.name}, zona horaria: ${config.timezone})`);
  });
  await connectDb();
  if (config.seedOnStart === 'if-empty') {
    await seedExamples({ ifNeeded: true }).catch((err) => console.warn('[seed] no se pudieron cargar los ejemplos', err));
  }
  startRetosWatcher();
  if (config.verifySolutions) startSolutionVerifier();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
