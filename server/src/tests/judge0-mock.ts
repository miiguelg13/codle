import { createServer } from 'node:http';
import { LocalExecutor } from '../executor/local.js';
import type { Language } from '../harness/types.js';

const port = Number(process.env.JUDGE0_MOCK_PORT ?? 2358);
let quota = Number(process.env.JUDGE0_MOCK_QUOTA ?? 1000);
const LANGS = [
  { id: 71, name: 'Python (3.8.1)' },
  { id: 92, name: 'Python (3.11.2)' },
  { id: 63, name: 'JavaScript (Node.js 12.14.0)' },
  { id: 93, name: 'JavaScript (Node.js 18.15.0)' },
  { id: 62, name: 'Java (OpenJDK 13.0.1)' },
  { id: 91, name: 'Java (JDK 17.0.6)' },
  { id: 54, name: 'C++ (GCC 9.2.0)' },
  { id: 105, name: 'C++ (GCC 14.1.0)' },
];
const byId: Record<number, Language> = { 71: 'python', 92: 'python', 63: 'javascript', 93: 'javascript', 62: 'java', 91: 'java', 54: 'cpp', 105: 'cpp' };
const exec = new LocalExecutor();
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s: string) => Buffer.from(s ?? '', 'base64').toString('utf8');
const STATUS = { ok: [3, 'Accepted'], timeout: [5, 'Time Limit Exceeded'], compile_error: [6, 'Compilation Error'], runtime_error: [11, 'Runtime Error (NZEC)'], memory_limit: [11, 'Runtime Error'], internal_error: [13, 'Internal Error'] } as const;
export const usedLanguageIds: number[] = [];

createServer(async (req, res) => {
  const send = (code: number, body: unknown) => {
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (req.method === 'GET' && req.url?.startsWith('/languages')) return send(200, LANGS);
  if (req.method === 'POST' && req.url?.startsWith('/submissions')) {
    if (quota-- <= 0) return send(429, { message: 'You have exceeded the DAILY quota' });
    let raw = '';
    for await (const c of req) raw += c;
    const body = JSON.parse(raw);
    console.log('[judge0-mock] language_id', body.language_id, 'key', req.headers['x-rapidapi-key'] ? 'sí' : 'no');
    const r = await exec.execute({
      language: byId[body.language_id],
      source: unb64(body.source_code),
      stdin: unb64(body.stdin),
      cpuTimeLimit: body.cpu_time_limit,
      wallTimeLimit: body.wall_time_limit,
      memoryLimit: body.memory_limit,
    });
    const [id, description] = STATUS[r.status];
    return send(201, {
      status: { id, description },
      stdout: r.stdout ? b64(r.stdout) : null,
      stderr: r.stderr ? b64(r.stderr) : null,
      compile_output: r.compileOutput ? b64(r.compileOutput) : null,
      message: r.message ? b64(r.message) : null,
      time: r.timeMs ? String(r.timeMs / 1000) : null,
      memory: 1234,
    });
  }
  send(404, { error: 'not found' });
}).listen(port, () => console.log(`[judge0-mock] http://127.0.0.1:${port}`));
