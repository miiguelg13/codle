import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { setExecutor } from '../executor/index.js';
import { LocalExecutor } from '../executor/local.js';
import { WandboxExecutor } from '../executor/wandbox.js';
import { runTests } from '../harness/runner.js';
import { allStarterCode } from '../harness/templates.js';
import type { CompareMode, Language, Signature, TestCase } from '../harness/types.js';

setExecutor(process.env.CODLE_TEST_EXECUTOR === 'wandbox' ? new WandboxExecutor() : new LocalExecutor());

interface SeedProblem {
  slug: string;
  signature: Signature;
  compare: CompareMode;
  examples: TestCase[];
  tests: TestCase[];
}

const problems: SeedProblem[] = JSON.parse(readFileSync(new URL('../seed/problems.json', import.meta.url), 'utf8'));
const bySlug = (s: string) => {
  const p = problems.find((x) => x.slug === s);
  if (!p) throw new Error(s);
  return { ...p, timeLimit: 10 };
};

type NewLang = 'go' | 'rust' | 'csharp' | 'typescript';

const SOLUTIONS: Record<string, Record<NewLang, string>> = {
  fizzbuzz: {
    // strconv sin importar: lo añade el driver.
    go: `func fizzBuzz(n int) []string {
    r := make([]string, 0, n)
    for i := 1; i <= n; i++ {
        switch {
        case i%15 == 0:
            r = append(r, "FizzBuzz")
        case i%3 == 0:
            r = append(r, "Fizz")
        case i%5 == 0:
            r = append(r, "Buzz")
        default:
            r = append(r, strconv.Itoa(i))
        }
    }
    return r
}`,
    rust: `impl Solution {
    pub fn fizz_buzz(n: i32) -> Vec<String> {
        (1..=n).map(|i| if i % 15 == 0 { "FizzBuzz".to_string() } else if i % 3 == 0 { "Fizz".to_string() } else if i % 5 == 0 { "Buzz".to_string() } else { i.to_string() }).collect()
    }
}`,
    csharp: `public class Solution {
    public string[] FizzBuzz(int n) {
        var r = new string[n];
        for (int i = 1; i <= n; i++) r[i - 1] = i % 15 == 0 ? "FizzBuzz" : i % 3 == 0 ? "Fizz" : i % 5 == 0 ? "Buzz" : i.ToString();
        return r;
    }
}`,
    typescript: `function fizzBuzz(n: number): string[] {
    const r: string[] = [];
    for (let i = 1; i <= n; i++) r.push(i % 15 === 0 ? 'FizzBuzz' : i % 3 === 0 ? 'Fizz' : i % 5 === 0 ? 'Buzz' : String(i));
    return r;
}`,
  },
  'agrupar-anagramas': {
    go: `import "sort"

func groupAnagrams(words []string) [][]string {
    m := map[string][]string{}
    order := []string{}
    for _, w := range words {
        r := []rune(w)
        sort.Slice(r, func(i, j int) bool { return r[i] < r[j] })
        k := string(r)
        if _, ok := m[k]; !ok {
            order = append(order, k)
        }
        m[k] = append(m[k], w)
    }
    res := [][]string{}
    for _, k := range order {
        res = append(res, m[k])
    }
    return res
}`,
    rust: `use std::collections::HashMap;

impl Solution {
    pub fn group_anagrams(words: Vec<String>) -> Vec<Vec<String>> {
        let mut m: HashMap<Vec<char>, Vec<String>> = HashMap::new();
        for w in words {
            let mut k: Vec<char> = w.chars().collect();
            k.sort();
            m.entry(k).or_default().push(w);
        }
        m.into_values().collect()
    }
}`,
    csharp: `using System.Linq;

public class Solution {
    public string[][] GroupAnagrams(string[] words) {
        return words.GroupBy(w => new string(w.OrderBy(c => c).ToArray())).Select(g => g.ToArray()).ToArray();
    }
}`,
    typescript: `function groupAnagrams(words: string[]): string[][] {
    const m = new Map<string, string[]>();
    for (const w of words) {
        const k = [...w].sort().join('');
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(w);
    }
    return [...m.values()];
}`,
  },
  'producto-excepto-si-mismo': {
    go: `func productExceptSelf(nums []int) []int {
    n := len(nums)
    res := make([]int, n)
    p := 1
    for i := 0; i < n; i++ {
        res[i] = p
        p *= nums[i]
    }
    p = 1
    for i := n - 1; i >= 0; i-- {
        res[i] *= p
        p *= nums[i]
    }
    return res
}`,
    rust: `impl Solution {
    pub fn product_except_self(nums: Vec<i32>) -> Vec<i64> {
        let n = nums.len();
        let mut res = vec![1i64; n];
        let mut p: i64 = 1;
        for i in 0..n { res[i] = p; p *= nums[i] as i64; }
        p = 1;
        for i in (0..n).rev() { res[i] *= p; p *= nums[i] as i64; }
        res
    }
}`,
    csharp: `public class Solution {
    public long[] ProductExceptSelf(int[] nums) {
        int n = nums.Length;
        var res = new long[n];
        long p = 1;
        for (int i = 0; i < n; i++) { res[i] = p; p *= nums[i]; }
        p = 1;
        for (int i = n - 1; i >= 0; i--) { res[i] *= p; p *= nums[i]; }
        return res;
    }
}`,
    typescript: `function productExceptSelf(nums: number[]): number[] {
    const n = nums.length;
    const res: number[] = new Array(n).fill(1);
    let p = 1;
    for (let i = 0; i < n; i++) { res[i] = p; p *= nums[i]; }
    p = 1;
    for (let i = n - 1; i >= 0; i--) { res[i] *= p; p *= nums[i]; }
    return res.map((x) => (x === 0 ? 0 : x));
}`,
  },
  'camino-con-eliminacion': {
    go: `func shortestPath(grid [][]int, k int) int {
    m, n := len(grid), len(grid[0])
    best := make([][]int, m)
    for i := range best {
        best[i] = make([]int, n)
        for j := range best[i] {
            best[i][j] = -1
        }
    }
    type st struct{ r, c, k, d int }
    q := []st{{0, 0, k, 0}}
    best[0][0] = k
    dirs := [][2]int{{1, 0}, {-1, 0}, {0, 1}, {0, -1}}
    for h := 0; h < len(q); h++ {
        s := q[h]
        if s.r == m-1 && s.c == n-1 {
            return s.d
        }
        for _, dd := range dirs {
            r, c := s.r+dd[0], s.c+dd[1]
            if r < 0 || c < 0 || r >= m || c >= n {
                continue
            }
            nk := s.k - grid[r][c]
            if nk < 0 || best[r][c] >= nk {
                continue
            }
            best[r][c] = nk
            q = append(q, st{r, c, nk, s.d + 1})
        }
    }
    return -1
}`,
    rust: `impl Solution {
    pub fn shortest_path(grid: Vec<Vec<i32>>, k: i32) -> i32 {
        let (m, n) = (grid.len(), grid[0].len());
        let mut best = vec![vec![-1i32; n]; m];
        let mut q: VecDeque<(usize, usize, i32, i32)> = VecDeque::new();
        q.push_back((0, 0, k, 0));
        best[0][0] = k;
        while let Some((r, c, kk, d)) = q.pop_front() {
            if r == m - 1 && c == n - 1 { return d; }
            for (dr, dc) in [(1i32, 0i32), (-1, 0), (0, 1), (0, -1)] {
                let (nr, nc) = (r as i32 + dr, c as i32 + dc);
                if nr < 0 || nc < 0 || nr >= m as i32 || nc >= n as i32 { continue; }
                let (nr, nc) = (nr as usize, nc as usize);
                let nk = kk - grid[nr][nc];
                if nk < 0 || best[nr][nc] >= nk { continue; }
                best[nr][nc] = nk;
                q.push_back((nr, nc, nk, d + 1));
            }
        }
        -1
    }
}`,
    csharp: `public class Solution {
    public int ShortestPath(int[][] grid, int k) {
        int m = grid.Length, n = grid[0].Length;
        var best = new int[m, n];
        for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) best[i, j] = -1;
        var q = new Queue<int[]>();
        q.Enqueue(new[] { 0, 0, k, 0 });
        best[0, 0] = k;
        int[] dr = { 1, -1, 0, 0 }, dc = { 0, 0, 1, -1 };
        while (q.Count > 0) {
            var s = q.Dequeue();
            if (s[0] == m - 1 && s[1] == n - 1) return s[3];
            for (int d = 0; d < 4; d++) {
                int r = s[0] + dr[d], c = s[1] + dc[d];
                if (r < 0 || c < 0 || r >= m || c >= n) continue;
                int nk = s[2] - grid[r][c];
                if (nk < 0 || best[r, c] >= nk) continue;
                best[r, c] = nk;
                q.Enqueue(new[] { r, c, nk, s[3] + 1 });
            }
        }
        return -1;
    }
}`,
    typescript: `function shortestPath(grid: number[][], k: number): number {
    const m = grid.length, n = grid[0].length;
    const best: number[][] = grid.map((row) => row.map(() => -1));
    const q: [number, number, number, number][] = [[0, 0, k, 0]];
    best[0][0] = k;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let h = 0; h < q.length; h++) {
        const [r, c, kk, d] = q[h];
        if (r === m - 1 && c === n - 1) return d;
        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nc < 0 || nr >= m || nc >= n) continue;
            const nk = kk - grid[nr][nc];
            if (nk < 0 || best[nr][nc] >= nk) continue;
            best[nr][nc] = nk;
            q.push([nr, nc, nk, d + 1]);
        }
    }
    return -1;
}`,
  },
  'palindromo-valido': {
    go: `func isPalindrome(s string) bool {
    b := []byte{}
    for i := 0; i < len(s); i++ {
        c := s[i]
        if c >= 'A' && c <= 'Z' {
            c += 32
        }
        if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') {
            b = append(b, c)
        }
    }
    for i, j := 0, len(b)-1; i < j; i, j = i+1, j-1 {
        if b[i] != b[j] {
            return false
        }
    }
    return true
}`,
    rust: `impl Solution {
    pub fn is_palindrome(s: String) -> bool {
        let b: Vec<u8> = s.bytes().filter(|c| c.is_ascii_alphanumeric()).map(|c| c.to_ascii_lowercase()).collect();
        b.iter().eq(b.iter().rev())
    }
}`,
    csharp: `public class Solution {
    public bool IsPalindrome(string s) {
        var t = new StringBuilder();
        foreach (char ch in s) {
            char c = ch;
            if (c >= 'A' && c <= 'Z') c = (char) (c + 32);
            if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) t.Append(c);
        }
        string u = t.ToString();
        for (int i = 0, j = u.Length - 1; i < j; i++, j--) if (u[i] != u[j]) return false;
        return true;
    }
}`,
    typescript: `function isPalindrome(s: string): boolean {
    const t = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    return t === [...t].reverse().join('');
}`,
  },
  'mediana-dos-arrays': {
    go: `func findMedianSortedArrays(a []int, b []int) float64 {
    m := make([]int, 0, len(a)+len(b))
    i, j := 0, 0
    for i < len(a) || j < len(b) {
        if j >= len(b) || (i < len(a) && a[i] <= b[j]) {
            m = append(m, a[i])
            i++
        } else {
            m = append(m, b[j])
            j++
        }
    }
    n := len(m)
    if n%2 == 1 {
        return float64(m[n/2])
    }
    return float64(m[n/2-1]+m[n/2]) / 2
}`,
    rust: `impl Solution {
    pub fn find_median_sorted_arrays(a: Vec<i32>, b: Vec<i32>) -> f64 {
        let mut m: Vec<i64> = a.iter().chain(b.iter()).map(|&x| x as i64).collect();
        m.sort();
        let n = m.len();
        if n % 2 == 1 { m[n / 2] as f64 } else { (m[n / 2 - 1] + m[n / 2]) as f64 / 2.0 }
    }
}`,
    csharp: `public class Solution {
    public double FindMedianSortedArrays(int[] a, int[] b) {
        var m = a.Concat(b).Select(x => (long) x).OrderBy(x => x).ToArray();
        int n = m.Length;
        return n % 2 == 1 ? m[n / 2] : (m[n / 2 - 1] + m[n / 2]) / 2.0;
    }
}`,
    typescript: `function findMedianSortedArrays(a: number[], b: number[]): number {
    const m = [...a, ...b].sort((x, y) => x - y);
    const n = m.length;
    return n % 2 ? m[n >> 1] : (m[n / 2 - 1] + m[n / 2]) / 2;
}`,
  },
  'dos-sumas': {
    go: `func twoSum(nums []int, target int) []int {
    seen := map[int]int{}
    for i, x := range nums {
        if j, ok := seen[target-x]; ok {
            return []int{j, i}
        }
        seen[x] = i
    }
    return nil
}`,
    rust: `impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        let mut seen: HashMap<i64, i32> = HashMap::new();
        for (i, &x) in nums.iter().enumerate() {
            if let Some(&j) = seen.get(&(target as i64 - x as i64)) { return vec![j, i as i32]; }
            seen.insert(x as i64, i as i32);
        }
        vec![]
    }
}`,
    csharp: `public class Solution {
    public int[] TwoSum(int[] nums, int target) {
        var seen = new Dictionary<long, int>();
        for (int i = 0; i < nums.Length; i++) {
            if (seen.TryGetValue((long) target - nums[i], out int j)) return new[] { j, i };
            seen[nums[i]] = i;
        }
        return new int[0];
    }
}`,
    typescript: `function twoSum(nums: number[], target: number): number[] {
    const seen = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
        const j = seen.get(target - nums[i]);
        if (j !== undefined) return [j, i];
        seen.set(nums[i], i);
    }
    return [];
}`,
  },
};

for (const [slug, sols] of Object.entries(SOLUTIONS)) {
  for (const [lang, code] of Object.entries(sols) as [Language, string][]) {
    test(`${slug}: solución ${lang} pasa todos los tests`, async () => {
      const p = bySlug(slug);
      const tests = [...p.examples, ...p.tests];
      const r = await runTests(p, lang, code, tests);
      assert.equal(r.didNotStart, false, r.errorOutput);
      const bad = r.outcomes
        .map((o, i) => ({ i, ...o }))
        .filter((o) => o.verdict !== 'pass')
        .map((o) => `#${o.i} ${o.verdict} ${o.error ?? JSON.stringify(o.actual)?.slice(0, 200)}`);
      assert.deepEqual(bad, []);
      // El driver mide cada test.
      assert.ok(r.outcomes.every((o) => typeof o.timeMs === 'number'), 'faltan tiempos por test');
      assert.equal(typeof r.timeMs, 'number');
    });
  }
}

test('plantillas de los lenguajes nuevos: compilan (con un return) y fallan limpiamente', async () => {
  const p = bySlug('dos-sumas');
  const starters = allStarterCode(p.signature);
  const fill: Record<NewLang, [string, string]> = {
    go: ['    \n}', '    return nil\n}'],
    rust: ['        \n', '        vec![]\n'],
    csharp: ['        \n', '        return new int[0];\n'],
    typescript: ['    \n}', '    return [];\n}'],
  };
  for (const lang of Object.keys(fill) as NewLang[]) {
    const code = starters[lang].replace(fill[lang][0], fill[lang][1]);
    assert.notEqual(code, starters[lang], `${lang}: no se encontró el hueco de la plantilla`);
    const r = await runTests(p, lang, code, p.examples);
    assert.equal(r.didNotStart, false, `${lang}: ${r.errorOutput}`);
    assert.ok(r.outcomes.every((o) => o.verdict === 'fail'), `${lang}: ${JSON.stringify(r.outcomes)}`);
  }
});

test('errores de compilación, excepciones y línea del error en los lenguajes nuevos', async () => {
  const p = bySlug('fizzbuzz');
  const compile: Record<NewLang, [string, RegExp]> = {
    go: ['func fizzBuzz(n int) []string {\n    return x\n}', /solution\.go:2/],
    rust: ['impl Solution {\n    pub fn fizz_buzz(n: i32) -> Vec<String> {\n        x\n    }\n}', /:3:/],
    csharp: ['public class Solution {\n    public string[] FizzBuzz(int n) {\n        return x;\n    }\n}', /\(3,/],
    typescript: ['function fizzBuzz(n: number): string[] {\n    return 5;\n}', /\(2,/],
  };
  for (const [lang, [code, line]] of Object.entries(compile) as [Language, [string, RegExp]][]) {
    const r = await runTests(p, lang, code, p.examples);
    assert.equal(r.didNotStart, true, `${lang} debería ser error de compilación`);
    assert.match(r.errorOutput, line, `${lang}: la línea del error no apunta al código del usuario:\n${r.errorOutput}`);
  }

  const crash: Record<NewLang, string> = {
    go: 'func fizzBuzz(n int) []string {\n    if n == 5 {\n        var a []int\n        _ = a[3]\n    }\n    fmt.Println("log", n)\n    return make([]string, n)\n}',
    rust: 'impl Solution {\n    pub fn fizz_buzz(n: i32) -> Vec<String> {\n        if n == 5 { let a: Vec<i32> = vec![]; let _ = a[3]; }\n        println!("log {}", n);\n        vec![String::new(); n as usize]\n    }\n}',
    csharp: 'public class Solution {\n    public string[] FizzBuzz(int n) {\n        if (n == 5) throw new InvalidOperationException("boom");\n        Console.WriteLine("log " + n);\n        return new string[n];\n    }\n}',
    typescript: 'function fizzBuzz(n: number): string[] {\n    if (n === 5) throw new Error("boom");\n    console.log("log", n);\n    return new Array(n).fill("");\n}',
  };
  for (const [lang, code] of Object.entries(crash) as [Language, string][]) {
    const r = await runTests(p, lang, code, p.examples);
    assert.equal(r.didNotStart, false, `${lang}: ${r.errorOutput}`);
    assert.deepEqual(r.outcomes.map((o) => o.verdict), ['fail', 'error', 'fail'], `${lang}: ${JSON.stringify(r.outcomes)}`);
    assert.match(r.outcomes[0].logs, /log 3/, `${lang}: logs`);
  }
});
