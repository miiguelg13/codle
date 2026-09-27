import { config } from '../config.js';
import { Judge0Executor } from './judge0.js';
import { LocalExecutor } from './local.js';
import { WandboxExecutor } from './wandbox.js';
import type { Executor } from './types.js';

let instance: Executor | null = null;

export function getExecutor(): Executor {
  if (!instance) {
    if (config.executor === 'local') {
      if (config.isProd) throw new Error('EXECUTOR=local no está permitido en producción');
      console.warn('⚠️  EXECUTOR=local: el código se ejecuta SIN aislamiento. Solo para desarrollo.');
      instance = new LocalExecutor();
    } else if (config.executor === 'judge0') {
      instance = new Judge0Executor();
    } else {
      instance = new WandboxExecutor();
    }
  }
  return instance;
}

export function setExecutor(e: Executor): void {
  instance = e;
}
