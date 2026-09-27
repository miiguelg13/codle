import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { setExecutor } from '../executor/index.js';
import { LocalExecutor } from '../executor/local.js';
import { WandboxExecutor } from '../executor/wandbox.js';
import { runTests } from '../harness/runner.js';
import type { CompareMode, Language, Signature, TestCase } from '../harness/types.js';
import { SOLUTION_EXT } from '../harness/solutions.js';

interface P {
  slug: string;
  signature: Signature;
  compare?: CompareMode;
  timeLimit?: number;
  examples: TestCase[];
  tests: TestCase[];
}

async function main() {
  const [file, dir, ...only] = process.argv.slice(2);
  if (!file || !dir) {
    console.error('uso: check-solutions.ts <problemas.json> <carpeta> [slug...]');
    process.exit(2);
  }
  setExecutor(process.env.CODLE_TEST_EXECUTOR === 'wandbox' ? new WandboxExecutor() : new LocalExecutor());
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const problems: P[] = Array.isArray(raw) ? raw : raw.problems;
  const byExt = new Map(Object.entries(SOLUTION_EXT).map(([l, e]) => [e, l as Language]));
  const files = readdirSync(dir).filter((f) => byExt.has(path.extname(f).slice(1)));

  let fails = 0;
  let passes = 0;
  for (const p of problems) {
    if (only.length && !only.includes(p.slug)) continue;
    const mine = files.filter((f) => f.slice(0, f.lastIndexOf('.')) === p.slug);
    if (!mine.length) {
      console.log(`${p.slug}: sin soluciones`);
      continue;
    }
    for (const f of mine) {
      const lang = byExt.get(path.extname(f).slice(1))!;
      const code = readFileSync(path.join(dir, f), 'utf8');
      const cases = [...p.examples, ...p.tests];
      const t0 = Date.now();
      const r = await runTests({ signature: p.signature, compare: p.compare ?? 'exact', timeLimit: p.timeLimit ?? 5 }, lang, code, cases);
      const bad = r.outcomes.map((o, i) => [o, i] as const).filter(([o]) => o.verdict !== 'pass');
      const ms = Date.now() - t0;
      if (r.didNotStart || bad.length || r.execStatus === 'internal_error') {
        fails++;
        const [o, i] = bad[0] ?? [undefined, -1];
        const detail = r.didNotStart
          ? `no compila:\n${r.errorOutput.slice(0, 1500)}`
          : `${bad.length}/${cases.length} tests fallan. Primero #${i}: ${o?.verdict} ${o?.error ?? ''}\n  input: ${JSON.stringify(cases[i]?.input).slice(0, 200)}\n  esperado: ${JSON.stringify(cases[i]?.output).slice(0, 200)}\n  obtenido: ${JSON.stringify(o?.actual).slice(0, 200)}`;
        console.log(`FALLA ${p.slug} [${lang}] (${ms} ms) ${detail}`);
      } else {
        passes++;
        console.log(`OK    ${p.slug} [${lang}] ${cases.length} tests, ${r.timeMs ?? '?'} ms de ejecución (${ms} ms en total)`);
      }
    }
  }
  console.log(`\n${passes} bien, ${fails} mal`);
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
