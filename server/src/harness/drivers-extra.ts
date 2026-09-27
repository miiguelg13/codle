import { elementType, type Signature, type ValueType } from './types.js';
import { csharpType, goType, pascalCase, rustType, snakeCase } from './templates.js';

const GO_AUTO_IMPORTS: Record<string, string> = {
  sort: 'sort',
  strings: 'strings',
  strconv: 'strconv',
  math: 'math',
  bytes: 'bytes',
  unicode: 'unicode',
  slices: 'slices',
  maps: 'maps',
  fmt: 'fmt',
  heap: 'container/heap',
  list: 'container/list',
  bits: 'math/bits',
  utf8: 'unicode/utf8',
  rand: 'math/rand',
};

function stripGo(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/`[^`]*`/g, '""')
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "' '");
}

function goImportedPaths(code: string): Set<string> {
  const paths = new Set<string>();
  const single = /\bimport\s+(?:[A-Za-z_.]\w*\s+)?"([^"]+)"/g;
  const block = /\bimport\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = single.exec(code))) paths.add(m[1]);
  while ((m = block.exec(code))) {
    for (const p of m[1].matchAll(/"([^"]+)"/g)) paths.add(p[1]);
  }
  return paths;
}

export function goAutoImports(userCode: string): string[] {
  const stripped = stripGo(userCode);
  const imported = goImportedPaths(userCode);
  const out: string[] = [];
  for (const [name, path] of Object.entries(GO_AUTO_IMPORTS)) {
    if (imported.has(path)) continue;
    if (new RegExp(`(^|[^\\w.])${name}\\.[A-Za-z_]`).test(stripped)) out.push(path);
  }
  return out;
}

function goRead(t: ValueType): string {
  const el = elementType(t);
  if (el) return `__cdlRa(func() ${goType(el)} { return ${goRead(el)} })`;
  return { int: '__cdlRi()', long: '__cdlRi()', double: '__cdlRd()', bool: '__cdlRb()', string: '__cdlRs()' }[t as 'int'];
}

export function goProgram(userCode: string, sig: Signature, nonce: string, wd: number): string {
  const code = userCode.replace(/^\s*package\s+main\s*$/m, '');
  const auto = goAutoImports(code);
  const decls = sig.params.map((p, i) => `a${i} := ${goRead(p.type)}`).join('\n\t\t');
  const args = sig.params.map((_, i) => `a${i}`).join(', ');
  return `package main

import (
	__cdl_bytes "bytes"
	__cdl_json "encoding/json"
	__cdl_fmt "fmt"
	__cdl_io "io"
	__cdl_math "math"
	__cdl_os "os"
	__cdl_reflect "reflect"
	__cdl_strconv "strconv"
	__cdl_strings "strings"
	__cdl_sync "sync"
	__cdl_atomic "sync/atomic"
	__cdl_time "time"
)
${auto.map((p) => `import "${p}"`).join('\n')}

//line solution.go:1
${code}

//line driver.go:1
// ---- driver (no modificar) ----
var __cdlToks [][]byte
var __cdlPos int
var __cdlMu __cdl_sync.Mutex
var __cdlCur int64

func __cdlNx() string {
	if __cdlPos >= len(__cdlToks) {
		return ""
	}
	__cdlPos++
	return string(__cdlToks[__cdlPos-1])
}
func __cdlRi() int { v, _ := __cdl_strconv.Atoi(__cdlNx()); return v }
func __cdlRd() float64 { v, _ := __cdl_strconv.ParseFloat(__cdlNx(), 64); return v }
func __cdlRb() bool { return __cdlNx() == "1" }
func __cdlRs() string {
	n := __cdlRi()
	b := make([]byte, n)
	for k := 0; k < n; k++ {
		b[k] = byte(__cdlRi())
	}
	return string(b)
}
func __cdlRa[T any](f func() T) []T {
	n := __cdlRi()
	a := make([]T, n)
	for k := range a {
		a[k] = f()
	}
	return a
}

func __cdlJ(rv __cdl_reflect.Value) string {
	switch rv.Kind() {
	case __cdl_reflect.Slice, __cdl_reflect.Array:
		var sb __cdl_strings.Builder
		sb.WriteByte('[')
		for k := 0; k < rv.Len(); k++ {
			if k > 0 {
				sb.WriteByte(',')
			}
			sb.WriteString(__cdlJ(rv.Index(k)))
		}
		sb.WriteByte(']')
		return sb.String()
	case __cdl_reflect.String:
		b, _ := __cdl_json.Marshal(rv.String())
		return string(b)
	case __cdl_reflect.Float32, __cdl_reflect.Float64:
		f := rv.Float()
		if __cdl_math.IsNaN(f) || __cdl_math.IsInf(f, 0) {
			return "null"
		}
		return __cdl_strconv.FormatFloat(f, 'g', -1, 64)
	case __cdl_reflect.Bool:
		if rv.Bool() {
			return "true"
		}
		return "false"
	case __cdl_reflect.Int, __cdl_reflect.Int8, __cdl_reflect.Int16, __cdl_reflect.Int32, __cdl_reflect.Int64:
		return __cdl_strconv.FormatInt(rv.Int(), 10)
	case __cdl_reflect.Uint, __cdl_reflect.Uint8, __cdl_reflect.Uint16, __cdl_reflect.Uint32, __cdl_reflect.Uint64:
		return __cdl_strconv.FormatUint(rv.Uint(), 10)
	case __cdl_reflect.Invalid:
		return "null"
	}
	b, _ := __cdl_json.Marshal(rv.Interface())
	return string(b)
}

func __cdlW(s string) {
	__cdlMu.Lock()
	__cdl_os.Stdout.WriteString(s)
	__cdlMu.Unlock()
}

func main() {
	data, _ := __cdl_io.ReadAll(__cdl_os.Stdin)
	__cdlToks = __cdl_bytes.Fields(data)${
    wd
      ? `
	go func() {
		__cdl_time.Sleep(${wd} * __cdl_time.Millisecond)
		__cdlMu.Lock()
		__cdl_os.Stdout.WriteString(__cdl_fmt.Sprintf("\\n${nonce}:%d:TLE\\n", __cdl_atomic.LoadInt64(&__cdlCur)))
		__cdl_os.Exit(0)
	}()`
      : ''
  }
	T := __cdlRi()
	for i := 0; i < T; i++ {
		${decls}
		__cdl_atomic.StoreInt64(&__cdlCur, int64(i))
		__cdlW(__cdl_fmt.Sprintf("\\n${nonce}:%d:BEGIN\\n", i))
		func() {
			defer func() {
				if e := recover(); e != nil {
					m := __cdl_strings.ReplaceAll("panic: "+__cdl_fmt.Sprint(e), "\\n", " ")
					if len(m) > 300 {
						m = m[:300]
					}
					__cdlW(__cdl_fmt.Sprintf("\\n${nonce}:%d:ERR:%s\\n", i, m))
				}
			}()
			t0 := __cdl_time.Now()
			r := ${sig.functionName}(${args})
			dt := float64(__cdl_time.Since(t0).Nanoseconds()) / 1e6
			js := __cdlJ(__cdl_reflect.ValueOf(r))
			__cdlW(__cdl_fmt.Sprintf("\\n${nonce}:%d:T:%.3f\\n", i, dt))
			__cdlW(__cdl_fmt.Sprintf("\\n${nonce}:%d:OK:%s\\n", i, js))
		}()
	}
}
`;
}

const RUST_PRELUDE =
  '#![allow(dead_code, unused_imports, unused_variables, unused_mut, unused_parens, non_snake_case, unused_macros)] ' +
  'use std::collections::*; use std::cmp::*; ';

function rustRead(t: ValueType): string {
  const el = elementType(t);
  if (el) return `{ let n = r.usize(); let mut v = Vec::with_capacity(n); for _ in 0..n { v.push(${rustRead(el)}); } v }`;
  return { int: 'r.i32()', long: 'r.i64()', double: 'r.f64()', bool: 'r.b()', string: 'r.s()' }[t as 'int'];
}

export function rustProgram(userCode: string, sig: Signature, nonce: string, wd: number): string {
  const fn = snakeCase(sig.functionName);
  const hasStruct = /\bstruct\s+Solution\b/.test(userCode);
  const decls = sig.params.map((p, i) => `let a${i}: ${rustType(p.type)} = ${rustRead(p.type)};`).join('\n        ');
  const args = sig.params.map((_, i) => `a${i}`).join(', ');
  return `${RUST_PRELUDE}${hasStruct ? '' : 'struct Solution; '}${userCode}

// ---- driver (no modificar) ----
mod __cdl {
    use std::io::{Read, Write};
    use std::sync::atomic::AtomicUsize;
    pub static CUR: AtomicUsize = AtomicUsize::new(0);

    pub struct Rd { t: Vec<String>, p: usize }
    impl Rd {
        pub fn new() -> Rd {
            let mut s = String::new();
            std::io::stdin().read_to_string(&mut s).unwrap();
            Rd { t: s.split_ascii_whitespace().map(|x| x.to_string()).collect(), p: 0 }
        }
        fn nx(&mut self) -> &str { self.p += 1; if self.p <= self.t.len() { &self.t[self.p - 1] } else { "" } }
        pub fn i32(&mut self) -> i32 { self.nx().parse().unwrap_or(0) }
        pub fn i64(&mut self) -> i64 { self.nx().parse().unwrap_or(0) }
        pub fn usize(&mut self) -> usize { self.nx().parse().unwrap_or(0) }
        pub fn f64(&mut self) -> f64 { self.nx().parse().unwrap_or(0.0) }
        pub fn b(&mut self) -> bool { self.nx() == "1" }
        pub fn s(&mut self) -> String {
            let n = self.usize();
            let mut v: Vec<u8> = Vec::with_capacity(n);
            for _ in 0..n { let x: u8 = self.nx().parse().unwrap_or(0); v.push(x); }
            String::from_utf8(v).unwrap_or_default()
        }
    }

    pub trait J { fn j(&self) -> String; }
    impl J for i32 { fn j(&self) -> String { self.to_string() } }
    impl J for i64 { fn j(&self) -> String { self.to_string() } }
    impl J for usize { fn j(&self) -> String { self.to_string() } }
    impl J for f64 {
        fn j(&self) -> String { if self.is_finite() { format!("{:?}", self) } else { "null".to_string() } }
    }
    impl J for bool { fn j(&self) -> String { if *self { "true".to_string() } else { "false".to_string() } } }
    impl J for String {
        fn j(&self) -> String {
            let mut o = String::from("\\"");
            for c in self.chars() {
                match c {
                    '"' => o.push_str("\\\\\\""),
                    '\\\\' => o.push_str("\\\\\\\\"),
                    c if (c as u32) < 0x20 => o.push_str(&format!("\\\\u{:04x}", c as u32)),
                    c => o.push(c),
                }
            }
            o.push('"');
            o
        }
    }
    impl J for &str { fn j(&self) -> String { self.to_string().j() } }
    impl<T: J> J for Vec<T> {
        fn j(&self) -> String {
            let parts: Vec<String> = self.iter().map(|x| x.j()).collect();
            format!("[{}]", parts.join(","))
        }
    }

    pub fn out(s: &str) {
        let o = std::io::stdout();
        let mut l = o.lock();
        let _ = l.write_all(s.as_bytes());
        let _ = l.flush();
    }
}

fn __cdl_run() {
    use std::sync::atomic::Ordering as __CdlOrd;
    let mut r = __cdl::Rd::new();${
      wd
        ? `
    std::thread::spawn(|| {
        std::thread::sleep(std::time::Duration::from_millis(${wd}));
        __cdl::out(&format!("\\n${nonce}:{}:TLE\\n", __cdl::CUR.load(__CdlOrd::SeqCst)));
        std::process::exit(0);
    });`
        : ''
    }
    let t = r.usize();
    for i in 0..t {
        ${decls}
        __cdl::CUR.store(i, __CdlOrd::SeqCst);
        __cdl::out(&format!("\\n${nonce}:{}:BEGIN\\n", i));
        let t0 = std::time::Instant::now();
        let res = std::panic::catch_unwind(std::panic::AssertUnwindSafe(move || Solution::${fn}(${args})));
        let dt = t0.elapsed().as_secs_f64() * 1000.0;
        match res {
            Ok(v) => {
                let js = __cdl::J::j(&v);
                __cdl::out(&format!("\\n${nonce}:{}:T:{:.3}\\n", i, dt));
                __cdl::out(&format!("\\n${nonce}:{}:OK:{}\\n", i, js));
            }
            Err(e) => {
                let m = if let Some(s) = e.downcast_ref::<&str>() { s.to_string() }
                    else if let Some(s) = e.downcast_ref::<String>() { s.clone() }
                    else { "unknown".to_string() };
                let m: String = format!("panic: {}", m).replace('\\n', " ").chars().take(300).collect();
                __cdl::out(&format!("\\n${nonce}:{}:ERR:{}\\n", i, m));
            }
        }
    }
}

fn main() {
    std::panic::set_hook(Box::new(|_| {}));
    // Pila grande para recursiones profundas.
    let h = std::thread::Builder::new().stack_size(512 << 20).spawn(__cdl_run).unwrap();
    let _ = h.join();
}
`;
}

function csRead(t: ValueType): string {
  const el = elementType(t);
  if (el) return `Ra<${csharpType(el)}>(() => ${csRead(el)})`;
  return { int: 'Ri()', long: 'Rl()', double: 'Rd()', bool: 'Rb()', string: 'Rs()' }[t as 'int'];
}

export function csharpProgram(userCode: string, sig: Signature, nonce: string, wd: number): string {
  const method = pascalCase(sig.functionName);
  const decls = sig.params.map((p, i) => `${csharpType(p.type)} a${i} = ${csRead(p.type)};`).join(' ');
  const args = sig.params.map((_, i) => `a${i}`).join(', ');
  const arr = (t: string) =>
    `static string J(${t}[] a) { if (a == null) return "null"; var sb = new System.Text.StringBuilder("["); for (int k = 0; k < a.Length; k++) { if (k > 0) sb.Append(','); sb.Append(J(a[k])); } return sb.Append(']').ToString(); }`;
  return `using System; using System.Collections.Generic; using System.Linq; using System.Text;
#line 1
${userCode}
#line default
// ---- driver (no modificar) ----
public static class __CdlMain {
    static string[] T; static int P = 0;
    static volatile int Cur = 0;
    static System.IO.TextWriter O;
    static readonly System.Globalization.CultureInfo Inv = System.Globalization.CultureInfo.InvariantCulture;

    static string Nx() { return P < T.Length ? T[P++] : "0"; }
    static int Ri() { return int.Parse(Nx(), Inv); }
    static long Rl() { return long.Parse(Nx(), Inv); }
    static double Rd() { return double.Parse(Nx(), System.Globalization.NumberStyles.Float, Inv); }
    static bool Rb() { return Nx() == "1"; }
    static string Rs() { int n = Ri(); var b = new byte[n]; for (int k = 0; k < n; k++) b[k] = (byte) Ri(); return System.Text.Encoding.UTF8.GetString(b); }
    static X[] Ra<X>(System.Func<X> f) { int n = Ri(); var a = new X[n]; for (int k = 0; k < n; k++) a[k] = f(); return a; }

    static string J(int v) { return v.ToString(Inv); }
    static string J(long v) { return v.ToString(Inv); }
    static string J(double v) { return (double.IsNaN(v) || double.IsInfinity(v)) ? "null" : v.ToString("R", Inv); }
    static string J(bool v) { return v ? "true" : "false"; }
    static string J(string s) {
        if (s == null) return "null";
        var sb = new System.Text.StringBuilder("\\"");
        foreach (char c in s) {
            if (c == '"') sb.Append("\\\\\\"");
            else if (c == '\\\\') sb.Append("\\\\\\\\");
            else if (c < 0x20) sb.Append("\\\\u" + ((int) c).ToString("x4"));
            else sb.Append(c);
        }
        return sb.Append('"').ToString();
    }
    ${arr('int')}
    ${arr('long')}
    ${arr('double')}
    ${arr('bool')}
    ${arr('string')}
    ${arr('int[]')}
    ${arr('string[]')}

    static void W(string s) { lock (O) { O.Write(s); O.Flush(); } }

    public static void Main() {
        var so = new System.IO.StreamWriter(Console.OpenStandardOutput(), new System.Text.UTF8Encoding(false));
        so.AutoFlush = true;
        O = so;
        Console.SetOut(so);
        T = Console.In.ReadToEnd().Split((char[]) null, StringSplitOptions.RemoveEmptyEntries);${
          wd
            ? `
        var wd = new System.Threading.Thread(() => {
            System.Threading.Thread.Sleep(${wd});
            W("\\n${nonce}:" + Cur + ":TLE\\n");
            Environment.Exit(0);
        });
        wd.IsBackground = true;
        wd.Start();`
            : ''
        }
        // Pila grande para recursiones profundas.
        var th = new System.Threading.Thread(Run, 256 * 1024 * 1024);
        th.Start();
        th.Join();
    }

    static void Run() {
        int t = Ri();
        for (int i = 0; i < t; i++) {
            ${decls}
            Cur = i;
            W("\\n${nonce}:" + i + ":BEGIN\\n");
            try {
                var sol = new Solution();
                var sw = System.Diagnostics.Stopwatch.StartNew();
                var r = sol.${method}(${args});
                double dt = sw.Elapsed.TotalMilliseconds;
                string js = J(r);
                W("\\n${nonce}:" + i + ":T:" + dt.ToString("F3", Inv) + "\\n");
                W("\\n${nonce}:" + i + ":OK:" + js + "\\n");
            } catch (Exception e) {
                string m = (e.GetType().Name + ": " + e.Message).Replace('\\n', ' ');
                if (m.Length > 300) m = m.Substring(0, 300);
                W("\\n${nonce}:" + i + ":ERR:" + m + "\\n");
            }
        }
    }
}
`;
}

function tsRead(t: ValueType): string {
  const el = elementType(t);
  if (el) return `ra(function (): any { return ${tsRead(el)}; })`;
  return { int: 'rn()', long: 'rn()', double: 'rn()', bool: 'rb()', string: 'rs()' }[t as 'int'];
}

export function tsProgram(userCode: string, sig: Signature, nonce: string, wd: number): string {
  const fn = sig.functionName;
  const reads = sig.params.map((p) => tsRead(p.type)).join(', ');
  return `${userCode}

// ---- driver (no modificar) ----
;(function (): void {
  const __req: any = eval('require');
  const __g: any = globalThis as any;
  const fs: any = __req('fs');
  const toks: string[] = fs.readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean);
  let pos = 0;
  function rn(): number { return Number(toks[pos++]); }
  function rb(): boolean { return toks[pos++] === '1'; }
  function rs(): string {
    const n = rn(); const b = __g.Buffer.alloc(n);
    for (let j = 0; j < n; j++) b[j] = Number(toks[pos++]);
    return b.toString('utf8');
  }
  function ra(f: () => any): any[] { const n = rn(); const a = new Array(n); for (let j = 0; j < n; j++) a[j] = f(); return a; }
  function w(s: string): void { __g.process.stdout.write(s); }${
    wd
      ? `
  const vm: any = __req('vm'); const deadline = Date.now() + ${wd};
  function call(args: any[], i: number): any {
    const left = deadline - Date.now();
    try {
      if (left <= 0) throw { code: 'ERR_SCRIPT_EXECUTION_TIMEOUT' };
      return vm.runInNewContext('__f()', { __f: function () { return (${fn} as any).apply(null, args); } }, { timeout: left });
    } catch (e: any) {
      if (e && e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
        w('\\n${nonce}:' + i + ':TLE\\n');
        __g.process.exit(0);
      }
      throw e;
    }
  }`
      : `
  function call(args: any[], i: number): any { return (${fn} as any).apply(null, args); }`
  }
  const T = rn();
  for (let i = 0; i < T; i++) {
    const args: any[] = [${reads}];
    w('\\n${nonce}:' + i + ':BEGIN\\n');
    try {
      const t0 = __g.process.hrtime();
      const r = call(args, i);
      const dt = __g.process.hrtime(t0);
      const s = JSON.stringify(r === undefined ? null : r);
      w('\\n${nonce}:' + i + ':T:' + (dt[0] * 1e3 + dt[1] / 1e6).toFixed(3) + '\\n');
      w('\\n${nonce}:' + i + ':OK:' + s + '\\n');
    } catch (e: any) {
      const m = (e && e.name ? e.name + ': ' + e.message : String(e)).replace(/\\n/g, ' ').slice(0, 300);
      w('\\n${nonce}:' + i + ':ERR:' + m + '\\n');
    }
  }
})();
`;
}
