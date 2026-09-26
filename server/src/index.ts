import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb } from './db.js';
import { getExecutor } from './executor/index.js';
import { startRetosWatcher } from './services/importer.js';

async function main() {
  await connectDb();
  const executor = getExecutor();
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
