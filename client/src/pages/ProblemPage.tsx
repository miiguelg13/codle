import Editor, { type OnMount } from '@monaco-editor/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Copy, Lock, Play, RotateCcw, Send, Timer, X } from 'lucide-react';
import { Boxed } from '../components/Boxed';
import { AttemptTiles, SubmissionGrid } from '../components/Tiles';
import {
  api,
  LANGUAGES,
  type DaySummary,
  type Language,
  type OfficialSolution,
  type Param,
  type ProblemDetail,
  type RunResponse,
  type SubmitResponse,
} from '../lib/api';
import { formatMs, formatValue, LANGUAGE_LABELS } from '../lib/format';
import { useAuth } from '../lib/auth';
import { errorMessage, levelKey, useI18n } from '../lib/i18n';
import { defineCodleTheme, MONACO_LANG } from '../lib/monaco';
import { storage } from '../lib/storage';
import { useTheme } from '../lib/theme';

const LANGS: readonly Language[] = LANGUAGES;

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
  const { monacoTheme } = useTheme();

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
  const [justSolved, setJustSolved] = useState(false);
  const [leftPct, setLeftPct] = useState(42);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(id);
  }, [busy]);

  useEffect(() => {
    let alive = true;
    setProblem(null);
    setLoadError(null);
    setRunResult(null);
    setLastSubmit(null);
    setModal(null);
    setJustSolved(false);
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
              solutions: r.status === 'ok' && r.solutions.length ? r.solutions : p.solutions,
              editorial: r.status === 'ok' ? (r.editorial ?? p.editorial) : p.editorial,
            }
          : p,
      );
      setDay((d) =>
        d ? { ...d, problems: d.problems.map((x) => (x.id === problem.id ? { ...x, progress: r.progress } : x)) } : d,
      );
      if (r.status === 'ok') {
        if (r.solved) {
          setJustSolved(true);
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
          <ArrowLeft strokeWidth={1.75} /> <span className="hide-sm">{t('back')}</span>
        </Link>
        <div className="level-pills">
          {(day?.problems ?? []).map((p) => (
            <Link
              key={p.id}
              to={`/problem/${p.id}`}
              className={`pill level-${p.level} ${p.id === problem.id ? 'active' : ''} ${p.progress.solved ? 'solved' : ''}`}
              aria-current={p.id === problem.id ? 'page' : undefined}
            >
              <span className="n">{p.level}</span>
              <span className="lbl">{t(levelKey(p.level))}</span>
              {p.progress.solved && <Check strokeWidth={2.25} aria-label={t('status_solved')} />}
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
              {!progress.finished && <Lock strokeWidth={1.75} />}
              {t('solution')}
            </button>
          </div>
          <div className="pane-body statement">
            {leftTab === 'description' ? (
              <>
                <div className="statement-head">
                  <h1>
                    {progress.solved ? (
                      <Boxed draw={justSolved && !modal}>{problem.title[lang] || problem.title.es}</Boxed>
                    ) : (
                      problem.title[lang] || problem.title.es
                    )}
                  </h1>
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
            ) : problem.progress.finished && (problem.solutions.length > 0 || problem.editorial) ? (
              <>
                <div className="editorial">
                  <h3>{t('editorialTitle')}</h3>
                  {problem.editorial ? (
                    <Markdown>{problem.editorial[lang] || problem.editorial.es}</Markdown>
                  ) : (
                    <p className="muted">{t('noEditorial')}</p>
                  )}
                </div>
                {problem.solutions.length > 0 && (
                  <OfficialSolutions solutions={problem.solutions} editorLanguage={language} theme={monacoTheme} />
                )}
              </>
            ) : (
              <p className="locked">
                <Lock strokeWidth={1.75} /> {t('solutionLocked')}
              </p>
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
            <button className="ghost" onClick={resetCode} title={t('reset')} aria-label={t('reset')}>
              <RotateCcw strokeWidth={1.75} className="icon" /> <span className="hide-sm">{t('reset')}</span>
            </button>
            <div className="spacer" />
            <button
              className={`btn secondary ${busy === 'run' ? 'busy' : ''}`}
              onClick={run}
              disabled={!!busy}
              title={t('shortcutRun')}
            >
              {busy === 'run' ? (
                `${t('running')} ${elapsed}s`
              ) : (
                <>
                  <Play strokeWidth={2} /> {t('run')}
                </>
              )}
            </button>
            {progress.finished && busy !== 'submit' ? (
              <button className={`btn ${progress.solved ? 'done' : 'secondary'}`} disabled>
                {progress.solved ? <Check strokeWidth={2.25} /> : <X strokeWidth={2} />}
                {progress.solved ? t('solvedButton') : t('noAttemptsButton')}
              </button>
            ) : (
              <button
                className={`btn primary ${busy === 'submit' ? 'busy' : ''}`}
                onClick={submit}
                disabled={!!busy}
                title={t('shortcutSubmit')}
              >
                {busy === 'submit' ? (
                  `${t('submitting')} ${elapsed}s`
                ) : (
                  <>
                    <Send strokeWidth={2} /> {t('submit')} <span className="remaining">{remaining}</span>
                  </>
                )}
              </button>
            )}
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
              theme={monacoTheme}
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
                {t('submissions')}{' '}
                <span className="count">
                  {progress.attempts.length}/{progress.maxAttempts}
                </span>
              </button>
            </div>
            <div className="console-body">
              {actionError && <p className="error-box">{actionError}</p>}
              {busy && (
                <p className="working">
                  <span className="dots" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                  {elapsed >= 5 ? t('slowRunHint') : busy === 'run' ? t('running') : t('submitting')}
                </p>
              )}

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
                          <i aria-hidden /> {t('case')} {i + 1}
                          <span className="sr-only">{t(`verdict_${c.verdict}`)}</span>
                        </button>
                      ))}
                      {runResult.timeMs != null && (
                        <span className="muted case-time" title={t('timeTotalHint')}>
                          <Timer strokeWidth={1.75} /> {formatMs(runResult.timeMs)}
                        </span>
                      )}
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
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="modal-x" onClick={() => setModal(null)} aria-label={t('close')}>
              <X strokeWidth={1.75} />
            </button>
            <h2>{modal === 'solved' ? t('solvedTitle') : t('failedTitle')}</h2>
            {modal === 'solved' && (
              <p className="modal-answer">
                <Boxed draw>{problem.title[lang] || problem.title.es}</Boxed>
              </p>
            )}
            <p>
              {modal === 'solved'
                ? t('solvedBody', { n: progress.attempts.length, max: progress.maxAttempts })
                : t('failedBody')}
            </p>
            <SubmissionGrid progress={progress} totalTests={problem.totalTests} animateLast />
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setModal(null)}>
                {t('close')}
              </button>
              {(modal === 'failed' || modal === 'solved') && (
                <button
                  className="btn secondary"
                  onClick={() => {
                    setModal(null);
                    setLeftTab('solution');
                  }}
                >
                  {t('seeSolution')}
                </button>
              )}
              {nextProblem && (
                <button className="btn primary" onClick={() => navigate(`/problem/${nextProblem.id}`)}>
                  {t('nextChallenge')} <ArrowRight strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OfficialSolutions({
  solutions: raw,
  editorLanguage,
  theme,
}: {
  solutions: OfficialSolution[];
  editorLanguage: Language;
  theme: string;
}) {
  const { t } = useI18n();
  const [picked, setPicked] = useState<Language | null>(null);
  // Mismo orden que el selector del editor.
  const solutions = useMemo(
    () => [...raw].sort((a, b) => LANGUAGES.indexOf(a.language) - LANGUAGES.indexOf(b.language)),
    [raw],
  );
  const has = (l: Language | null) => !!l && solutions.some((s) => s.language === l);
  const current = has(picked) ? picked! : has(editorLanguage) ? editorLanguage : (solutions.find((s) => s.language === 'python') ?? solutions[0]).language;
  const sol = solutions.find((s) => s.language === current)!;
  return (
    <>
      <div className="solution-lang">
        <h3>{t('officialCode')}</h3>
        <CopyButton text={sol.code} />
      </div>
      {solutions.length > 1 && (
        <div className="seg solution-langs" role="tablist" aria-label={t('officialCode')}>
          {solutions.map((s) => (
            <button
              key={s.language}
              role="tab"
              aria-selected={s.language === current}
              className={s.language === current ? 'active' : ''}
              onClick={() => setPicked(s.language)}
            >
              {LANGUAGE_LABELS[s.language] ?? s.language}
            </button>
          ))}
        </div>
      )}
      {!has(editorLanguage) && (
        <p className="muted small">{t('noSolutionInLang', { lang: LANGUAGE_LABELS[editorLanguage] ?? editorLanguage })}</p>
      )}
      <SolutionCode key={sol.language} code={sol.code} language={sol.language} theme={theme} />
    </>
  );
}

function SolutionCode({ code, language, theme }: { code: string; language: Language; theme: string }) {
  const lines = code.split('\n').length;
  return (
    <div className="solution-editor" style={{ height: Math.min(lines, 40) * 19 + 16 }}>
      <Editor
        value={code}
        language={MONACO_LANG[language] ?? 'python'}
        theme={theme}
        beforeMount={defineCodleTheme}
        options={{
          readOnly: true,
          domReadOnly: true,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          lineHeight: 19,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'off',
          folding: false,
          renderLineHighlight: 'none',
          automaticLayout: true,
          padding: { top: 8, bottom: 8 },
          scrollbar: { alwaysConsumeMouseWheel: false },
        }}
      />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* sin permiso de portapapeles: no hacemos nada */
    }
  };
  return (
    <button className="ghost copy-btn" onClick={copy}>
      {done ? <Check strokeWidth={2} className="icon" /> : <Copy strokeWidth={1.75} className="icon" />}
      {done ? t('copied') : t('copy')}
    </button>
  );
}

function CaseDetail({ c, params }: { c: RunResponse['cases'][number]; params: Param[] }) {
  const { t } = useI18n();
  return (
    <div className="case-detail">
      <div className={`verdict ${c.verdict === 'pass' ? 'ok' : 'bad'}`}>
        {t(`verdict_${c.verdict}`)}
        {c.timeMs != null && (
          <span className="muted small">
            {' '}
            · {t('timeCase')}: {formatMs(c.timeMs)}
          </span>
        )}
      </div>
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
        {r.attempt.timeMs != null && (
          <div className="time-line" title={t('timeTotalHint')}>
            <Timer strokeWidth={1.75} /> {t('timeTotal')}: {formatMs(r.attempt.timeMs)}
          </div>
        )}
      </div>
    );
  }
  const f = r.firstFailure;
  return (
    <div className="banner bad">
      <h4>
        {t('wrongAnswer')} · {t('passedTests', { p: r.attempt.passed, t: r.attempt.total })}
      </h4>
      {r.attempt.timeMs != null && (
        <div className="time-line" title={t('timeTotalHint')}>
          <Timer strokeWidth={1.75} /> {t('timeTotal')}: {formatMs(r.attempt.timeMs)}
        </div>
      )}
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
