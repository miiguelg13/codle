import mongoose from 'mongoose';
import { config } from './config.js';

const safeUri = () => config.mongoUri.replace(/\/\/[^@]*@/, '//***@');

export async function connectDb(maxWaitMs = 10 * 60_000): Promise<void> {
  mongoose.set('strictQuery', true);
  const started = Date.now();
  let warned = false;
  for (;;) {
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 3000 });
      console.log(`[db] conectado a ${safeUri()}`);
      return;
    } catch (err) {
      if (Date.now() - started > maxWaitMs) throw err;
      if (!warned) {
        console.log(`[db] esperando a MongoDB en ${safeUri()}…`);
        warned = true;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
