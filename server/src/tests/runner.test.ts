import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { config } from '../config.js';
import { LocalExecutor } from '../executor/local.js';
import type { ExecRequest, ExecResult } from '../executor/types.js';
import { ExecutorQuotaError } from '../executor/types.js';
import { mapWandboxResponse, pickCompilers, WandboxExecutor } from '../executor/wandbox.js';
import { runTests, splitTests } from '../harness/runner.js';
import type { Language, Signature, TestCase } from '../harness/types.js';

const sig: Signature = {
  functionName: 'twice',
  params: [{ name: 'nums', type: 'int[]' }],
  returnType: 'long',
};
const problem = { signature: sig, compare: 'exact' as const, timeLimit: 2 };

const SOL: Record<Language, string> = {
  python: `class Solution:
    def twice(self, nums):
        if nums and nums[0] == -1:
            while True:
                pass
        return 2 * sum(nums)`,
  javascript: `function twice(nums) { if (nums[0] === -1) { try { for (;;) {} } catch (e) { return 0; } } let s = 0; for (const x of nums) s += x; return 2 * s; }`,
  java: `class Solution { public long twice(int[] nums) { if (nums.length > 0 && nums[0] == -1) { while (true) {} } long s = 0; for (int x : nums) s += x; return 2 * s; } }`,
  cpp: `class Solution { public: long long twice(vector<int> nums) { if (!nums.empty() && nums[0] == -1) { volatile int k = 0; while (true) { k++; } } long long s = 0; for (int x : nums) s += x; return 2 * s; } };`,
  go: `func twice(nums []int) int {
    if len(nums) > 0 && nums[0] == -1 {
        for {
        }
    }
    s := 0
    for _, x := range nums {
        s += x
    }
    return 2 * s
}`,
  rust: `impl Solution { pub fn twice(nums: Vec<i32>) -> i64 { if !nums.is_empty() && nums[0] == -1 { loop {} } nums.iter().map(|&x| x as i64).sum::<i64>() * 2 } }`,
  csharp: `public class Solution { public long Twice(int[] nums) { if (nums.Length > 0 && nums[0] == -1) { while (true) {} } long s = 0; foreach (var x in nums) s += x; return 2 * s; } }`,
  typescript: `function twice(nums: number[]): number { if (nums[0] === -1) { for (;;) {} } let s = 0; for (const x of nums) s += x; return 2 * s; }`,
};

function makeTests(n: number, len: number): TestCase[] {
  return Array.from({ length: n }, (_, i) => {
    const nums = Array.from({ length: len }, (_, j) => (i * 7 + j) % 1000);
    return { input: [nums], output: 2 * nums.reduce((a, b) => a + b, 0) };
  });
}

class ChunkedLocal extends LocalExecutor {
  maxRequestBytes = 40_000;
  maxParallel = 2;
  calls: number[] = [];
  watchdogMs(cpuSeconds: number): number {
    return cpuSeconds * 1000;
  }
  async execute(req: ExecRequest): Promise<ExecResult> {
    this.calls.push(Buffer.byteLength(JSON.stringify({ code: req.source, stdin: req.stdin })));
    return super.execute({ ...req, wallTimeLimit: 30 });
  }
}

test('splitTests: agrupa sin pasar del límite y conserva el orden', () => {
  const tests = makeTests(30, 800);
  const groups = splitTests(sig, tests, 5000, 40_000);
  assert.ok(groups.length > 1);
  assert.deepEqual(groups.flat(), tests);
  assert.deepEqual(splitTests(sig, tests, 5000, undefined), [tests]);
  assert.deepEqual(splitTests(sig, tests.slice(0, 2), 5000, 40_000), [tests.slice(0, 2)]);

  const big = Array.from({ length: 6 }, (_, i) => ({ input: [[i]], output: 'x'.repeat(30_000) }));
  const byOut = splitTests(sig, big, 5000, 1_000_000, 110_000);
  assert.deepEqual(byOut.map((g) => g.length), [3, 3]);
  assert.deepEqual(byOut.flat(), big);
});

for (const lang of Object.keys(SOL) as Language[]) {
  test(`${lang}: los tests repartidos en varias ejecuciones pasan y el vigilante corta un bucle infinito`, async () => {
    const ex = new ChunkedLocal();
    const tests = makeTests(24, 800);
    const r = await runTests(problem, lang, SOL[lang], tests, ex);
    assert.equal(r.didNotStart, false, r.errorOutput);
    assert.ok(ex.calls.length > 1, 'debería haber varias peticiones');
    assert.ok(Math.max(...ex.calls) <= ex.maxRequestBytes, `petición de ${Math.max(...ex.calls)} bytes`);
    assert.deepEqual(
      r.outcomes.map((o) => o.verdict),
      tests.map(() => 'pass'),
    );

    const loop = [...makeTests(1, 5), { input: [[-1, 2]], output: 2 }, ...makeTests(1, 5)];
    const t0 = Date.now();
    const r2 = await runTests(problem, lang, SOL[lang], loop, new ChunkedLocal());
    const ms = Date.now() - t0;
    assert.deepEqual(r2.outcomes.map((o) => o.verdict), ['pass', 'timeout', 'skipped']);
    assert.equal(r2.outcomes[1].error, 'Time limit exceeded');
    assert.ok(ms < 15_000, `tardó ${ms} ms`);
  });
}

test('error de compilación con tests repartidos: no cuenta como intento', async () => {
  const r = await runTests(problem, 'java', 'class Solution { public long twice(int[] nums) { return x; } }', makeTests(24, 800), new ChunkedLocal());
  assert.equal(r.didNotStart, true);
  assert.equal(r.outcomes.length, 24);
  assert.match(r.errorOutput, /cannot find symbol/);
});

test('pickCompilers: la versión estable más nueva de cada lenguaje', () => {
  const list = [
    { name: 'gcc-head', language: 'C++' },
    { name: 'gcc-13.2.0', language: 'C++' },
    { name: 'gcc-9.3.0', language: 'C++' },
    { name: 'clang-17.0.1', language: 'C++' },
    { name: 'cpython-head', language: 'Python' },
    { name: 'cpython-3.9.20', language: 'Python' },
    { name: 'cpython-3.14.0', language: 'Python' },
    { name: 'cpython-2.7.18', language: 'Python' },
    { name: 'pypy-3.10-v7.3.17', language: 'Python' },
    { name: 'openjdk-jdk-21+35', language: 'Java' },
    { name: 'openjdk-jdk-22+36', language: 'Java' },
    { name: 'nodejs-18.20.4', language: 'JavaScript' },
    { name: 'nodejs-20.17.0', language: 'JavaScript' },
    { name: 'go-1.23.2', language: 'Go' },
    { name: 'go-1.16.3', language: 'Go' },
    { name: 'rust-1.82.0', language: 'Rust' },
    { name: 'rust-1.9.0', language: 'Rust' },
    { name: 'mono-6.12.0.199', language: 'C#' },
    { name: 'mono-5.20.1.34', language: 'C#' },
    { name: 'dotnetcore-8.0.402', language: 'C#' },
    { name: 'typescript-5.6.2', language: 'TypeScript' },
  ];
  assert.deepEqual(pickCompilers(list), {
    cpp: 'gcc-13.2.0',
    python: 'cpython-3.14.0',
    java: 'openjdk-jdk-22+36',
    javascript: 'nodejs-20.17.0',
    go: 'go-1.23.2',
    rust: 'rust-1.82.0',
    csharp: 'mono-6.12.0.199',
    typescript: 'typescript-5.6.2',
  });
});

test('mapWandboxResponse: estados', () => {
  // Respuestas reales de Wandbox (sep-2026).
  assert.equal(
    mapWandboxResponse({ status: '1', compiler_error: "prog.cc:1:20: error: 'x' was not declared", program_output: '', program_error: '' }).status,
    'compile_error',
  );
  assert.equal(mapWandboxResponse({ status: '0', program_output: '42\n' }).status, 'ok');
  assert.equal(mapWandboxResponse({ status: '139', program_output: '' }).status, 'runtime_error');
  const py = mapWandboxResponse({ status: '1', program_output: 'x\n', program_error: 'Traceback...\nValueError' });
  assert.equal(py.status, 'runtime_error');
  assert.equal(py.stderr, 'Traceback...\nValueError');
  assert.equal(mapWandboxResponse({ status: '137', program_output: 'start\n' }).status, 'timeout');
  assert.equal(mapWandboxResponse({}, true).status, 'timeout');

  const cut = mapWandboxResponse({ status: '', program_output: 'N:0:BEGIN\n' + 'N:0:OK:[' + '1,'.repeat(70_000) });
  assert.equal(cut.status, 'runtime_error');
  assert.equal(cut.stdout, 'N:0:BEGIN\n');
  assert.match(cut.message ?? '', /Output limit/);
});

let server: Server;
const received: Record<string, unknown>[] = [];
let nextStatus = 200;

before(async () => {
  server = createServer((req, res) => {
    if (req.url === '/api/list.json') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify([{ name: 'gcc-14.1.0', language: 'C++' }, { name: 'openjdk-jdk-23+37', language: 'Java' }]));
      return;
    }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (nextStatus !== 200) {
        res.statusCode = nextStatus;
        res.end('nope');
        return;
      }
      const data = JSON.parse(body);
      received.push(data);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: '0', signal: '', compiler_error: '', program_output: 'hola\n', program_error: '' }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  config.wandbox.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

test('WandboxExecutor: forma de la petición, compiladores y errores HTTP', async () => {
  const ex = new WandboxExecutor();
  const base = { stdin: '1\n', cpuTimeLimit: 5, wallTimeLimit: 12, memoryLimit: 256 * 1024 };
  const r = await ex.execute({ ...base, language: 'java', source: 'import java.util.*;class Solution {}\n\npublic class Main {\n}\n' });
  assert.equal(r.status, 'ok');
  assert.equal(r.stdout, 'hola\n');
  const sent = received.at(-1)!;
  assert.equal(sent.compiler, 'openjdk-jdk-23+37');
  assert.equal(sent['runtime-option-raw'], '-Xss64m');
  assert.match(String(sent.code), /\nclass Main \{/);
  assert.doesNotMatch(String(sent.code), /public class Main/);
  assert.equal(sent.stdin, '1\n');

  await ex.execute({ ...base, language: 'cpp', source: 'int main(){}' });
  assert.equal(received.at(-1)!.compiler, 'gcc-14.1.0');
  assert.equal(received.at(-1)!['compiler-option-raw'], '-O2\n-std=c++17');

  await ex.execute({ ...base, language: 'python', source: 'print(1)' });
  assert.equal(received.at(-1)!.compiler, 'cpython-3.12.7');

  nextStatus = 413;
  assert.equal((await ex.execute({ ...base, language: 'python', source: 'x' })).status, 'internal_error');
  nextStatus = 429;
  await assert.rejects(ex.execute({ ...base, language: 'python', source: 'x' }), ExecutorQuotaError);
  nextStatus = 200;
});
