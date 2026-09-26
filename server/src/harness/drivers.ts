import { elementType, type Language, type Signature, type ValueType } from './types.js';
import { cppType, javaType } from './templates.js';

export interface BuiltProgram {
  source: string;
  lineOffset: number;
}

export function buildProgram(lang: Language, userCode: string, sig: Signature, nonce: string): BuiltProgram {
  switch (lang) {
    case 'python':
      return { source: userCode + '\n\n' + pythonDriver(sig, nonce), lineOffset: 0 };
    case 'javascript':
      return { source: userCode + '\n\n' + jsDriver(sig, nonce), lineOffset: 0 };
    case 'java':
      return { source: javaProgram(userCode, sig, nonce), lineOffset: 0 };
    case 'cpp':
      return { source: cppProgram(userCode, sig, nonce), lineOffset: 0 };
  }
}

function pyRead(t: ValueType): string {
  const el = elementType(t);
  if (el) return `[${pyRead(el)} for _ in range(ri())]`;
  return { int: 'ri()', long: 'ri()', double: 'rd()', bool: 'rb()', string: 'rs()' }[t as 'int'];
}

function pythonDriver(sig: Signature, nonce: string): string {
  const fn = sig.functionName;
  const reads = sig.params.map((p) => pyRead(p.type)).join(', ');
  return `# ---- driver (no modificar) ----
def __cdl_main():
    import sys, json
    sys.setrecursionlimit(20000)
    toks = sys.stdin.buffer.read().split()
    pos = [0]
    def nxt():
        pos[0] += 1
        return toks[pos[0] - 1]
    def ri():
        return int(nxt())
    def rd():
        return float(nxt())
    def rb():
        return nxt() == b'1'
    def rs():
        n = ri()
        b = bytes(int(x) for x in toks[pos[0]:pos[0] + n])
        pos[0] += n
        return b.decode('utf-8')
    g = globals()
    T = ri()
    for i in range(T):
        args = [${reads}]
        print("\\n${nonce}:%d:BEGIN" % i, flush=True)
        try:
            if 'Solution' in g:
                f = getattr(g['Solution'](), '${fn}')
            else:
                f = g['${fn}']
            r = f(*args)
            s = json.dumps(r, separators=(',', ':'), ensure_ascii=False)
            print("\\n${nonce}:%d:OK:%s" % (i, s), flush=True)
        except BaseException as e:
            m = (type(e).__name__ + ': ' + str(e)).replace('\\n', ' ')[:300]
            print("\\n${nonce}:%d:ERR:%s" % (i, m), flush=True)

__cdl_main()
`;
}

function jsRead(t: ValueType): string {
  const el = elementType(t);
  if (el) return `ra(function () { return ${jsRead(el)}; })`;
  return { int: 'rn()', long: 'rn()', double: 'rn()', bool: 'rb()', string: 'rs()' }[t as 'int'];
}

function jsDriver(sig: Signature, nonce: string): string {
  const fn = sig.functionName;
  const reads = sig.params.map((p) => jsRead(p.type)).join(', ');
  return `// ---- driver (no modificar) ----
;(function () {
  var fs = require('fs');
  var toks = fs.readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean);
  var pos = 0;
  function rn() { return Number(toks[pos++]); }
  function rb() { return toks[pos++] === '1'; }
  function rs() {
    var n = rn(); var b = Buffer.alloc(n);
    for (var j = 0; j < n; j++) b[j] = Number(toks[pos++]);
    return b.toString('utf8');
  }
  function ra(f) { var n = rn(); var a = new Array(n); for (var j = 0; j < n; j++) a[j] = f(); return a; }
  function w(s) { process.stdout.write(s); }
  var T = rn();
  for (var i = 0; i < T; i++) {
    var args = [${reads}];
    w('\\n${nonce}:' + i + ':BEGIN\\n');
    try {
      var f;
      if (typeof ${fn} === 'function') f = ${fn};
      else if (typeof Solution === 'function') { var inst = new Solution(); f = inst.${fn}.bind(inst); }
      else throw new ReferenceError('${fn} is not defined');
      var r = f.apply(null, args);
      var s = JSON.stringify(r === undefined ? null : r);
      w('\\n${nonce}:' + i + ':OK:' + s + '\\n');
    } catch (e) {
      var m = (e && e.name ? e.name + ': ' + e.message : String(e)).replace(/\\n/g, ' ').slice(0, 300);
      w('\\n${nonce}:' + i + ':ERR:' + m + '\\n');
    }
  }
})();
`;
}

function javaRead(t: ValueType): string {
  return {
    int: 'ri()',
    long: 'rl()',
    double: 'rd()',
    bool: 'rb()',
    string: 'rs()',
    'int[]': 'rIA()',
    'long[]': 'rLA()',
    'double[]': 'rDA()',
    'bool[]': 'rBA()',
    'string[]': 'rSA()',
    'int[][]': 'rIM()',
    'string[][]': 'rSM()',
  }[t];
}

const JAVA_PRELUDE = 'import java.util.*;import java.util.function.*;import java.util.stream.*;';

function javaProgram(userCode: string, sig: Signature, nonce: string): string {
  const code = userCode.replace(/\bpublic\s+(final\s+)?class\s+Solution\b/, (_m, fin) => `${fin ?? ''}class Solution`);
  const fn = sig.functionName;
  const decls = sig.params.map((p, i) => `${javaType(p.type)} a${i} = ${javaRead(p.type)};`).join(' ');
  const args = sig.params.map((_, i) => `a${i}`).join(', ');
  return `${JAVA_PRELUDE}${code}

public class Main {
    static byte[] B; static int P = 0;
    static String nx() {
        while (P < B.length && B[P] <= ' ') P++;
        int s = P;
        while (P < B.length && B[P] > ' ') P++;
        return new String(B, s, P - s);
    }
    static int ri() { return Integer.parseInt(nx()); }
    static long rl() { return Long.parseLong(nx()); }
    static double rd() { return Double.parseDouble(nx()); }
    static boolean rb() { return nx().equals("1"); }
    static String rs() { int n = ri(); byte[] b = new byte[n]; for (int j = 0; j < n; j++) b[j] = (byte) Integer.parseInt(nx()); return new String(b, java.nio.charset.StandardCharsets.UTF_8); }
    static int[] rIA() { int n = ri(); int[] a = new int[n]; for (int j = 0; j < n; j++) a[j] = ri(); return a; }
    static long[] rLA() { int n = ri(); long[] a = new long[n]; for (int j = 0; j < n; j++) a[j] = rl(); return a; }
    static double[] rDA() { int n = ri(); double[] a = new double[n]; for (int j = 0; j < n; j++) a[j] = rd(); return a; }
    static boolean[] rBA() { int n = ri(); boolean[] a = new boolean[n]; for (int j = 0; j < n; j++) a[j] = rb(); return a; }
    static String[] rSA() { int n = ri(); String[] a = new String[n]; for (int j = 0; j < n; j++) a[j] = rs(); return a; }
    static int[][] rIM() { int n = ri(); int[][] a = new int[n][]; for (int j = 0; j < n; j++) a[j] = rIA(); return a; }
    static String[][] rSM() { int n = ri(); String[][] a = new String[n][]; for (int j = 0; j < n; j++) a[j] = rSA(); return a; }

    static String j(int v) { return Integer.toString(v); }
    static String j(long v) { return Long.toString(v); }
    static String j(double v) { return (Double.isNaN(v) || Double.isInfinite(v)) ? "null" : Double.toString(v); }
    static String j(boolean v) { return v ? "true" : "false"; }
    static String j(String s) {
        if (s == null) return "null";
        StringBuilder sb = new StringBuilder("\\"");
        for (int k = 0; k < s.length(); k++) {
            char c = s.charAt(k);
            if (c == '"') sb.append("\\\\\\"");
            else if (c == '\\\\') sb.append("\\\\\\\\");
            else if (c < 0x20) sb.append(String.format("\\\\u%04x", (int) c));
            else sb.append(c);
        }
        return sb.append('"').toString();
    }
    static String j(int[] a) { if (a == null) return "null"; StringBuilder sb = new StringBuilder("["); for (int k = 0; k < a.length; k++) { if (k > 0) sb.append(','); sb.append(j(a[k])); } return sb.append(']').toString(); }
    static String j(long[] a) { if (a == null) return "null"; StringBuilder sb = new StringBuilder("["); for (int k = 0; k < a.length; k++) { if (k > 0) sb.append(','); sb.append(j(a[k])); } return sb.append(']').toString(); }
    static String j(double[] a) { if (a == null) return "null"; StringBuilder sb = new StringBuilder("["); for (int k = 0; k < a.length; k++) { if (k > 0) sb.append(','); sb.append(j(a[k])); } return sb.append(']').toString(); }
    static String j(boolean[] a) { if (a == null) return "null"; StringBuilder sb = new StringBuilder("["); for (int k = 0; k < a.length; k++) { if (k > 0) sb.append(','); sb.append(j(a[k])); } return sb.append(']').toString(); }
    static String j(String[] a) { if (a == null) return "null"; StringBuilder sb = new StringBuilder("["); for (int k = 0; k < a.length; k++) { if (k > 0) sb.append(','); sb.append(j(a[k])); } return sb.append(']').toString(); }
    static String j(int[][] a) { if (a == null) return "null"; StringBuilder sb = new StringBuilder("["); for (int k = 0; k < a.length; k++) { if (k > 0) sb.append(','); sb.append(j(a[k])); } return sb.append(']').toString(); }
    static String j(String[][] a) { if (a == null) return "null"; StringBuilder sb = new StringBuilder("["); for (int k = 0; k < a.length; k++) { if (k > 0) sb.append(','); sb.append(j(a[k])); } return sb.append(']').toString(); }

    public static void main(String[] argv) throws Exception {
        java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
        byte[] tmp = new byte[1 << 16]; int rd;
        while ((rd = System.in.read(tmp)) > 0) bo.write(tmp, 0, rd);
        B = bo.toByteArray();
        // Forzamos UTF-8 (la codificación por defecto de la JVM puede ser ASCII).
        System.setOut(new java.io.PrintStream(new java.io.BufferedOutputStream(new java.io.FileOutputStream(java.io.FileDescriptor.out), 1 << 16), true, "UTF-8"));
        java.io.PrintStream out = System.out;
        int T = ri();
        for (int i = 0; i < T; i++) {
            ${decls}
            out.print("\\n${nonce}:" + i + ":BEGIN\\n"); out.flush();
            try {
                ${javaType(sig.returnType)} r = new Solution().${fn}(${args});
                out.print("\\n${nonce}:" + i + ":OK:" + j(r) + "\\n"); out.flush();
            } catch (Throwable e) {
                String m = (e.getClass().getSimpleName() + ": " + e.getMessage()).replace('\\n', ' ');
                if (m.length() > 300) m = m.substring(0, 300);
                out.print("\\n${nonce}:" + i + ":ERR:" + m + "\\n"); out.flush();
            }
        }
    }
}
`;
}

function cppRead(t: ValueType): string {
  const el = elementType(t);
  if (el) return `__cdl::ra([&]() { return ${cppRead(el)}; })`;
  return { int: '__cdl::ri()', long: '__cdl::rl()', double: '__cdl::rd()', bool: '__cdl::rb()', string: '__cdl::rs()' }[
    t as 'int'
  ];
}

function cppProgram(userCode: string, sig: Signature, nonce: string): string {
  const fn = sig.functionName;
  const decls = sig.params.map((p, i) => `${cppType(p.type)} a${i} = ${cppRead(p.type)};`).join(' ');
  const args = sig.params.map((_, i) => `a${i}`).join(', ');
  return `#include <bits/stdc++.h>
using namespace std;
#line 1
${userCode}

// ---- driver (no modificar) ----
namespace __cdl {
    static vector<string> T; static size_t P = 0;
    inline const string& nx() { static const string empty; return P < T.size() ? T[P++] : empty; }
    inline int ri() { return (int) stoll(nx()); }
    inline long long rl() { return stoll(nx()); }
    inline double rd() { return stod(nx()); }
    inline bool rb() { return nx() == "1"; }
    inline string rs() { int n = ri(); string s(n, '\\0'); for (int k = 0; k < n; k++) s[k] = (char) stoi(nx()); return s; }
    template <class F> auto ra(F f) -> vector<decltype(f())> {
        int n = ri(); vector<decltype(f())> v; v.reserve(n);
        for (int k = 0; k < n; k++) v.push_back(f());
        return v;
    }
    inline string j(int v) { return to_string(v); }
    inline string j(long long v) { return to_string(v); }
    inline string j(double v) {
        if (std::isnan(v) || std::isinf(v)) return "null";
        char b[64]; snprintf(b, sizeof b, "%.17g", v); return b;
    }
    inline string j(bool v) { return v ? "true" : "false"; }
    inline string j(const string& s) {
        string o = "\\"";
        for (unsigned char c : s) {
            if (c == '"') o += "\\\\\\"";
            else if (c == '\\\\') o += "\\\\\\\\";
            else if (c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\\\u%04x", c); o += b; }
            else o += (char) c;
        }
        return o + "\\"";
    }
    inline string j(const vector<bool>& v) {
        string o = "["; for (size_t k = 0; k < v.size(); k++) { if (k) o += ","; o += j((bool) v[k]); } return o + "]";
    }
    template <class X> string j(const vector<X>& v) {
        string o = "["; for (size_t k = 0; k < v.size(); k++) { if (k) o += ","; o += j(v[k]); } return o + "]";
    }
}

int main() {
    {
        string all; char buf[1 << 16]; size_t n;
        while ((n = fread(buf, 1, sizeof buf, stdin)) > 0) all.append(buf, n);
        string cur;
        for (char c : all) {
            if ((unsigned char) c <= ' ') { if (!cur.empty()) { __cdl::T.push_back(cur); cur.clear(); } }
            else cur += c;
        }
        if (!cur.empty()) __cdl::T.push_back(cur);
    }
    int T = __cdl::ri();
    for (int i = 0; i < T; i++) {
        ${decls}
        cout << "\\n${nonce}:" << i << ":BEGIN" << endl;
        try {
            Solution sol;
            ${cppType(sig.returnType)} r = sol.${fn}(${args});
            cout << "\\n${nonce}:" << i << ":OK:" << __cdl::j(r) << endl;
        } catch (const std::exception& e) {
            string m = string("exception: ") + e.what();
            for (char& c : m) if (c == '\\n') c = ' ';
            cout << "\\n${nonce}:" << i << ":ERR:" << m.substr(0, 300) << endl;
        } catch (...) {
            cout << "\\n${nonce}:" << i << ":ERR:unknown exception" << endl;
        }
    }
    return 0;
}
`;
}
