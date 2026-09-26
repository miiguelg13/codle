#!/usr/bin/env python3
"""
Sube días de retos (retos/AAAA-MM-DD.json) a la web publicada.

Configuración: un fichero `.codle-deploy` en la raíz del proyecto (no se sube a git) con:
    URL=https://tu-app.onrender.com
    TOKEN=<valor de RETOS_UPLOAD_TOKEN en Render>
(o las variables de entorno CODLE_URL y CODLE_UPLOAD_TOKEN).

Solo sube los ficheros que han cambiado desde la última subida correcta
(se recuerda en `.codle-deploy-estado.json`); con --forzar los sube todos.

Uso:
    python3 tools/retos/upload.py --pendientes        # todos los días desde hoy
    python3 tools/retos/upload.py --todos             # todos los ficheros
    python3 tools/retos/upload.py retos/2026-09-28.json [...]
"""
import glob
import json
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import RETOS_DIR, ROOT, madrid_today  # noqa: E402


def load_config():
    cfg = {"URL": os.environ.get("CODLE_URL", ""), "TOKEN": os.environ.get("CODLE_UPLOAD_TOKEN", "")}
    path = os.path.join(ROOT, ".codle-deploy")
    if os.path.exists(path):
        with open(path, encoding="utf-8-sig") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    cfg[k.strip().upper()] = v.strip()
    if not cfg["URL"] or not cfg["TOKEN"] or "PON-AQUI" in cfg["URL"] or "PEGA-AQUI" in cfg["TOKEN"]:
        return None
    cfg["URL"] = cfg["URL"].rstrip("/")
    return cfg


def upload(cfg, path):
    with open(path, "rb") as f:
        body = f.read()
    req = urllib.request.Request(
        cfg["URL"] + "/api/retos/upload",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + cfg["TOKEN"]},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"errors": [f"HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}"]}
    except Exception as e:  # red, DNS, proxy…
        return {"errors": [f"no se pudo conectar con {cfg['URL']}: {e}"]}


STATE_FILE = os.path.join(ROOT, ".codle-deploy-estado.json")


def load_state():
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_state(state):
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=1)
    except Exception as e:
        print(f"AVISO: no se pudo guardar {STATE_FILE}: {e}")


def file_hash(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f).get("hash") or str(os.path.getmtime(path))
    except Exception:
        return str(os.path.getmtime(path))


def main(argv):
    force = "--forzar" in argv
    argv = [a for a in argv if a != "--forzar"]
    cfg = load_config()
    if not cfg:
        print("Sin configurar: crea el fichero .codle-deploy con URL=... y TOKEN=... (ver DESPLIEGUE.md). No se sube nada.")
        return 0
    files = []
    if not argv or argv[0] == "--pendientes":
        today = madrid_today().isoformat()
        files = [p for p in sorted(glob.glob(os.path.join(RETOS_DIR, "*.json"))) if os.path.basename(p)[:10] >= today]
    elif argv[0] == "--todos":
        files = sorted(glob.glob(os.path.join(RETOS_DIR, "*.json")))
    else:
        files = argv
    if not files:
        print("No hay ficheros que subir.")
        return 0
    state = load_state()
    key = cfg["URL"]
    done = state.setdefault(key, {})
    pending = [p for p in files if force or done.get(os.path.basename(p)) != file_hash(p)]
    if not pending:
        print(f"Nada nuevo que subir ({len(files)} ficheros ya estaban subidos).")
        return 0
    failed = False
    for p in pending:
        r = upload(cfg, p)
        name = os.path.basename(p)
        errs = r.get("errors", [])
        print(f"{name}: importados {len(r.get('imported', []))}, actualizados {len(r.get('updated', []))}, "
              f"omitidos {len(r.get('skipped', []))}, errores {len(errs)}")
        for e in errs:
            print(f"  ERROR: {e}")
        failed = failed or bool(errs)
        if not errs:
            done[name] = file_hash(p)
    save_state(state)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
