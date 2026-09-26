import Editor, { type OnMount } from '@monaco-editor/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AttemptTiles, SubmissionGrid } from '../components/Tiles';
import {
  api,
  type DaySummary,
  type Language,
  type Param,
  type ProblemDetail,
  type RunResponse,
  type SubmitResponse,
} from '../lib/api';
import { formatValue, LANGUAGE_LABELS } from '../lib/format';
import { useAuth } from '../lib/auth';
import { errorMessage, levelKey, useI18n } from '../lib/i18n';
import { defineCodleTheme, MONACO_LANG } from '../lib/monaco';
import { storage } from '../lib/storage';

const LANGS: Language[] = ['python', 'javascript', 'java', 'cpp'];

function preferredLanguage(): Language {
  const l = storage.get('prefLang');
  return LANGS.includes(l as Language) ? (l as Language) : 'python';
}

const draftKey = (id: string, lang: Language) => `draft:${id}:${lang}`;

function InputView({ params, values }: { params: Param[]; values: unknown[] }) {
  return (
    <div className="io-lines">
      {params.map((p, i) => (
        <div key={p.name} className="io-line">
          <span className="io-name">{p.name} =</span> <code>{formatValue(values[i])}</code>
        </div>
      ))}
    </div>
  );
}

export default function ProblemPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { refresh: refreshAuth } = useAuth();

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [day, setDay] = useState<DaySummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(preferredLanguage);
  const [code, setCode] = useState('');
  const [leftTab, setLeftTab] = useState<'description' | 'solution'>('description');
  const [bottomTab, setBottomTab] = useState<'result' | 'submissions'>('result');
  const [busy, setBusy] = useState<null | 'run' | 'submit'>(null);
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [activeCase, setActiveCase] = useState(0);
  const [lastSubmit, setLastSubmit] = useState<SubmitResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modal, setModal] = useState<null | 'solved' | 'failed'>(null);
  const [leftPct, setLeftPct] = useState(42);

  useEffect(() => {
    let alive = true;
    setProblem(null);
    setLoadError(null);
    setRunResult(null);
    setLastSubmit(null);
    setModal(null);
    setLeftTab('description');
    setBottomTab('result');
    api
      .problem(id)
      .then((p) => {
        if (!alive) return;
        setProblem(p);
        api.day(p.date).then((d) => alive && setDay(d)).catch(() => {});
      })
      .catch((e) => alive && setLoadError(errorMessage(t, e)));
    return () => {
      alive = false;
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!problem) return;
    const draft = storage.get(draftKey(problem.id, language));
    setCode(draft ?? problem.lastCode[language] ?? problem.starterCode[language]);
  }, [problem?.id, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCodeChange = (v: string | undefined) => {
    const value = v ?? '';
    setCode(value);
    if (problem) storage.set(draftKey(problem.id, language), value);
  };

  const changeLanguage = (l: Language) => {
    setLanguage(l);
    storage.set('prefLang', l);
  };

  const resetCode = () => {
    if (!problem || !window.confirm(t('resetConfirm'))) return;
    storage.remove(draftKey(problem.id, language));
    setCode(problem.starterCode[language]);
  };

  const run = useCallback(async () => {
    if (!problem || busy) return;
    setBusy('run');
    setActionError(null);
    setBottomTab('result');
    try {
      const r = await api.run(problem.id, language, code);
      setRunResult(r);
      const firstBad = r.cases.findIndex((c) => c.verdict !== 'pass');
      setActiveCase(firstBad >= 0 ? firstBad : 0);
    } catch (e) {
      setActionError(errorMessage(t, e));
    } finally {
      setBusy(null);
    }
  }, [problem, busy, language, code, t]);

  const submit = useCallback(async () => {
    if (!problem || busy || problem.progress.finished) return;
    setBusy('submit');
    setActionError(null);
    setBottomTab('submissions');
    try {
      const r = await api.submit(problem.id, language, code);
      setLastSubmit(r);
      setProblem((p) =>
        p
          ? {
              ...p,
              progress: r.progress,
              referenceSolution: r.status === 'ok' ? (r.referenceSolution ?? p.referenceSolution) : p.referenceSolution,
            }
          : p,
      );
      setDay((d) =>
        d ? { ...d, problems: d.problems.map((x) => (x.id === problem.id ? { ...x, progress: r.progress } : x)) } : d,
      );
      if (r.status === 'ok') {
        if (r.solved) {
          setModal('solved');
          void refreshAuth(); // la racha puede haber cambiado
        }
        else if (r.progress.finished) setModal('failed');
      }
    } catch (e) {
      setActionError(errorMessage(t, e));
    } finally {
      setBusy(null);
    }
  }, [problem, busy, language, code, t, refreshAuth]);

  const runRef = useRef(run);
  const submitRef = useRef(submit);
  runRef.current = run;
  submitRef.current = submit;
  const [editorReady, setEditorReady] = useState(false);
  const [editorSlow, setEditorSlow] = useState(false);
  useEffect(() => {
    if (editorReady) return;
    const id = setTimeout(() => setEditorSlow(true), 15_000);
    return () => clearTimeout(id);
  }, [editorReady]);

  const onMount: OnMount = (editor, monaco) => {
    setEditorReady(true);
    setEditorSlow(false);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => submitRef.current());
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(70, Math.max(25, pct)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const nextProblem = useMemo(() => {
    if (!day || !problem) return null;
    return day.problems.find((p) => p.level > problem.level && !p.progress.finished) ?? null;
  }, [day, problem]);

  if (loadError) return <main className="page"><p className="error-box">{loadError}</p></main>;
  if (!problem) return <main className="page"><p className="muted">{t('loading')}</p></main>;

  const { progress } = problem;
  const remaining = progress.maxAttempts - progress.attempts.length;
  const dayLink = day?.isToday ? '/' : `/day/${problem.date}`;

  return (
    <div className="problem-page">
      <div className="problem-bar">
        <Link to={dayLink} className="back">
          ← {t('back')}
        </Link>
        <div className="level-pills">
          {(day?.problems ?? []).map((p) => (
            <Link
              key={p.id}
              to={`/problem/${p.id}`}
              className={`pill level-${p.level} ${p.id === problem.id ? 'active' : ''} ${p.progress.solved ? 'solved' : ''}`}
            >
              {p.progress.solved ? '✓ ' : ''}
              {t(levelKey(p.level))}
            </Link>
          ))}
        </div>
        <AttemptTiles progress={progress} size="sm" />
      </div>

      <div className="split" ref={containerRef} style={{ ['--left' as string]: `${leftPct}%` }}>
        <section className="pane left-pane">
          <div className="tabs">
            <button className={leftTab === 'description' ? 'active' : ''} onClick={() => setLeftTab('description')}>
              {t('description')}
            </button>
            <button className={leftTab === 'solution' ? 'active' : ''} onClick={() => setLeftTab('solution')}>
              {progress.finished ? '' : '🔒 '}
              {t('solution')}
            </button>
          </div>
          <div className="pane-body statement">
            {leftTab === 'description' ? (
              <>
                <div className="statement-head">
                  <span className={`badge level-${problem.level}`}>{t(levelKey(problem.level))}</span>
                  <h1>{problem.title[lang] || problem.title.es}</h1>
                </div>
                <Markdown>{problem.statement[lang] || problem.statement.es}</Markdown>

                {problem.examples.map((ex, i) => (
                  <div key={i} className="example">
                    <h3>
                      {t('example')} {i + 1}
                    </h3>
                    <div className="example-box">
                      <div>
                        <strong>{t('input')}:</strong>
                        <InputView params={problem.signature.params} values={ex.input} />
                      </div>
                      <div>
                        <strong>{t('output')}:</strong> <code>{formatValue(ex.output)}</code>
                      </div>
                      {ex.explanation && (
                        <div>
                          <strong>{t('explanation')}:</strong> {ex.explanation[lang] || ex.explanation.es}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {problem.constraints.length > 0 && (
                  <>
                    <h3>{t('constraints')}</h3>
                    <ul className="constraints">
                      {problem.constraints.map((c, i) => (
                        <li key={i}>
                          <code>{c}</code>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            ) : problem.referenceSolution ? (
              <>
                <p className="muted small">{LANGUAGE_LABELS[problem.referenceSolution.language as Language] ?? problem.referenceSolution.language}</p>
                <pre className="solution-code">
                  <code>{problem.referenceSolution.code}</code>
                </pre>
              </>
            ) : (
              <p className="locked">🔒 {t('solutionLocked')}</p>
            )}
          </div>
        </section>

        <div className="splitter" onPointerDown={startDrag} role="separator" aria-orientation="vertical" />

        <section className="pane right-pane">
          <div className="editor-toolbar">
            <select value={language} onChange={(e) => changeLanguage(e.target.value as Language)} aria-label="Language">
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_LABELS[l]}
                </option>
              ))}
            </select>
            <button className="ghost" onClick={resetCode} title={t('reset')}>
              ↺ <span className="hide-sm">{t('reset')}</span>
            </button>
            <div className="spacer" />
            <button className="btn secondary" onClick={run} disabled={!!busy} title="Ctrl+Enter">
              {busy === 'run' ? t('running') : `▶ ${t('run')}`}
            </button>
            <button
              className="btn primary"
              onClick={submit}
              disabled={!!busy || progress.finished}
              title="Ctrl+Shift+Enter"
            >
              {busy === 'submit' ? t('submitting') : `${t('submit')} (${remaining})`}
            </button>
          </div>

          {editorSlow && !editorReady && (
            <p className="error-box small editor-slow">
              {lang === 'es'
                ? 'El editor está tardando en cargar (se descarga de cdn.jsdelivr.net). Comprueba tu conexión o recarga la página.'
                : 'The editor is taking long to load (it is downloaded from cdn.jsdelivr.net). Check your connection or reload the page.'}
            </p>
          )}
          <div className="editor-wrap">
            <Editor
              key={language}
              language={MONACO_LANG[language]}
              value={code}
              onChange={onCodeChange}
              onMount={onMount}
              theme="codle-dark"
                  beforeMount={defineCodleTheme}
              options={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                tabSize: 4,
                automaticLayout: true,
                padding: { top: 12 },
                renderLineHighlight: 'line',
              }}
            />
          </div>

          <div className="console">
            <div className="tabs">
              <button className={bottomTab === 'result' ? 'active' : ''} onClick={() => setBottomTab('result')}>
                {t('testResult')}
              </button>
              <button className={bottomTab === 'submissions' ? 'active' : ''} onClick={() => setBottomTab('submissions')}>
                {t('submissions')} ({progress.attempts.length}/{progress.maxAttempts})
              </button>
            </div>
            <div className="console-body">
              {actionError && <p className="error-box">{actionError}</p>}

              {bottomTab === 'result' &&
                (!runResult ? (
                  <p className="muted">{t('runHint')}</p>
                ) : runResult.status === 'compile_error' ? (
                  <div>
                    <h4 className="bad">{t('compileError')}</h4>
                    <pre className="err-pre">{runResult.errorOutput}</pre>
                    {runResult.globalLogs && <pre className="log-pre">{runResult.globalLogs}</pre>}
                  </div>
                ) : (
                  <div>
                    <div className="case-tabs">
                      {runResult.cases.map((c, i) => (
                        <button
                          key={i}
                          className={`case-tab ${i === activeCase ? 'active' : ''} ${c.verdict === 'pass' ? 'ok' : 'ko'}`}
                          onClick={() => setActiveCase(i)}
                        >
                          {c.verdict === 'pass' ? '✓' : '✗'} {t('case')} {i + 1}
                        </button>
                      ))}
                      {runResult.timeMs != null && <span className="muted small">{runResult.timeMs} ms</span>}
                    </div>
                    {runResult.cases[activeCase] && (
                      <CaseDetail c={runResult.cases[activeCase]} params={problem.signature.params} />
                    )}
                    {runResult.globalLogs && (
                      <>
                        <h5>{t('logs')}</h5>
                        <pre className="log-pre">{runResult.globalLogs}</pre>
                      </>
                    )}
                  </div>
                ))}

              {bottomTab === 'submissions' && (
                <div>
                  <SubmitBanner r={lastSubmit} params={problem.signature.params} />
                  <SubmissionGrid progress={progress} totalTests={problem.totalTests} />
                  <p className="muted small">
                    {progress.solved
                      ? t('solvedIn', { n: progress.attempts.length, max: progress.maxAttempts })
                      : progress.finished
                        ? t('noneRemaining')
                        : `${t('remaining', { n: remaining })} · ${t('submitHint', { n: problem.totalTests, max: progress.maxAttempts })}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal === 'solved' ? `🎉 ${t('solvedTitle')}` : t('failedTitle')}</h2>
            <p>
              {modal === 'solved'
                ? t('solvedBody', { n: progress.attempts.length, max: progress.maxAttempts })
                : t('failedBody')}
            </p>
            <SubmissionGrid progress={progress} totalTests={problem.totalTests} />
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setModal(null)}>
                {t('close')}
              </button>
              {modal === 'failed' && (
                <button
                  className="btn secondary"
                  onClick={() => {
                    setModal(null);
                    setLeftTab('solution');
                  }}
                >
                  {t('solution')}
                </button>
              )}
              {nextProblem && (
                <button className="btn primary" onClick={() => navigate(`/problem/${nextProblem.id}`)}>
                  {t('nextChallenge')} →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CaseDetail({ c, params }: { c: RunResponse['cases'][number]; params: Param[] }) {
  const { t } = useI18n();
  return (
    <div className="case-detail">
      <div className={`verdict ${c.verdict === 'pass' ? 'ok' : 'bad'}`}>{t(`verdict_${c.verdict}`)}</div>
      <h5>{t('input')}</h5>
      <div className="code-box">
        <InputView params={params} values={c.input} />
      </div>
      {c.verdict !== 'skipped' && (
        <>
          <h5>{t('yourOutput')}</h5>
          <div className={`code-box ${c.verdict === 'pass' ? '' : 'bad-border'}`}>
            <code>{c.error ? c.error : c.rawActual ?? formatValue(c.actual, 2000)}</code>
          </div>
        </>
      )}
      <h5>{t('expected')}</h5>
      <div className="code-box">
        <code>{formatValue(c.expected, 2000)}</code>
      </div>
      {c.logs && (
        <>
          <h5>{t('logs')}</h5>
          <pre className="log-pre">{c.logs}</pre>
        </>
      )}
    </div>
  );
}

function SubmitBanner({ r, params }: { r: SubmitResponse | null; params: Param[] }) {
  const { t } = useI18n();
  if (!r) return null;
  if (r.status === 'compile_error') {
    return (
      <div className="banner bad">
        <h4>{t('compileError')}</h4>
        <pre className="err-pre">{r.errorOutput}</pre>
      </div>
    );
  }
  if (r.solved) {
    return (
      <div className="banner ok">
        <h4>{t('accepted')}</h4>
        <span className="muted">{t('passedTests', { p: r.attempt.passed, t: r.attempt.total })}</span>
      </div>
    );
  }
  const f = r.firstFailure;
  return (
    <div className="banner bad">
      <h4>
        {t('wrongAnswer')} · {t('passedTests', { p: r.attempt.passed, t: r.attempt.total })}
      </h4>
      {f && (
        <div className="small">
          <p>
            {f.example ? t('firstFailExample', { i: f.index + 1 }) : t('firstFailHidden', { i: f.index + 1 })} —{' '}
            {t(`verdict_${f.verdict}`)}
            {f.error ? `: ${f.error}` : ''}
          </p>
          {f.example && (
            <div className="code-box">
              <InputView params={params} values={f.example.input} />
              <div>
                {t('yourOutput')}: <code>{formatValue(f.example.actual)}</code>
              </div>
              <div>
                {t('expected')}: <code>{formatValue(f.example.expected)}</code>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
