import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { storage } from './storage';

export type UiLang = 'es' | 'en';

const dict = {
  es: {
    tagline: 'Cuatro retos de programación cada día',
    today: 'Hoy',
    archive: 'Días anteriores',
    level1: 'Fácil',
    level2: 'Medio',
    level3: 'Difícil',
    level4: 'Experto',
    nextIn: 'Nuevos retos en',
    noProblems: 'No hay retos publicados para este día.',
    loading: 'Cargando…',
    solvedIn: 'Resuelto en {n}/{max}',
    attemptsUsed: '{n}/{max} intentos',
    notStarted: 'Sin empezar',
    outOfAttempts: 'Sin intentos',
    play: 'Jugar',
    review: 'Revisar',
    back: 'Volver',
    description: 'Descripción',
    submissions: 'Envíos',
    solution: 'Solución',
    examples: 'Ejemplos',
    example: 'Ejemplo',
    constraints: 'Restricciones',
    input: 'Entrada',
    output: 'Salida',
    expected: 'Esperado',
    yourOutput: 'Tu salida',
    explanation: 'Explicación',
    logs: 'Salida estándar',
    run: 'Ejecutar',
    submit: 'Enviar',
    running: 'Ejecutando…',
    submitting: 'Evaluando…',
    reset: 'Restaurar plantilla',
    resetConfirm: '¿Seguro? Perderás el código actual de este lenguaje.',
    testResult: 'Resultado',
    case: 'Caso',
    runHint: 'Pulsa «Ejecutar» para probar tu código con los ejemplos. Es ilimitado.',
    submitHint: 'Cada envío se evalúa con {n} tests (ejemplos + ocultos). Tienes {max} envíos. Los errores de compilación no cuentan.',
    compileError: 'Error de compilación',
    accepted: '¡Aceptado!',
    wrongAnswer: 'Respuesta incorrecta',
    passedTests: '{p}/{t} tests superados',
    attempt: 'Intento',
    remaining: 'Te quedan {n} envíos',
    noneRemaining: 'Se acabaron los envíos para este reto.',
    solvedTitle: '¡Reto superado!',
    solvedBody: 'Lo has resuelto en {n} de {max} envíos.',
    failedTitle: 'Se acabaron los intentos',
    failedBody: 'Ya puedes ver una solución de referencia en la pestaña «Solución».',
    close: 'Cerrar',
    nextChallenge: 'Siguiente reto',
    solutionLocked: 'La solución se desbloquea cuando resuelves el reto o agotas los envíos.',
    firstFailHidden: 'Primer fallo en el test oculto #{i}',
    firstFailExample: 'Primer fallo en el ejemplo {i}',
    legendPass: 'Correcto',
    legendFail: 'Incorrecto',
    legendError: 'Error / tiempo',
    legendSkipped: 'No ejecutado',
    retroNote: 'Día anterior: cuenta para tus estadísticas pero no para la racha.',
    error_rate_limited: 'Demasiadas peticiones, espera un momento.',
    error_executor_error: 'El motor de ejecución no está disponible ahora mismo. Inténtalo de nuevo.',
    error_already_solved: 'Ya has resuelto este reto.',
    error_no_attempts_left: 'No te quedan envíos.',
    error_submission_in_progress: 'Ya hay un envío en curso.',
    error_generic: 'Algo ha fallado.',
    verdict_pass: 'Correcto',
    verdict_fail: 'Incorrecto',
    verdict_error: 'Error en ejecución',
    verdict_timeout: 'Tiempo excedido',
    verdict_skipped: 'No ejecutado',
    months: 'enero,febrero,marzo,abril,mayo,junio,julio,agosto,septiembre,octubre,noviembre,diciembre',
    weekdays: 'L,M,X,J,V,S,D',
    calendarLegend: 'Verde: todos resueltos · Amarillo: algunos · Gris: intentado sin éxito',
  },
  en: {
    tagline: 'Four coding challenges every day',
    today: 'Today',
    archive: 'Past days',
    level1: 'Easy',
    level2: 'Medium',
    level3: 'Hard',
    level4: 'Expert',
    nextIn: 'New challenges in',
    noProblems: 'No challenges published for this day.',
    loading: 'Loading…',
    solvedIn: 'Solved in {n}/{max}',
    attemptsUsed: '{n}/{max} attempts',
    notStarted: 'Not started',
    outOfAttempts: 'Out of attempts',
    play: 'Play',
    review: 'Review',
    back: 'Back',
    description: 'Description',
    submissions: 'Submissions',
    solution: 'Solution',
    examples: 'Examples',
    example: 'Example',
    constraints: 'Constraints',
    input: 'Input',
    output: 'Output',
    expected: 'Expected',
    yourOutput: 'Your output',
    explanation: 'Explanation',
    logs: 'Stdout',
    run: 'Run',
    submit: 'Submit',
    running: 'Running…',
    submitting: 'Judging…',
    reset: 'Reset template',
    resetConfirm: 'Are you sure? You will lose your current code for this language.',
    testResult: 'Result',
    case: 'Case',
    runHint: 'Press “Run” to try your code against the examples. It is unlimited.',
    submitHint: 'Each submission is judged against {n} tests (examples + hidden). You have {max} submissions. Compile errors do not count.',
    compileError: 'Compile error',
    accepted: 'Accepted!',
    wrongAnswer: 'Wrong answer',
    passedTests: '{p}/{t} tests passed',
    attempt: 'Attempt',
    remaining: '{n} submissions left',
    noneRemaining: 'No submissions left for this challenge.',
    solvedTitle: 'Challenge solved!',
    solvedBody: 'You solved it in {n} of {max} submissions.',
    failedTitle: 'Out of attempts',
    failedBody: 'You can now see a reference solution in the “Solution” tab.',
    close: 'Close',
    nextChallenge: 'Next challenge',
    solutionLocked: 'The solution unlocks once you solve the challenge or run out of submissions.',
    firstFailHidden: 'First failure on hidden test #{i}',
    firstFailExample: 'First failure on example {i}',
    legendPass: 'Correct',
    legendFail: 'Wrong',
    legendError: 'Error / time',
    legendSkipped: 'Not run',
    retroNote: 'Past day: counts for your stats but not for your streak.',
    error_rate_limited: 'Too many requests, wait a moment.',
    error_executor_error: 'The code runner is unavailable right now. Please try again.',
    error_already_solved: 'You already solved this challenge.',
    error_no_attempts_left: 'No submissions left.',
    error_submission_in_progress: 'A submission is already running.',
    error_generic: 'Something went wrong.',
    verdict_pass: 'Correct',
    verdict_fail: 'Wrong',
    verdict_error: 'Runtime error',
    verdict_timeout: 'Time limit exceeded',
    verdict_skipped: 'Not run',
    months: 'January,February,March,April,May,June,July,August,September,October,November,December',
    weekdays: 'M,T,W,T,F,S,S',
    calendarLegend: 'Green: all solved · Yellow: some · Gray: attempted, none solved',
  },
} as const;

export type I18nKey = keyof (typeof dict)['es'];

interface Ctx {
  lang: UiLang;
  setLang: (l: UiLang) => void;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<Ctx | null>(null);

function initialLang(): UiLang {
  const saved = storage.get('uiLang');
  if (saved === 'es' || saved === 'en') return saved;
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UiLang>(initialLang);
  const setLang = useCallback((l: UiLang) => {
    setLangState(l);
    storage.set('uiLang', l);
    document.documentElement.lang = l;
  }, []);
  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) => {
      let s: string = dict[lang][key] ?? dict.es[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    },
    [lang],
  );
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n fuera de I18nProvider');
  return ctx;
}

export function levelKey(level: number): I18nKey {
  return `level${level}` as I18nKey;
}

export function errorMessage(t: Ctx['t'], err: unknown): string {
  const code = (err as { code?: string })?.code;
  const key = `error_${code}` as I18nKey;
  if (code && key in dict.es) return t(key);
  return t('error_generic');
}
