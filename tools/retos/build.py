#!/usr/bin/env python3
"""
Constructor y validador de retos diarios.

Uso:
    python3 tools/retos/build.py retos/specs/2026-09-27.py   # genera retos/2026-09-27.json
    python3 tools/retos/build.py --list                      # lista los retos existentes (para no repetir)
    python3 tools/retos/build.py --status                    # qué días faltan en el colchón

Un "spec" es un fichero Python que define DATE y llama a problem(...) cuatro
veces (niveles 1-4). Para cada problema:
  - `reference` (obligatoria): solución correcta en Python (class Solution).
    Se ejecuta para calcular la salida esperada de TODOS los tests.
  - `brute` (muy recomendable): solución ingenua y obviamente correcta. Se
    contrasta con la referencia en los tests pequeños para detectar errores.
    Si un caso es demasiado grande para ella, puede lanzar NotImplementedError
    y el constructor lo salta.
El spec puede usar `random` (ya sembrado con la fecha, así que es reproducible).

Compatible con Python 3.8+ y sin dependencias externas.
"""
import datetime as _dt
import glob
import hashlib
import json
import math
import os
import random
import re
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RETOS_DIR = os.path.join(ROOT, "retos")
SEED_FILE = os.path.join(ROOT, "server", "src", "seed", "problems.json")

VALUE_TYPES = ["int", "long", "double", "bool", "string", "int[]", "long[]", "double[]",
               "bool[]", "string[]", "int[][]", "string[][]"]
COMPARE_MODES = ["exact", "unordered", "unordered-deep"]
IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
INT_MIN, INT_MAX = -2 ** 31, 2 ** 31 - 1
SAFE = 2 ** 53 - 1
BRUTE_MAX_INPUT_CHARS = 3000
BRUTE_TIME_BUDGET = 20.0
MAX_DAY_MB = 4.0               # tamaño máximo del JSON de un día
MAX_TEST_KB = 700              # entrada de un solo test
MAX_PROBLEM_KB = 2000          # entrada de todos los casos de un problema
MAX_OUTPUT_KB = 110            # salida esperada de un solo test (JSON)
MAX_PROBLEM_OUTPUT_KB = 500


class SpecError(Exception):
    pass


def _num(v):
    if isinstance(v, float) and v.is_integer() and abs(v) < 1e21:
        return str(int(v))
    return repr(v)


def encoded_len(v, t):
    """Caracteres que ocupa un valor en la entrada del programa (ver encode.ts)."""
    if t.endswith("[]"):
        return len(str(len(v))) + sum(1 + encoded_len(x, t[:-2]) for x in v)
    if t in ("int", "long"):
        return len(str(int(v)))
    if t == "double":
        return len(_num(v))
    if t == "bool":
        return 1
    b = v.encode("utf-8")
    return len(str(len(b))) + sum(1 + len(str(x)) for x in b)


def check_value(v, t, path):
    if t.endswith("[]"):
        if not isinstance(v, list):
            raise SpecError(f"{path}: se esperaba lista ({t}), hay {type(v).__name__}")
        for i, x in enumerate(v):
            check_value(x, t[:-2], f"{path}[{i}]")
        return
    if t == "int":
        if isinstance(v, bool) or not isinstance(v, int) or not (INT_MIN <= v <= INT_MAX):
            raise SpecError(f"{path}: se esperaba int de 32 bits, hay {v!r}")
    elif t == "long":
        if isinstance(v, bool) or not isinstance(v, int) or abs(v) > SAFE:
            raise SpecError(f"{path}: se esperaba long (|x| <= 2^53-1), hay {v!r}")
    elif t == "double":
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
            raise SpecError(f"{path}: se esperaba número finito, hay {v!r}")
    elif t == "bool":
        if not isinstance(v, bool):
            raise SpecError(f"{path}: se esperaba bool, hay {v!r}")
    elif t == "string":
        if not isinstance(v, str):
            raise SpecError(f"{path}: se esperaba string, hay {v!r}")
    else:
        raise SpecError(f"{path}: tipo desconocido {t}")


def normalize(v, t):
    """Convierte la salida de Python al tipo declarado (tuplas->listas, int->float en double)."""
    if t.endswith("[]"):
        if isinstance(v, (list, tuple)):
            return [normalize(x, t[:-2]) for x in v]
        return v
    if t == "double" and isinstance(v, int) and not isinstance(v, bool):
        return float(v)
    return v


def num_eq(a, b):
    if isinstance(a, int) and isinstance(b, int):
        return a == b
    d = abs(a - b)
    return d <= 1e-6 or d <= 1e-6 * max(abs(a), abs(b))


def deep_eq(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return a is b if isinstance(a, bool) and isinstance(b, bool) else False
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return num_eq(a, b)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(deep_eq(x, y) for x, y in zip(a, b))
    return a == b


def _key(x):
    return (0, x, "") if isinstance(x, (int, float)) and not isinstance(x, bool) else (1, 0, json.dumps(x, sort_keys=True))


def sort_top(v):
    return sorted(v, key=_key) if isinstance(v, list) else v


def sort_deep(v):
    return sorted([sort_deep(x) for x in v], key=_key) if isinstance(v, list) else v


def outputs_match(expected, actual, mode):
    if mode == "unordered":
        return deep_eq(sort_top(expected), sort_top(actual))
    if mode == "unordered-deep":
        return deep_eq(sort_deep(expected), sort_deep(actual))
    return deep_eq(expected, actual)


def load_solution(code, fn_name, label):
    ns = {}
    try:
        exec(compile("from typing import List, Optional, Dict, Tuple\n" + code, label, "exec"), ns)
    except Exception as e:
        raise SpecError(f"{label}: no compila: {e!r}")
    if "Solution" not in ns:
        raise SpecError(f"{label}: debe definir class Solution")
    sol = ns["Solution"]()
    if not hasattr(sol, fn_name):
        raise SpecError(f"{label}: Solution no tiene el método {fn_name}")
    return getattr(sol, fn_name)


def deep_copy(v):
    return json.loads(json.dumps(v))


def existing_problems():
    """Todos los retos ya existentes (seed + retos/*.json) como lista de dicts resumidos."""
    out = []
    if os.path.exists(SEED_FILE):
        with open(SEED_FILE, encoding="utf-8") as f:
            for p in json.load(f):
                out.append({"date": "seed", "level": p["level"], "slug": p["slug"],
                            "title": p["title"]["es"], "tags": p.get("tags", []),
                            "functionName": p["signature"]["functionName"]})
    for path in sorted(glob.glob(os.path.join(RETOS_DIR, "*.json"))):
        try:
            with open(path, encoding="utf-8") as f:
                day = json.load(f)
        except Exception:
            continue
        for p in day.get("problems", []):
            out.append({"date": day.get("date"), "level": p["level"], "slug": p["slug"],
                        "title": p["title"]["es"], "tags": p.get("tags", []),
                        "functionName": p["signature"]["functionName"]})
    return out


def validate_meta(p, idx):
    label = f"problema #{idx + 1} ({p.get('slug', '?')})"
    required = ["level", "slug", "title", "statement", "signature", "examples", "tests", "reference"]
    for k in required:
        if k not in p:
            raise SpecError(f"{label}: falta el campo '{k}'")
    if p["level"] not in (1, 2, 3, 4):
        raise SpecError(f"{label}: level debe ser 1-4")
    if not SLUG.match(p["slug"]):
        raise SpecError(f"{label}: slug inválido (minúsculas, números y guiones)")
    for field in ("title", "statement"):
        v = p[field]
        if not isinstance(v, dict) or not v.get("es", "").strip() or not v.get("en", "").strip():
            raise SpecError(f"{label}: {field} necesita textos 'es' y 'en'")
    sig = p["signature"]
    if not IDENT.match(sig.get("functionName", "")):
        raise SpecError(f"{label}: functionName inválido")
    names = set()
    for prm in sig.get("params", []):
        if not IDENT.match(prm.get("name", "")) or prm["name"] in names:
            raise SpecError(f"{label}: parámetro inválido o repetido: {prm}")
        names.add(prm["name"])
        if prm.get("type") not in VALUE_TYPES:
            raise SpecError(f"{label}: tipo no soportado {prm.get('type')} (usa {', '.join(VALUE_TYPES)})")
    if sig.get("returnType") not in VALUE_TYPES:
        raise SpecError(f"{label}: returnType no soportado {sig.get('returnType')}")
    if p.get("compare", "exact") not in COMPARE_MODES:
        raise SpecError(f"{label}: compare debe ser {COMPARE_MODES}")
    if not (1 <= len(p["examples"]) <= 4):
        raise SpecError(f"{label}: pon entre 1 y 4 ejemplos")
    if len(p["tests"]) < 6:
        raise SpecError(f"{label}: pon al menos 6 tests ocultos")
    if len(p["examples"]) + len(p["tests"]) > 25:
        raise SpecError(f"{label}: máximo 25 casos entre ejemplos y tests")
    return label


def build_problem(p, idx):
    label = validate_meta(p, idx)
    sig = p["signature"]
    params = sig["params"]
    ret = sig["returnType"]
    compare = p.get("compare", "exact")

    cases = [("ejemplo", i, c) for i, c in enumerate(p["examples"])] + [("test", i, c) for i, c in enumerate(p["tests"])]
    for kind, i, c in cases:
        if not isinstance(c.get("input"), list) or len(c["input"]) != len(params):
            raise SpecError(f"{label}: {kind} {i}: input debe ser una lista con {len(params)} valores")
        for j, prm in enumerate(params):
            check_value(c["input"][j], prm["type"], f"{label}: {kind} {i}.{prm['name']}")

    total_kb = 0.0
    for kind, i, c in cases:
        kb = sum(1 + encoded_len(c["input"][j], prm["type"]) for j, prm in enumerate(params)) / 1000
        total_kb += kb
        if kb > MAX_TEST_KB:
            raise SpecError(
                f"{label}: {kind} {i}: la entrada ocupa {kb:.0f} KB (máximo {MAX_TEST_KB} KB por test, "
                f"el motor no acepta peticiones de más de 1 MB): reduce ese test"
            )
    if total_kb > MAX_PROBLEM_KB:
        raise SpecError(f"{label}: las entradas suman {total_kb:.0f} KB (máximo {MAX_PROBLEM_KB} KB): reduce los tests grandes")

    ref = load_solution(p["reference"], sig["functionName"], f"{label} reference")
    brute = load_solution(p["brute"], sig["functionName"], f"{label} brute") if p.get("brute") else None

    t0 = time.time()
    for kind, i, c in cases:
        try:
            out = ref(*deep_copy(c["input"]))
        except Exception as e:
            raise SpecError(f"{label}: la referencia falla en {kind} {i}: {e!r}")
        out = normalize(out, ret)
        check_value(out, ret, f"{label}: salida de {kind} {i}")
        if "output" in c and not outputs_match(c["output"], out, compare):
            raise SpecError(f"{label}: {kind} {i}: el output escrito a mano {c['output']!r} no coincide con la referencia {out!r}")
        c["output"] = out
    ref_time = time.time() - t0

    out_total = 0.0
    for kind, i, c in cases:
        kb = len(json.dumps(c["output"], separators=(",", ":"), ensure_ascii=False).encode("utf-8")) / 1000
        out_total += kb
        if kb > MAX_OUTPUT_KB:
            raise SpecError(
                f"{label}: {kind} {i}: la salida esperada ocupa {kb:.0f} KB (máximo {MAX_OUTPUT_KB} KB por test, "
                f"el motor corta la salida a 128 KB): reduce ese test"
            )
    if out_total > MAX_PROBLEM_OUTPUT_KB:
        raise SpecError(f"{label}: las salidas suman {out_total:.0f} KB (máximo {MAX_PROBLEM_OUTPUT_KB} KB): reduce los tests con salidas grandes")

    checked = 0
    if brute:
        start = time.time()
        for kind, i, c in cases:
            if len(json.dumps(c["input"])) > BRUTE_MAX_INPUT_CHARS:
                continue
            if time.time() - start > BRUTE_TIME_BUDGET:
                break
            try:
                b = normalize(brute(*deep_copy(c["input"])), ret)
            except NotImplementedError:
                continue
            except Exception as e:
                raise SpecError(f"{label}: la fuerza bruta falla en {kind} {i}: {e!r}")
            if not outputs_match(c["output"], b, compare):
                raise SpecError(
                    f"{label}: referencia y fuerza bruta NO coinciden en {kind} {i}\n"
                    f"  input: {json.dumps(c['input'])[:300]}\n  referencia: {json.dumps(c['output'])[:300]}\n"
                    f"  fuerza bruta: {json.dumps(b)[:300]}"
                )
            checked += 1

    distinct = {json.dumps(sort_deep(c["output"]) if compare != "exact" else c["output"]) for _, _, c in cases}
    warnings = []
    if ret != "bool" and len(distinct) < max(3, len(cases) // 3):
        warnings.append(f"solo {len(distinct)} salidas distintas en {len(cases)} casos: ¿tests poco variados?")
    if ref_time > 3:
        warnings.append(f"la referencia en Python tarda {ref_time:.1f}s en total: quizá los tests grandes son demasiado grandes")
    editorial = p.get("editorial")
    if editorial is not None:
        if not isinstance(editorial, dict) or not all(isinstance(editorial.get(k), str) and editorial[k].strip() for k in ("es", "en")):
            raise SpecError(f"{label}: editorial debe tener textos 'es' y 'en' (markdown con la idea, los pasos y la complejidad)")
    else:
        warnings.append("sin editorial: los jugadores no verán la explicación de la solución")
    if brute is None:
        warnings.append("sin solución de fuerza bruta: las salidas solo dependen de la referencia")
    elif checked < 4:
        warnings.append(f"la fuerza bruta solo se ha contrastado en {checked} casos")

    problem = {
        "slug": p["slug"],
        "level": p["level"],
        "title": p["title"],
        "statement": p["statement"],
        "constraints": p.get("constraints", []),
        "tags": p.get("tags", []),
        "signature": sig,
        "compare": compare,
        "examples": [{k: v for k, v in c.items() if k in ("input", "output", "explanation")} for c in p["examples"]],
        "tests": [{"input": c["input"], "output": c["output"]} for c in p["tests"]],
        "referenceSolution": {"language": "python", "code": "from typing import List\n\n" + p["reference"].strip("\n") + "\n"},
        **({"editorial": editorial} if editorial else {}),
        "timeLimit": p.get("timeLimit", 5),
    }
    return problem, {"label": label, "ref_time": ref_time, "brute_checked": checked, "warnings": warnings}


def build_spec(path):
    with open(path, encoding="utf-8") as f:
        src = f.read()
    m = re.search(r'^DATE\s*=\s*["\'](\d{4}-\d{2}-\d{2})["\']', src, re.M)
    if not m:
        raise SpecError("el spec debe definir DATE = 'AAAA-MM-DD'")
    date = m.group(1)
    _dt.date.fromisoformat(date)
    specs = []
    rnd_seed = int(date.replace("-", ""))
    random.seed(rnd_seed)
    ns = {"problem": lambda **kw: specs.append(kw), "random": random, "__name__": "__spec__"}
    exec(compile(src, path, "exec"), ns)

    levels = sorted(p.get("level") for p in specs)
    if levels != [1, 2, 3, 4]:
        raise SpecError(f"el spec debe tener exactamente un problema por nivel 1-4 (tiene {levels})")
    slugs = [p.get("slug") for p in specs]
    if len(set(slugs)) != 4:
        raise SpecError("hay slugs repetidos dentro del spec")
    taken = {e["slug"]: e["date"] for e in existing_problems() if e["date"] != date}
    for s in slugs:
        if s in taken:
            raise SpecError(f"el slug '{s}' ya existe (día {taken[s]}): elige otro problema o slug")

    problems, reports = [], []
    for i, p in enumerate(sorted(specs, key=lambda x: x["level"])):
        prob, rep = build_problem(p, i)
        problems.append(prob)
        reports.append(rep)

    day = {"date": date, "generatedAt": _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"),
           "generator": "tools/retos/build.py", "problems": problems}
    body = json.dumps(day, ensure_ascii=False, separators=(",", ":"))
    day["hash"] = hashlib.sha256(body.encode("utf-8")).hexdigest()[:16]
    size_mb = len(body.encode("utf-8")) / 1e6
    if size_mb > MAX_DAY_MB:
        raise SpecError(f"el día ocupa {size_mb:.1f} MB (máximo {MAX_DAY_MB} MB): reduce los tests grandes (10^5 elementos como mucho, uno o dos por problema)")
    os.makedirs(RETOS_DIR, exist_ok=True)
    out = os.path.join(RETOS_DIR, f"{date}.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(day, f, ensure_ascii=False, separators=(",", ":"))
    return out, reports


def madrid_today():
    now = _dt.datetime.now(_dt.timezone.utc)
    y = now.year
    def last_sunday(month):
        d = _dt.datetime(y, month + 1, 1, tzinfo=_dt.timezone.utc) - _dt.timedelta(days=1) if month < 12 else _dt.datetime(y, 12, 31, tzinfo=_dt.timezone.utc)
        return d - _dt.timedelta(days=(d.weekday() + 1) % 7)
    start = last_sunday(3).replace(hour=1)
    end = last_sunday(10).replace(hour=1)
    offset = 2 if start <= now < end else 1
    return (now + _dt.timedelta(hours=offset)).date()


def main(argv):
    if len(argv) >= 1 and argv[0] == "--list":
        rows = existing_problems()
        for r in rows:
            tags = ",".join(r["tags"])
            print(f"{r['date']:>10}  L{r['level']}  {r['slug']:<34} {r['functionName']:<26} {tags:<30} {r['title']}")
        print(f"\n{len(rows)} retos en total")
        return 0
    if len(argv) >= 1 and argv[0] == "--status":
        days = int(argv[1]) if len(argv) > 1 else 3
        today = madrid_today()
        have = {os.path.basename(p)[:-5] for p in glob.glob(os.path.join(RETOS_DIR, "*.json"))}
        print(f"hoy (Europe/Madrid): {today}")
        missing = []
        for k in range(1, days + 1):
            d = (today + _dt.timedelta(days=k)).isoformat()
            ok = d in have
            print(f"  {d}: {'OK' if ok else 'FALTA'}")
            if not ok:
                missing.append(d)
        print("FALTAN: " + (" ".join(missing) if missing else "ninguno"))
        return 0
    if len(argv) != 1:
        print(__doc__)
        return 2
    try:
        out, reports = build_spec(argv[0])
    except SpecError as e:
        print(f"ERROR: {e}")
        return 1
    print(f"OK: {os.path.relpath(out, ROOT)}")
    for r in reports:
        print(f"  {r['label']}: referencia {r['ref_time']:.2f}s, fuerza bruta contrastada en {r['brute_checked']} casos")
        for w in r["warnings"]:
            print(f"    AVISO: {w}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
