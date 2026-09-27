import './admin.css';
import Editor from '@monaco-editor/react';
import { useEffect, useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LANGUAGES, type Language } from '../../lib/api';
import {
  adminApi,
  SOURCE_LABEL,
  STATUS_LABEL,
  VALUE_TYPES,
  type AdminCase,
  type AdminProblem,
  type TryResult,
  type ValueType,
} from '../../lib/adminApi';
import { addDays, formatValue, LANGUAGE_LABELS } from '../../lib/format';
import { defineCodleTheme, MONACO_LANG } from '../../lib/monaco';
import { useTheme } from '../../lib/theme';
import { AdminGate, adminError } from './AdminGate';

const LANGS: readonly Language[] = LANGUAGES;
const LEVELS = ['', 'Fácil', 'Medio', 'Difícil', 'Experto'];
type Tab = 'datos' | 'enunciado' | 'casos' | 'solucion' | 'probar';

function emptyProblem(date: string, level: number): AdminProblem {
  return {
    slug: '',
    date,
    level,
    status: 'draft',
    title: { es: '', en: '' },
    statement: { es: '', en: '' },
    constraints: [],
    tags: [],
    signature: { functionName: 'solve', params: [{ name: 'nums', type: 'int[]' }], returnType: 'int' },
    compare: 'exact',
    timeLimit: 5,
    examples: [{ input: [[1, 2, 3]] }],
    tests: [],
    referenceSolution: {
      language: 'python',
      code: 'class Solution:\n    def solve(self, nums):\n        return sum(nums)\n',
    },
  };
}

const casesToText = (c: AdminCase[]) =>
  '[\n' + c.map((x) => '  ' + JSON.stringify(x)).join(',\n') + (c.length ? '\n' : '') + ']';

function parseCases(text: string, label: string): AdminCase[] {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch (e) {
    throw new Error(`${label}: JSON no válido (${(e as Error).message})`);
  }
  if (!Array.isArray(v)) throw new Error(`${label}: debe ser un array`);
  v.forEach((c, i) => {
    if (!c || typeof c !== 'object' || !Array.isArray((c as AdminCase).input))
      throw new Error(`${label} ${i + 1}: cada caso es un objeto {"input": [...], "output": ...}`);
  });
  return v as AdminCase[];
}

export default function AdminEditPage() {
  return (
    <AdminGate>
      <Editor_ />
    </AdminGate>
  );
}

function Editor_() {
  const { monacoTheme } = useTheme();
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const [p, setP] = useState<AdminProblem | null>(null);
  const [examplesText, setExamplesText] = useState('');
  const [testsText, setTestsText] = useState('');
  const [tab, setTab] = useState<Tab>('datos');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tryLang, setTryLang] = useState<Language>('python');
  const [tryCode, setTryCode] = useState('');
  const [tryResult, setTryResult] = useState<TryResult | null>(null);

  const load = (prob: AdminProblem) => {
    setP(prob);
    setExamplesText(casesToText(prob.examples));
    setTestsText(casesToText(prob.tests));
    setDirty(false);
    if (prob.referenceSolution) {
      setTryLang(prob.referenceSolution.language);
      setTryCode(prob.referenceSolution.code);
    }
  };

  useEffect(() => {
    if (isNew) {
      const today = new Date().toISOString().slice(0, 10);
      load(emptyProblem(search.get('date') ?? addDays(today, 1), Number(search.get('level') ?? 1)));
      return;
    }
    adminApi
      .get(id!)
      .then(load)
      .catch((e) => setError(adminError(e)));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aviso al salir con cambios sin guardar
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const update = (patch: Partial<AdminProblem>) => {
    setP((cur) => (cur ? { ...cur, ...patch } : cur));
    setDirty(true);
  };

  const current = (): AdminProblem => {
    if (!p) throw new Error('sin datos');
    return { ...p, examples: parseCases(examplesText, 'Ejemplo'), tests: parseCases(testsText, 'Test') };
  };

  const act = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error && !('code' in e) ? e.message : adminError(e));
    } finally {
      setBusy(null);
    }
  };

  const save = () =>
    act('save', async () => {
      const prob = current();
      if (isNew) {
        const created = await adminApi.create(prob);
        load(created);
        navigate(`/admin/problems/${created.id}`, { replace: true });
      } else {
        load(await adminApi.update(id!, prob));
      }
      setInfo('Guardado ✓');
    });

  const recompute = () =>
    act('compute', async () => {
      const r = await adminApi.computeOutputs(current());
      setExamplesText(casesToText(r.examples));
      setTestsText(casesToText(r.tests));
      setDirty(true);
      setInfo(`Salidas recalculadas con la referencia (${r.timeMs ?? '?'} ms). Recuerda guardar.`);
    });

  const runTry = () =>
    act('try', async () => {
      setTryResult(await adminApi.tryCode(current(), tryLang, tryCode));
    });

  const remove = () =>
    act('delete', async () => {
      if (!window.confirm('¿Borrar este reto definitivamente?')) return;
      await adminApi.remove(id!);
      setDirty(false);
      navigate('/admin');
    });

  const previewCases = useMemo(() => {
    try {
      return parseCases(examplesText, 'Ejemplo');
    } catch {
      return null;
    }
  }, [examplesText]);

  if (error && !p) return <main className="page"><p className="error-box">{error}</p></main>;
  if (!p) return <main className="page"><p className="muted">Cargando…</p></main>;

  const sig = p.signature;
  const setParam = (i: number, patch: Partial<{ name: string; type: ValueType }>) =>
    update({ signature: { ...sig, params: sig.params.map((x, j) => (j === i ? { ...x, ...patch } : x)) } });

  return (
    <main className="page admin-page wide admin-edit">
      <div className="admin-head">
        <div>
          <Link to="/admin" className="back">
            ← Administración
          </Link>
          <h1>{isNew ? 'Nuevo reto' : p.title.es || p.slug}</h1>
          {!isNew && (
            <p className="muted small">
              {SOURCE_LABEL[p.source ?? ''] ?? p.source} · {p.players ?? 0} jugadores
              {p.players ? ' · ojo: cambiar los tests afecta a quien ya lo está jugando' : ''}
            </p>
          )}
        </div>
        <div className="admin-actions">
          <select value={p.status} onChange={(e) => update({ status: e.target.value as AdminProblem['status'] })}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {!isNew && (
            <button className="btn secondary" onClick={remove} disabled={!!busy}>
              Borrar
            </button>
          )}
          <button className="btn primary" onClick={save} disabled={!!busy}>
            {busy === 'save' ? 'Guardando…' : dirty ? 'Guardar *' : 'Guardar'}
          </button>
        </div>
      </div>

      {error && <p className="error-box">{error}</p>}
      {info && <p className="notice ok small">{info}</p>}

      <div className="tabs admin-tabs">
        {(
          [
            ['datos', 'Datos y firma'],
            ['enunciado', 'Enunciado'],
            ['casos', 'Ejemplos y tests'],
            ['solucion', 'Solución de referencia'],
            ['probar', 'Probar una solución'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="admin-edit-grid">
        <section className="panel form">
          {tab === 'datos' && (
            <>
              <div className="row">
                <label>
                  Fecha
                  <input type="date" value={p.date} onChange={(e) => update({ date: e.target.value })} />
                </label>
                <label>
                  Nivel
                  <select value={p.level} onChange={(e) => update({ level: Number(e.target.value) })}>
                    {[1, 2, 3, 4].map((l) => (
                      <option key={l} value={l}>
                        {l} · {LEVELS[l]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tiempo (s)
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={p.timeLimit}
                    onChange={(e) => update({ timeLimit: Number(e.target.value) })}
                  />
                </label>
              </div>
              <label>
                Slug
                <input
                  className="mono"
                  value={p.slug}
                  placeholder="nombre-del-reto"
                  onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                />
              </label>
              <label>
                Etiquetas (separadas por comas)
                <input
                  value={p.tags.join(', ')}
                  onChange={(e) =>
                    update({
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
              <label>
                Comparación de la salida
                <select value={p.compare} onChange={(e) => update({ compare: e.target.value as AdminProblem['compare'] })}>
                  <option value="exact">exacta (decimales con tolerancia 1e-6)</option>
                  <option value="unordered">sin orden en el array devuelto</option>
                  <option value="unordered-deep">sin orden a ningún nivel</option>
                </select>
              </label>

              <h3>Firma</h3>
              <div className="row">
                <label>
                  Función
                  <input
                    className="mono"
                    value={sig.functionName}
                    onChange={(e) => update({ signature: { ...sig, functionName: e.target.value } })}
                  />
                </label>
                <label>
                  Devuelve
                  <select
                    value={sig.returnType}
                    onChange={(e) => update({ signature: { ...sig, returnType: e.target.value as ValueType } })}
                  >
                    {VALUE_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
              {sig.params.map((prm, i) => (
                <div className="row param-row" key={i}>
                  <input className="mono" value={prm.name} onChange={(e) => setParam(i, { name: e.target.value })} />
                  <select value={prm.type} onChange={(e) => setParam(i, { type: e.target.value as ValueType })}>
                    {VALUE_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    className="ghost"
                    onClick={() => update({ signature: { ...sig, params: sig.params.filter((_, j) => j !== i) } })}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="ghost"
                onClick={() =>
                  update({ signature: { ...sig, params: [...sig.params, { name: `p${sig.params.length + 1}`, type: 'int' }] } })
                }
              >
                + Parámetro
              </button>
              <p className="muted small">
                Si cambias la firma, actualiza también los casos y la solución de referencia.
              </p>
            </>
          )}

          {tab === 'enunciado' && (
            <>
              <div className="row">
                <label>
                  Título (es)
                  <input value={p.title.es} onChange={(e) => update({ title: { ...p.title, es: e.target.value } })} />
                </label>
                <label>
                  Título (en)
                  <input value={p.title.en} onChange={(e) => update({ title: { ...p.title, en: e.target.value } })} />
                </label>
              </div>
              <label>
                Enunciado (es) · Markdown
                <textarea
                  rows={10}
                  value={p.statement.es}
                  onChange={(e) => update({ statement: { ...p.statement, es: e.target.value } })}
                />
              </label>
              <label>
                Enunciado (en) · Markdown
                <textarea
                  rows={10}
                  value={p.statement.en}
                  onChange={(e) => update({ statement: { ...p.statement, en: e.target.value } })}
                />
              </label>
              <label>
                Restricciones (una por línea)
                <textarea
                  className="mono"
                  rows={4}
                  value={p.constraints.join('\n')}
                  onChange={(e) => update({ constraints: e.target.value.split('\n').filter((l) => l.trim()) })}
                />
              </label>
            </>
          )}

          {tab === 'casos' && (
            <>
              <p className="muted small">
                Cada caso es <code>{'{"input": [arg1, arg2…], "output": …}'}</code>. Los ejemplos pueden llevar{' '}
                <code>{'"explanation": {"es": …, "en": …}'}</code>. Escribe solo los <code>input</code> y pulsa{' '}
                <strong>Recalcular salidas</strong> para que la solución de referencia rellene los <code>output</code>.
              </p>
              <button className="btn secondary" onClick={recompute} disabled={!!busy}>
                {busy === 'compute' ? 'Ejecutando la referencia…' : '⚙ Recalcular salidas con la referencia'}
              </button>
              <label>
                Ejemplos (visibles)
                <textarea
                  className="mono"
                  rows={8}
                  value={examplesText}
                  onChange={(e) => {
                    setExamplesText(e.target.value);
                    setDirty(true);
                  }}
                />
              </label>
              <label>
                Tests ocultos ({testsText.length > 200_000 ? `${Math.round(testsText.length / 1024)} KB` : 'JSON'})
                <textarea
                  className="mono"
                  rows={14}
                  value={testsText}
                  onChange={(e) => {
                    setTestsText(e.target.value);
                    setDirty(true);
                  }}
                />
              </label>
            </>
          )}

          {tab === 'solucion' && (
            <>
              <label>
                Explicación de la solución (es) · Markdown: idea, pasos, errores típicos y complejidad
                <textarea
                  rows={8}
                  value={p.editorial?.es ?? ''}
                  onChange={(e) => update({ editorial: { es: e.target.value, en: p.editorial?.en ?? '' } })}
                />
              </label>
              <label>
                Explicación de la solución (en) · Markdown
                <textarea
                  rows={8}
                  value={p.editorial?.en ?? ''}
                  onChange={(e) => update({ editorial: { es: p.editorial?.es ?? '', en: e.target.value } })}
                />
              </label>
              <div className="row">
                <label>
                  Lenguaje
                  <select
                    value={p.referenceSolution?.language ?? 'python'}
                    onChange={(e) =>
                      update({
                        referenceSolution: { language: e.target.value as Language, code: p.referenceSolution?.code ?? '' },
                      })
                    }
                  >
                    {LANGS.map((l) => (
                      <option key={l} value={l}>
                        {LANGUAGE_LABELS[l]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="muted small">
                Se usa para calcular las salidas esperadas y se muestra a los jugadores cuando terminan el reto.
              </p>
              <div className="admin-code">
                <Editor
                  language={MONACO_LANG[p.referenceSolution?.language ?? 'python']}
                  value={p.referenceSolution?.code ?? ''}
                  onChange={(v) =>
                    update({ referenceSolution: { language: p.referenceSolution?.language ?? 'python', code: v ?? '' } })
                  }
                  theme={monacoTheme}
                  beforeMount={defineCodleTheme}
                  options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
                />
              </div>
              <h3>Soluciones en otros lenguajes</h3>
              <p className="muted small">
                Las escribe el agente (retos/specs/&lt;fecha&gt;/&lt;slug&gt;.&lt;ext&gt;) y el servidor las ejecuta contra todos
                los tests. Solo se muestran a los jugadores las verificadas. Al guardar cambios se vuelven a verificar.
              </p>
              {p.solutions && p.solutions.length > 0 ? (
                <ul className="admin-solutions">
                  {p.solutions.map((s) => (
                    <li key={s.language}>
                      <span className={`sol-status sol-${s.status}`}>
                        {s.status === 'ok' ? '✓ verificada' : s.status === 'failed' ? '✗ falla' : '… pendiente'}
                      </span>{' '}
                      <strong>{LANGUAGE_LABELS[s.language]}</strong>{' '}
                      <button
                        className="how-link"
                        onClick={() => {
                          setTryLang(s.language);
                          setTryCode(s.code);
                          setTab('probar');
                        }}
                      >
                        abrir en Probar
                      </button>
                      {s.error && <pre className="err-pre">{s.error}</pre>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">Este reto no tiene soluciones en otros lenguajes.</p>
              )}
            </>
          )}

          {tab === 'probar' && (
            <>
              <p className="muted small">
                Ejecuta una solución contra todos los casos del borrador actual (sin guardar y sin contar intentos). Útil para
                comprobar que una solución ingenua no pasa los tests grandes.
              </p>
              <div className="row">
                <select value={tryLang} onChange={(e) => setTryLang(e.target.value as Language)}>
                  {LANGS.map((l) => (
                    <option key={l} value={l}>
                      {LANGUAGE_LABELS[l]}
                    </option>
                  ))}
                </select>
                <button className="btn primary" onClick={runTry} disabled={!!busy}>
                  {busy === 'try' ? 'Ejecutando…' : '▶ Probar'}
                </button>
              </div>
              <div className="admin-code">
                <Editor
                  key={tryLang}
                  language={MONACO_LANG[tryLang]}
                  value={tryCode}
                  onChange={(v) => setTryCode(v ?? '')}
                  theme={monacoTheme}
                  beforeMount={defineCodleTheme}
                  options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
                />
              </div>
              {tryResult &&
                (tryResult.status === 'compile_error' ? (
                  <pre className="err-pre">{tryResult.errorOutput}</pre>
                ) : (
                  <div className="try-results">
                    <p className="small">
                      {tryResult.results.filter((r) => r.verdict === 'pass').length}/{tryResult.results.length} correctos ·{' '}
                      {tryResult.timeMs ?? '?'} ms
                    </p>
                    {tryResult.results.map((r) => {
                      const nExamples = tryResult.results.filter((x) => x.kind === 'example').length;
                      const n = r.kind === 'example' ? r.index + 1 : r.index - nExamples + 1;
                      return (
                        <div key={r.index} className={`try-row v-${r.verdict}`}>
                          <span className="mono">
                            {r.kind === 'example' ? 'E' : 'T'}
                            {n}
                          </span>
                          <span>{r.verdict}</span>
                          <span className="mono small truncate">
                            {r.verdict === 'pass'
                              ? ''
                              : r.verdict === 'skipped'
                                ? 'no se llegó a ejecutar'
                                : r.error ?? `obtenido ${formatValue(r.actual, 120)} · esperado ${formatValue(r.expected, 120)}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
            </>
          )}
        </section>

        <section className="panel preview statement">
          <p className="muted small">Vista previa (es)</p>
          <span className={`badge level-${p.level}`}>{LEVELS[p.level]}</span>
          <h2>{p.title.es || 'Sin título'}</h2>
          <Markdown>{p.statement.es || '*Sin enunciado*'}</Markdown>
          {previewCases?.map((ex, i) => (
            <div key={i} className="example">
              <h3>Ejemplo {i + 1}</h3>
              <div className="example-box">
                <div className="io-lines">
                  {sig.params.map((prm, j) => (
                    <div key={prm.name + j} className="io-line">
                      <span className="io-name">{prm.name} =</span> <code>{formatValue(ex.input[j])}</code>
                    </div>
                  ))}
                </div>
                <div>
                  <strong>Salida:</strong> <code>{ex.output === undefined ? '— (sin calcular)' : formatValue(ex.output)}</code>
                </div>
                {ex.explanation?.es && <div className="small">{ex.explanation.es}</div>}
              </div>
            </div>
          ))}
          {previewCases === null && <p className="error-box small">Los ejemplos no son JSON válido.</p>}
          {p.constraints.length > 0 && (
            <ul className="constraints">
              {p.constraints.map((c, i) => (
                <li key={i}>
                  <code>{c}</code>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
