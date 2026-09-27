import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { WandboxExecutor } from '../executor/wandbox.js';
import { runTests } from '../harness/runner.js';
import type { CompareMode, Language, Signature, TestCase } from '../harness/types.js';

interface P {
  slug: string;
  signature: Signature;
  compare: CompareMode;
  examples: TestCase[];
  tests: TestCase[];
  timeLimit?: number;
  referenceSolution: { code: string };
}

class CountingWandbox extends WandboxExecutor {
  calls = 0;
  override async execute(...args: Parameters<WandboxExecutor['execute']>) {
    this.calls++;
    return super.execute(...args);
  }
}

const ex = new CountingWandbox();
let failures = 0;

function line(ok: boolean, text: string) {
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FALLO'} ${text}`);
}

async function main() {
  const problems: P[] = JSON.parse(readFileSync(new URL('../seed/problems.json', import.meta.url), 'utf8'));
  const dir = new URL('../../../retos/', import.meta.url);
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter((x) => /^\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort()) {
      problems.push(...(JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as { problems: P[] }).problems);
    }
  }

  console.log(`== Referencias en Python (${problems.length} retos, límite real de cada reto) ==`);
  for (const p of problems) {
    const tests = [...p.examples, ...p.tests];
    const before = ex.calls;
    const t0 = Date.now();
    const r = await runTests(p, 'python', p.referenceSolution.code, tests, ex);
    const ms = Date.now() - t0;
    const bad = r.outcomes.map((o, i) => (o.verdict === 'pass' ? '' : `#${i} ${o.verdict} ${o.error ?? ''}`)).filter(Boolean);
    line(
      !r.didNotStart && bad.length === 0,
      `${p.slug}: ${tests.length} tests, ${ex.calls - before} petición(es), ${(ms / 1000).toFixed(1)} s` +
        (r.didNotStart ? ` — no arrancó: ${r.errorOutput.slice(0, 300)}` : bad.length ? ` — ${bad.join(' | ').slice(0, 400)}` : ''),
    );
  }

  console.log('\n== Bucle infinito en el test 1 (límite 2 s): debe cortarse ==');
  const sig: Signature = { functionName: 'twice', params: [{ name: 'nums', type: 'int[]' }], returnType: 'long' };
  const loops: Record<Language, string> = {
    python: 'class Solution:\n    def twice(self, nums):\n        while nums[0] == -1:\n            pass\n        return 2 * sum(nums)',
    javascript: 'function twice(nums) { while (nums[0] === -1) {} return 2 * nums.reduce((a, b) => a + b, 0); }',
    java: 'class Solution { public long twice(int[] nums) { while (nums[0] == -1) {} long s = 0; for (int x : nums) s += x; return 2 * s; } }',
    cpp: 'class Solution { public: long long twice(vector<int> nums) { volatile int k = 0; while (nums[0] == -1) { k++; } long long s = 0; for (int x : nums) s += x; return 2 * s; } };',
  };
  const tests: TestCase[] = [
    { input: [[1, 2]], output: 6 },
    { input: [[-1, 2]], output: 2 },
    { input: [[5]], output: 10 },
  ];
  for (const lang of Object.keys(loops) as Language[]) {
    const t0 = Date.now();
    const r = await runTests({ signature: sig, compare: 'exact', timeLimit: 2 }, lang, loops[lang], tests, ex);
    const v = r.outcomes.map((o) => o.verdict).join(',');
    line(v === 'pass,timeout,skipped', `${lang}: ${v} en ${((Date.now() - t0) / 1000).toFixed(1)} s ${r.didNotStart ? r.errorOutput.slice(0, 300) : ''}`);
  }

  console.log(`\n${failures === 0 ? 'TODO OK' : `${failures} FALLO(S)`} — ${ex.calls} peticiones a Wandbox`);
  process.exitCode = failures ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
