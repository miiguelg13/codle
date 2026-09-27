import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { storage } from './storage';

export type UiLang = 'es' | 'en';

const dict = {
  es: {
    stats: 'Estadísticas',
    statsShort: 'Stats',
    archiveShort: 'Archivo',
    login: 'Entrar',
    logout: 'Salir',
    register: 'Crear cuenta',
    haveAccount: '¿Ya tienes cuenta?',
    noAccount: '¿No tienes cuenta?',
    emailOrUser: 'Email o usuario',
    email: 'Email',
    username: 'Nombre de usuario',
    password: 'Contraseña',
    passwordHint: 'Mínimo 8 caracteres',
    usernameHint: '3-20 caracteres: letras, números, _ . -',
    guestNote: 'Tu progreso como invitado se guardará en tu cuenta.',
    mergedNote: 'Se han pasado {n} retos de tu sesión de invitado a tu cuenta.',
    welcome: '¡Hola, {name}!',
    streakTitle: 'Racha: días seguidos resolviendo al menos un reto el mismo día',
    guestStatsNote: 'Estás jugando como invitado. Crea una cuenta para no perder tu progreso y usarlo en otros dispositivos.',
    played: 'Retos jugados',
    solvedStat: 'Resueltos',
    solveRate: '% acierto',
    currentStreak: 'Racha actual',
    maxStreak: 'Mejor racha',
    perfectDays: 'Días perfectos',
    daysPlayed: 'Días jugados',
    submissionsStat: 'Envíos',
    distribution: 'Distribución de envíos',
    distributionHint: 'En cuántos envíos resuelves los retos',
    failedLabel: '✗',
    byLevel: 'Por nivel',
    byLanguage: 'Lenguajes con los que resuelves',
    noStats: 'Todavía no has jugado ningún reto. ¡Empieza por el de hoy!',
    goToday: 'Ir a los retos de hoy',
    ofAttempted: '{s} de {a}',
    error_invalid_credentials: 'Email/usuario o contraseña incorrectos.',
    error_email_taken: 'Ya existe una cuenta con ese email.',
    error_username_taken: 'Ese nombre de usuario ya está cogido.',
    error_invalid_email: 'El email no es válido.',
    error_invalid_username: 'Usuario no válido: 3-20 caracteres (letras, números, _ . -).',
    error_invalid_password: 'La contraseña debe tener al menos 8 caracteres.',
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
    error_executor_quota: 'El ejecutor de código está saturado ahora mismo. Vuelve a intentarlo en un rato.',
    error_server_unavailable: 'El servidor no responde. ¿Está arrancado?',
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
    stats: 'Statistics',
    statsShort: 'Stats',
    archiveShort: 'Archive',
    login: 'Log in',
    logout: 'Log out',
    register: 'Sign up',
    haveAccount: 'Already have an account?',
    noAccount: "Don't have an account?",
    emailOrUser: 'Email or username',
    email: 'Email',
    username: 'Username',
    password: 'Password',
    passwordHint: 'At least 8 characters',
    usernameHint: '3-20 characters: letters, numbers, _ . -',
    guestNote: 'Your guest progress will be saved to your account.',
    mergedNote: '{n} challenges from your guest session were moved to your account.',
    welcome: 'Hi, {name}!',
    streakTitle: 'Streak: consecutive days solving at least one challenge on the same day',
    guestStatsNote: 'You are playing as a guest. Create an account to keep your progress and use it on other devices.',
    played: 'Played',
    solvedStat: 'Solved',
    solveRate: 'Win %',
    currentStreak: 'Current streak',
    maxStreak: 'Max streak',
    perfectDays: 'Perfect days',
    daysPlayed: 'Days played',
    submissionsStat: 'Submissions',
    distribution: 'Submission distribution',
    distributionHint: 'How many submissions you need to solve a challenge',
    failedLabel: '✗',
    byLevel: 'By level',
    byLanguage: 'Languages you solve with',
    noStats: "You haven't played any challenge yet. Start with today's!",
    goToday: "Go to today's challenges",
    ofAttempted: '{s} of {a}',
    error_invalid_credentials: 'Wrong email/username or password.',
    error_email_taken: 'An account with that email already exists.',
    error_username_taken: 'That username is taken.',
    error_invalid_email: 'Invalid email.',
    error_invalid_username: 'Invalid username: 3-20 characters (letters, numbers, _ . -).',
    error_invalid_password: 'Password must be at least 8 characters.',
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
    error_executor_quota: 'The code runner is busy right now. Please try again in a while.',
    error_server_unavailable: 'The server is not responding. Is it running?',
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
