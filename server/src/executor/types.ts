import type { Language } from '../harness/types.js';

export interface ExecRequest {
  language: Language;
  source: string;
  stdin: string;
  /** segundos de CPU */
  cpuTimeLimit: number;
  /** segundos de reloj */
  wallTimeLimit: number;
  /** KB */
  memoryLimit: number;
}

export type ExecStatus = 'ok' | 'compile_error' | 'runtime_error' | 'timeout' | 'memory_limit' | 'internal_error';

export interface ExecResult {
  status: ExecStatus;
  stdout: string;
  stderr: string;
  compileOutput: string;
  message?: string;
  timeMs?: number;
  memoryKb?: number;
}

export interface Executor {
  name: string;
  execute(req: ExecRequest): Promise<ExecResult>;
  maxRequestBytes?: number;
  maxOutputBytes?: number;
  /** Cuántas de esas ejecuciones lanzar a la vez. */
  maxParallel?: number;
  watchdogMs?(cpuSeconds: number): number;
}

export class ExecutorQuotaError extends Error {
  constructor(message = 'Cuota del motor de ejecución agotada') {
    super(message);
    this.name = 'ExecutorQuotaError';
  }
}
