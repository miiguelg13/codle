import { useEffect } from 'react';
import { useI18n } from '../lib/i18n';

const TEXT = {
  es: {
    title: 'Cómo se juega',
    intro: 'Cada día hay 4 retos de programación nuevos, de Fácil a Experto. Resuélvelos en el lenguaje que prefieras.',
    steps: [
      ['▶ Ejecutar', 'prueba tu código con los ejemplos del enunciado. Es ilimitado y no gasta intentos.'],
      ['Enviar', 'evalúa tu código con todos los tests, también los ocultos. Tienes 5 envíos por reto.'],
      ['Errores de compilación', 'no gastan intento: corrige y vuelve a enviar.'],
      ['Al terminar', 'cuando lo resuelves o se acaban los envíos, se desbloquean la solución oficial y su explicación.'],
    ],
    legendTitle: 'Cada envío pinta una fila de casillas, una por test:',
    legend: [
      ['tone-pass', 'test superado'],
      ['tone-fail', 'respuesta incorrecta'],
      ['tone-partial', 'error o tiempo límite excedido'],
      ['tone-none', 'no ejecutado'],
    ],
    streak: 'Tu racha 🔥 cuenta los días seguidos en los que resuelves al menos un reto el mismo día. Los días anteriores se pueden jugar, pero no suman racha.',
    shortcuts: 'Atajos en el editor: Ctrl+Enter ejecuta y Ctrl+Shift+Enter envía.',
    ok: '¡A jugar!',
  },
  en: {
    title: 'How to play',
    intro: 'Every day there are 4 new programming challenges, from Easy to Expert. Solve them in the language you prefer.',
    steps: [
      ['▶ Run', 'tests your code on the statement examples. Unlimited, and it does not use attempts.'],
      ['Submit', 'judges your code on every test, hidden ones included. You get 5 submissions per challenge.'],
      ['Compile errors', 'do not use an attempt: fix them and submit again.'],
      ['When you finish', 'once you solve it or run out of submissions, the official solution and its explanation unlock.'],
    ],
    legendTitle: 'Each submission paints a row of tiles, one per test:',
    legend: [
      ['tone-pass', 'test passed'],
      ['tone-fail', 'wrong answer'],
      ['tone-partial', 'error or time limit exceeded'],
      ['tone-none', 'not run'],
    ],
    streak: 'Your 🔥 streak counts consecutive days on which you solve at least one challenge on the same day. Past days can be played, but they do not add to the streak.',
    shortcuts: 'Editor shortcuts: Ctrl+Enter runs and Ctrl+Shift+Enter submits.',
    ok: "Let's play!",
  },
} as const;

export function HowToPlay({ onClose }: { onClose: () => void }) {
  const { lang } = useI18n();
  const c = TEXT[lang];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal how-to" role="dialog" aria-modal="true" aria-labelledby="how-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Cerrar / Close">
          ×
        </button>
        <h2 id="how-title">{c.title}</h2>
        <p>{c.intro}</p>
        <ul className="how-steps">
          {c.steps.map(([k, v]) => (
            <li key={k}>
              <strong>{k}</strong> — {v}
            </li>
          ))}
        </ul>
        <p className="small">{c.legendTitle}</p>
        <div className="how-legend">
          {c.legend.map(([tone, label]) => (
            <span key={tone}>
              <i className={`cell ${tone}`} /> {label}
            </span>
          ))}
        </div>
        <p className="small muted">{c.streak}</p>
        <p className="small muted">{c.shortcuts}</p>
        <div className="modal-actions">
          <button className="btn primary" onClick={onClose} autoFocus>
            {c.ok}
          </button>
        </div>
      </div>
    </div>
  );
}

export function openHowToPlay(): void {
  window.dispatchEvent(new Event('codle:how-to-play'));
}
