import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { config } from '../config.js';
import type { ExecRequest, ExecResult, Executor } from './types.js';

interface ProcResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  ms: number;
}

const MAX_OUTPUT = 5 * 1024 * 1024;

function run(cmd: string, args: string[], opts: { cwd: string; stdin?: string; timeoutMs: number }): Promise<ProcResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, opts.timeoutMs);
    child.stdout.on('data', (d) => {
      if (stdout.length < MAX_OUTPUT) stdout += d.toString('utf8');
    });
    child.stderr.on('data', (d) => {
      if (stderr.length < MAX_OUTPUT) stderr += d.toString('utf8');
    });
    child.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      const msg =
        err.code === 'ENOENT'
          ? `No se encuentra el comando "${cmd}" en este equipo. Instálalo, indica su ruta en server/.env (LOCAL_PYTHON, LOCAL_NODE, LOCAL_JAVAC, LOCAL_JAVA, LOCAL_GPP, LOCAL_GO, LOCAL_RUSTC, LOCAL_MCS, LOCAL_MONO, LOCAL_TSC) o usa EXECUTOR=wandbox.`
          : String(err);
      resolve({ code: -1, stdout, stderr: stderr + msg, timedOut, ms: Date.now() - started });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut, ms: Date.now() - started });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(opts.stdin ?? '');
  });
}

export const RUST_FLAGS = ['-O', '--edition=2021'];
export const TS_FLAGS = ['--target', 'ES2022', '--module', 'commonjs', '--noEmitOnError', '--skipLibCheck'];

export class LocalExecutor implements Executor {
  name = 'local';

  async execute(req: ExecRequest): Promise<ExecResult> {
    const dir = await mkdtemp(path.join(tmpdir(), 'codle-'));
    const timeoutMs = req.wallTimeLimit * 1000;
    try {
      let runCmd: string;
      let runArgs: string[];
      switch (req.language) {
        case 'python':
          await writeFile(path.join(dir, 'main.py'), req.source);
          runCmd = config.local.python;
          runArgs = ['main.py'];
          break;
        case 'javascript':
          await writeFile(path.join(dir, 'main.js'), req.source);
          runCmd = config.local.node;
          runArgs = ['main.js'];
          break;
        case 'java': {
          await writeFile(path.join(dir, 'Main.java'), req.source);
          const c = await run(config.local.javac, ['-encoding', 'UTF-8', 'Main.java'], { cwd: dir, timeoutMs: 30_000 });
          if (c.code !== 0) return compileError(c, dir);
          runCmd = config.local.java;
          runArgs = ['-Xss64m', '-cp', dir, 'Main'];
          break;
        }
        case 'cpp': {
          await writeFile(path.join(dir, 'main.cpp'), req.source);
          const exe = process.platform === 'win32' ? 'main.exe' : 'main';
          const flags = ['-O2', '-std=c++17', ...(process.platform === 'win32' ? ['-static'] : []), '-o', exe, 'main.cpp'];
          const c = await run(config.local.gpp, flags, { cwd: dir, timeoutMs: 60_000 });
          if (c.code !== 0) return compileError(c, dir);
          runCmd = path.join(dir, exe);
          runArgs = [];
          break;
        }
        case 'go': {
          await writeFile(path.join(dir, 'main.go'), req.source);
          const exe = process.platform === 'win32' ? 'main.exe' : 'main';
          const c = await run(config.local.go, ['build', '-o', exe, 'main.go'], { cwd: dir, timeoutMs: 90_000 });
          if (c.code !== 0) return compileError(c, dir);
          runCmd = path.join(dir, exe);
          runArgs = [];
          break;
        }
        case 'rust': {
          await writeFile(path.join(dir, 'main.rs'), req.source);
          const exe = process.platform === 'win32' ? 'main.exe' : 'main';
          const c = await run(config.local.rustc, [...RUST_FLAGS, '-o', exe, 'main.rs'], { cwd: dir, timeoutMs: 90_000 });
          if (c.code !== 0) return compileError(c, dir);
          runCmd = path.join(dir, exe);
          runArgs = [];
          break;
        }
        case 'csharp': {
          await writeFile(path.join(dir, 'main.cs'), req.source);
          const c = await run(config.local.mcs, ['-optimize+', '-out:main.exe', 'main.cs'], { cwd: dir, timeoutMs: 60_000 });
          if (c.code !== 0) return compileError(c, dir);
          runCmd = process.platform === 'win32' ? path.join(dir, 'main.exe') : config.local.mono;
          runArgs = process.platform === 'win32' ? [] : ['main.exe'];
          break;
        }
        case 'typescript': {
          await writeFile(path.join(dir, 'main.ts'), req.source);
          const c = await run(config.local.tsc, [...TS_FLAGS, 'main.ts'], { cwd: dir, timeoutMs: 60_000 });
          if (c.code !== 0) return compileError(c, dir);
          runCmd = config.local.node;
          runArgs = ['main.js'];
          break;
        }
      }
      const r = await run(runCmd, runArgs, { cwd: dir, stdin: req.stdin, timeoutMs });
      r.stderr = r.stderr.split(dir + path.sep).join('');
      return {
        status: r.timedOut ? 'timeout' : r.code === 0 ? 'ok' : 'runtime_error',
        stdout: r.stdout,
        stderr: r.stderr,
        compileOutput: '',
        message: r.timedOut ? 'Time limit exceeded' : r.code === 0 ? undefined : `Exited with code ${r.code}`,
        timeMs: r.ms,
      };
    } finally {
      rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

function compileError(c: ProcResult, dir: string): ExecResult {
  const out = (c.stderr || c.stdout).split(dir + path.sep).join('').trim();
  return { status: 'compile_error', stdout: '', stderr: '', compileOutput: out };
}
