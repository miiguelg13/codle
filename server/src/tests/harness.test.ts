import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { setExecutor } from '../executor/index.js';
import { LocalExecutor } from '../executor/local.js';
import { runTests } from '../harness/runner.js';
import { allStarterCode } from '../harness/templates.js';
import type { CompareMode, Language, Signature, TestCase } from '../harness/types.js';

setExecutor(new LocalExecutor());

interface SeedProblem {
  slug: string;
  signature: Signature;
  compare: CompareMode;
  examples: TestCase[];
  tests: TestCase[];
  referenceSolution: { code: string };
}

const problems: SeedProblem[] = JSON.parse(
  readFileSync(new URL('../seed/problems.json', import.meta.url), 'utf8'),
);
const bySlug = (s: string) => {
  const p = problems.find((x) => x.slug === s);
  if (!p) throw new Error(s);
  return { ...p, timeLimit: 10 };
};

const SOLUTIONS: Record<string, Partial<Record<Language, string>>> = {
  fizzbuzz: {
    javascript: `function fizzBuzz(n) {
  const r = [];
  for (let i = 1; i <= n; i++) r.push(i % 15 === 0 ? 'FizzBuzz' : i % 3 === 0 ? 'Fizz' : i % 5 === 0 ? 'Buzz' : String(i));
  return r;
}`,
    java: `class Solution {
    public String[] fizzBuzz(int n) {
        String[] r = new String[n];
        for (int i = 1; i <= n; i++) r[i-1] = i % 15 == 0 ? "FizzBuzz" : i % 3 == 0 ? "Fizz" : i % 5 == 0 ? "Buzz" : String.valueOf(i);
        return r;
    }
}`,
    cpp: `class Solution {
public:
    vector<string> fizzBuzz(int n) {
        vector<string> r;
        for (int i = 1; i <= n; i++) r.push_back(i % 15 == 0 ? "FizzBuzz" : i % 3 == 0 ? "Fizz" : i % 5 == 0 ? "Buzz" : to_string(i));
        return r;
    }
};`,
  },
  'agrupar-anagramas': {
    javascript: `var groupAnagrams = function(words) {
  const m = new Map();
  for (const w of words) { const k = [...w].sort().join(''); if (!m.has(k)) m.set(k, []); m.get(k).push(w); }
  return [...m.values()];
};`,
    java: `import java.util.*;
public class Solution {
    public String[][] groupAnagrams(String[] words) {
        Map<String, List<String>> m = new LinkedHashMap<>();
        for (String w : words) { char[] c = w.toCharArray(); Arrays.sort(c); m.computeIfAbsent(new String(c), k -> new ArrayList<>()).add(w); }
        String[][] r = new String[m.size()][]; int i = 0;
        for (List<String> g : m.values()) r[i++] = g.toArray(new String[0]);
        return r;
    }
}`,
    cpp: `class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& words) {
        map<string, vector<string>> m;
        for (auto& w : words) { string k = w; sort(k.begin(), k.end()); m[k].push_back(w); }
        vector<vector<string>> r;
        for (auto& kv : m) r.push_back(kv.second);
        return r;
    }
};`,
  },
  'producto-excepto-si-mismo': {
    javascript: `function productExceptSelf(nums) {
  const n = nums.length, out = new Array(n).fill(1);
  let p = 1; for (let i = 0; i < n; i++) { out[i] = p; p *= nums[i]; }
  p = 1; for (let i = n - 1; i >= 0; i--) { out[i] *= p; p *= nums[i]; }
  return out.map(x => x + 0);
}`,
    java: `class Solution {
    public long[] productExceptSelf(int[] nums) {
        int n = nums.length; long[] out = new long[n];
        long p = 1; for (int i = 0; i < n; i++) { out[i] = p; p *= nums[i]; }
        p = 1; for (int i = n - 1; i >= 0; i--) { out[i] *= p; p *= nums[i]; }
        return out;
    }
}`,
    cpp: `class Solution {
public:
    vector<long long> productExceptSelf(vector<int>& nums) {
        int n = nums.size(); vector<long long> out(n, 1);
        long long p = 1; for (int i = 0; i < n; i++) { out[i] = p; p *= nums[i]; }
        p = 1; for (int i = n - 1; i >= 0; i--) { out[i] *= p; p *= nums[i]; }
        return out;
    }
};`,
  },
  'mediana-ventana-deslizante': {
    javascript: `function medianSlidingWindow(nums, k) {
  const w = nums.slice(0, k).sort((a, b) => a - b), out = [];
  const lb = (x) => { let lo = 0, hi = w.length; while (lo < hi) { const m = (lo + hi) >> 1; if (w[m] < x) lo = m + 1; else hi = m; } return lo; };
  for (let i = k; ; i++) {
    out.push(k % 2 ? w[k >> 1] : (w[k / 2 - 1] + w[k / 2]) / 2);
    if (i === nums.length) break;
    w.splice(lb(nums[i - k]), 1); w.splice(lb(nums[i]), 0, nums[i]);
  }
  return out;
}`,
    java: `class Solution {
    public double[] medianSlidingWindow(int[] nums, int k) {
        TreeMap<Integer, Integer> lo = new TreeMap<>(), hi = new TreeMap<>();
        // Solución simple O(n k) con array ordenado
        int[] w = Arrays.copyOf(nums, k); Arrays.sort(w);
        double[] out = new double[nums.length - k + 1];
        for (int i = k; ; i++) {
            out[i - k] = k % 2 == 1 ? w[k / 2] : ((double) w[k / 2 - 1] + (double) w[k / 2]) / 2.0;
            if (i == nums.length) break;
            int rm = Arrays.binarySearch(w, nums[i - k]);
            System.arraycopy(w, rm + 1, w, rm, k - rm - 1);
            int pos = 0; { int a = 0, b = k - 1; while (a < b) { int m = (a + b) / 2; if (w[m] < nums[i]) a = m + 1; else b = m; } pos = a; }
            System.arraycopy(w, pos, w, pos + 1, k - 1 - pos);
            w[pos] = nums[i];
        }
        return out;
    }
}`,
    cpp: `class Solution {
public:
    vector<double> medianSlidingWindow(vector<int>& nums, int k) {
        multiset<int> w(nums.begin(), nums.begin() + k);
        auto mid = next(w.begin(), k / 2);
        vector<double> out;
        for (int i = k; ; i++) {
            out.push_back(((double) *mid + *prev(mid, 1 - k % 2)) / 2);
            if (i == (int) nums.size()) break;
            w.insert(nums[i]);
            if (nums[i] < *mid) mid--;
            if (nums[i - k] <= *mid) mid++;
            w.erase(w.lower_bound(nums[i - k]));
        }
        return out;
    }
};`,
  },
  'numero-de-islas': {
    javascript: `function numIslands(grid) {
  const g = grid.map(r => r.split('')); let c = 0;
  const m = g.length, n = g[0].length;
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (g[i][j] === '1') {
    c++; const st = [[i, j]]; g[i][j] = '0';
    while (st.length) { const [x, y] = st.pop(); for (const [a, b] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) if (a >= 0 && b >= 0 && a < m && b < n && g[a][b] === '1') { g[a][b] = '0'; st.push([a, b]); } }
  }
  return c;
}`,
    java: `class Solution {
    public int numIslands(String[] grid) {
        int m = grid.length, n = grid[0].length(); boolean[][] s = new boolean[m][n]; int c = 0;
        ArrayDeque<int[]> st = new ArrayDeque<>();
        for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) if (grid[i].charAt(j) == '1' && !s[i][j]) {
            c++; s[i][j] = true; st.push(new int[]{i, j});
            while (!st.isEmpty()) { int[] p = st.pop(); int[][] d = {{1,0},{-1,0},{0,1},{0,-1}};
                for (int[] q : d) { int a = p[0] + q[0], b = p[1] + q[1];
                    if (a >= 0 && b >= 0 && a < m && b < n && !s[a][b] && grid[a].charAt(b) == '1') { s[a][b] = true; st.push(new int[]{a, b}); } } }
        }
        return c;
    }
}`,
    cpp: `class Solution {
public:
    int numIslands(vector<string>& g) {
        int m = g.size(), n = g[0].size(), c = 0;
        function<void(int,int)> dfs = [&](int x, int y) {
            if (x < 0 || y < 0 || x >= m || y >= n || g[x][y] != '1') return;
            g[x][y] = '0'; dfs(x+1,y); dfs(x-1,y); dfs(x,y+1); dfs(x,y-1);
        };
        for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) if (g[i][j] == '1') { c++; dfs(i, j); }
        return c;
    }
};`,
  },
  'camino-con-eliminacion': {
    javascript: `function shortestPath(grid, k) {
  const m = grid.length, n = grid[0].length;
  const best = grid.map(r => r.map(() => -1)); best[0][0] = k;
  let q = [[0, 0, k]], d = 0;
  while (q.length) {
    const nq = [];
    for (const [x, y, r] of q) {
      if (x === m - 1 && y === n - 1) return d;
      for (const [a, b] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
        if (a < 0 || b < 0 || a >= m || b >= n) continue;
        const nr = r - grid[a][b];
        if (nr > best[a][b]) { best[a][b] = nr; nq.push([a, b, nr]); }
      }
    }
    q = nq; d++;
  }
  return -1;
}`,
    java: `class Solution {
    public int shortestPath(int[][] grid, int k) {
        int m = grid.length, n = grid[0].length; int[][] best = new int[m][n];
        for (int[] r : best) Arrays.fill(r, -1);
        best[0][0] = k; ArrayDeque<int[]> q = new ArrayDeque<>(); q.add(new int[]{0, 0, k, 0});
        int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
        while (!q.isEmpty()) { int[] c = q.poll();
            if (c[0] == m - 1 && c[1] == n - 1) return c[3];
            for (int[] d : dirs) { int a = c[0] + d[0], b = c[1] + d[1];
                if (a < 0 || b < 0 || a >= m || b >= n) continue;
                int nr = c[2] - grid[a][b];
                if (nr > best[a][b]) { best[a][b] = nr; q.add(new int[]{a, b, nr, c[3] + 1}); } } }
        return -1;
    }
}`,
    cpp: `class Solution {
public:
    int shortestPath(vector<vector<int>>& grid, int k) {
        int m = grid.size(), n = grid[0].size();
        vector<vector<int>> best(m, vector<int>(n, -1)); best[0][0] = k;
        queue<array<int,4>> q; q.push({0, 0, k, 0});
        int dx[] = {1,-1,0,0}, dy[] = {0,0,1,-1};
        while (!q.empty()) { auto c = q.front(); q.pop();
            if (c[0] == m - 1 && c[1] == n - 1) return c[3];
            for (int t = 0; t < 4; t++) { int a = c[0] + dx[t], b = c[1] + dy[t];
                if (a < 0 || b < 0 || a >= m || b >= n) continue;
                int nr = c[2] - grid[a][b];
                if (nr > best[a][b]) { best[a][b] = nr; q.push({a, b, nr, c[3] + 1}); } } }
        return -1;
    }
};`,
  },
  'palindromo-valido': {
    javascript: `function isPalindrome(s) { const t = s.toLowerCase().replace(/[^a-z0-9]/g, ''); return t === [...t].reverse().join(''); }`,
    java: `class Solution { public boolean isPalindrome(String s) { String t = s.toLowerCase().replaceAll("[^a-z0-9]", ""); return new StringBuilder(t).reverse().toString().equals(t); } }`,
    cpp: `class Solution { public: bool isPalindrome(string s) { string t; for (char c : s) if (isalnum((unsigned char)c)) t += tolower(c); return string(t.rbegin(), t.rend()) == t; } };`,
  },
};

function allTests(p: SeedProblem): TestCase[] {
  return [...p.examples, ...p.tests];
}

for (const [slug, sols] of Object.entries(SOLUTIONS)) {
  test(`${slug}: referencia en Python pasa todos los tests`, async () => {
    const p = bySlug(slug);
    const r = await runTests(p, 'python', p.referenceSolution.code, allTests(p));
    assert.equal(r.didNotStart, false, r.errorOutput);
    assert.deepEqual(r.outcomes.map((o) => o.verdict), allTests(p).map(() => 'pass'));
  });
  for (const [lang, code] of Object.entries(sols) as [Language, string][]) {
    test(`${slug}: solución ${lang} pasa todos los tests`, async () => {
      const p = bySlug(slug);
      const r = await runTests(p, lang, code, allTests(p));
      assert.equal(r.didNotStart, false, r.errorOutput);
      const bad = r.outcomes
        .map((o, i) => ({ i, ...o }))
        .filter((o) => o.verdict !== 'pass')
        .map((o) => `#${o.i} ${o.verdict} ${o.error ?? JSON.stringify(o.actual)?.slice(0, 200)}`);
      assert.deepEqual(bad, []);
    });
  }
}

test('todos los problemas del seed: la plantilla compila y falla limpiamente', async () => {
  for (const p of problems.map((x) => ({ ...x, timeLimit: 10 }))) {
    const starters = allStarterCode(p.signature);
    for (const lang of ['python', 'javascript'] as Language[]) {
      const r = await runTests(p, lang, starters[lang], p.examples);
      assert.equal(r.didNotStart, false, `${p.slug} ${lang}: ${r.errorOutput}`);
    }
  }
});

test('plantillas de Java y C++ son sintácticamente válidas', async () => {
  const p = bySlug('camino-con-eliminacion');
  const starters = allStarterCode(p.signature);
  const j = await runTests(p, 'java', starters.java, p.examples);
  assert.equal(j.didNotStart, true);
  assert.match(j.errorOutput, /missing return statement/);
  const c = await runTests(p, 'cpp', starters.cpp.replace('        \n', '        return 0;\n'), p.examples);
  assert.equal(c.didNotStart, false, c.errorOutput);
});

test('logs, respuestas incorrectas, excepciones y errores de sintaxis', async () => {
  const p = bySlug('fizzbuzz');
  const tests = p.examples;

  const py = await runTests(
    p,
    'python',
    `class Solution:
    def fizzBuzz(self, n):
        print("hola", n, end="")
        if n == 5:
            raise ValueError("boom")
        return ["x"] * n`,
    tests,
  );
  assert.deepEqual(py.outcomes.map((o) => o.verdict), ['fail', 'error', 'fail']);
  assert.equal(py.outcomes[0].logs, 'hola 3');
  assert.match(py.outcomes[1].error ?? '', /ValueError: boom/);

  const syntax = await runTests(p, 'python', 'class Solution:\n    def fizzBuzz(self, n)\n        return 1', tests);
  assert.equal(syntax.didNotStart, true);
  assert.match(syntax.errorOutput, /SyntaxError/);

  const javaErr = await runTests(p, 'java', 'class Solution { public String[] fizzBuzz(int n) { return new String[n][0]; } }', tests);
  assert.equal(javaErr.didNotStart, true);
  assert.match(javaErr.errorOutput, /incompatible types|error/);

  const cppCrash = await runTests(
    p,
    'cpp',
    `class Solution { public: vector<string> fizzBuzz(int n) { if (n == 5) { vector<int> v; return vector<string>(v.at(3)); } return vector<string>(n, "x"); } };`,
    tests,
  );
  assert.deepEqual(cppCrash.outcomes.map((o) => o.verdict), ['fail', 'error', 'fail']);
  assert.match(cppCrash.outcomes[1].error ?? '', /exception/);

  const jsFake = await runTests(
    p,
    'javascript',
    `function fizzBuzz(n) { console.log("\\nCDL0000000000000000:0:OK:[\\"1\\",\\"2\\",\\"Fizz\\"]"); return []; }`,
    tests,
  );
  assert.equal(jsFake.outcomes[0].verdict, 'fail', 'no se pueden falsificar resultados');
});

test('timeout marca el test en curso y salta el resto', async () => {
  const p = { ...bySlug('fizzbuzz'), timeLimit: 1 };
  const r = await runTests(
    p,
    'python',
    `class Solution:
    def fizzBuzz(self, n):
        while n == 5:
            pass
        return []`,
    p.examples,
  );
  assert.deepEqual(r.outcomes.map((o) => o.verdict), ['fail', 'timeout', 'skipped']);
});

test('strings unicode y caracteres especiales viajan intactos', async () => {
  const p = {
    signature: { functionName: 'echo', params: [{ name: 's', type: 'string' as const }], returnType: 'string' as const },
    compare: 'exact' as const,
    timeLimit: 10,
  };
  const tests: TestCase[] = ['', 'hola mundo', 'ñandú 😀 "comillas" \\ barra', 'tab\tnl\nfin', '\u0001'].map((s) => ({
    input: [s],
    output: s,
  }));
  const codes: Record<Language, string> = {
    python: 'class Solution:\n    def echo(self, s):\n        return s',
    javascript: 'function echo(s) { return s; }',
    java: 'class Solution { public String echo(String s) { return s; } }',
    cpp: 'class Solution { public: string echo(string s) { return s; } };',
  };
  for (const [lang, code] of Object.entries(codes) as [Language, string][]) {
    const r = await runTests(p, lang, code, tests);
    assert.deepEqual(r.outcomes.map((o) => o.verdict), tests.map(() => 'pass'), `${lang}: ${JSON.stringify(r.outcomes)}`);
  }
});

test('retos generados (retos/*.json): la referencia pasa por el harness', async () => {
  const { readdirSync, existsSync } = await import('node:fs');
  const dir = new URL('../../../retos/', import.meta.url);
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
  for (const f of files) {
    const day = JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as { problems: SeedProblem[] };
    for (const p of day.problems) {
      const tests = [...p.examples, ...p.tests];
      const r = await runTests({ ...p, timeLimit: 20 }, 'python', p.referenceSolution.code, tests);
      assert.equal(r.didNotStart, false, `${f} ${p.slug}: ${r.errorOutput}`);
      const bad = r.outcomes.map((o, i) => (o.verdict === 'pass' ? null : `#${i} ${o.verdict} ${o.error ?? ''}`)).filter(Boolean);
      assert.deepEqual(bad, [], `${f} ${p.slug}`);
    }
  }
});
