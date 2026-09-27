import mongoose from 'mongoose';
import { config } from './config.js';

const safeUri = () => config.mongoUri.replace(/\/\/[^@]*@/, '//***@');

function describe(err: unknown): string {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return msg.replace(/\/\/[^@\s]*@/g, '//***@').slice(0, 500);
}

function isFatal(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /bad auth|authentication failed|Authentication failed|Invalid scheme|URI must include hostname|querySrv ENOTFOUND/i.test(
    msg,
  );
}

export async function connectDb(maxWaitMs = 10 * 60_000): Promise<void> {
  mongoose.set('strictQuery', true);
  const started = Date.now();
  const remote = config.mongoUri.startsWith('mongodb+srv://');
  let lastLog = 0;
  for (;;) {
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: remote ? 15_000 : 3000 });
      console.log(`[db] conectado a ${safeUri()}`);
      return;
    } catch (err) {
      if (isFatal(err)) {
        console.error(`[db] no se puede conectar a ${safeUri()}: ${describe(err)}`);
        console.error('[db] Revisa MONGODB_URI: usuario, contraseña (sin < >) y nombre del clúster.');
        throw err;
      }
      if (Date.now() - started > maxWaitMs) throw err;
      if (Date.now() - lastLog > 30_000) {
        console.log(`[db] esperando a MongoDB en ${safeUri()}… (${describe(err)})`);
        lastLog = Date.now();
      }
      await mongoose.disconnect().catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
