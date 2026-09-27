import { useRef } from 'react';
import type { Attempt, Progress, Verdict } from '../lib/api';
import { formatMs, LANGUAGE_LABELS } from '../lib/format';
import { useI18n } from '../lib/i18n';

function attemptTone(a: Attempt): 'pass' | 'partial' | 'none' {
  if (a.passed === a.total) return 'pass';
  if (a.passed > 0) return 'partial';
  return 'none';
}

export function AttemptTiles({ progress, size = 'md' }: { progress: Progress; size?: 'sm' | 'md' }) {
  const tiles = [];
  for (let i = 0; i < progress.maxAttempts; i++) {
    const a = progress.attempts[i];
    tiles.push(
      <span
        key={i}
        className={`tile tile-${size} ${a ? `tone-${attemptTone(a)}` : 'tone-empty'}`}
        title={a ? `${a.passed}/${a.total}` : undefined}
      />,
    );
  }
  return <div className="tiles">{tiles}</div>;
}

const VERDICT_CLASS: Record<Verdict, string> = {
  pass: 'tone-pass',
  fail: 'tone-fail',
  error: 'tone-partial',
  timeout: 'tone-partial',
  skipped: 'tone-none',
};

export function SubmissionGrid({
  progress,
  totalTests,
  animateLast = false,
}: {
  progress: Progress;
  totalTests: number;
  animateLast?: boolean;
}) {
  const { t } = useI18n();
  const seen = useRef(Math.max(0, progress.attempts.length - (animateLast ? 1 : 0)));
  const rows = [];
  for (let i = 0; i < progress.maxAttempts; i++) {
    const a = progress.attempts[i];
    const fresh = !!a && i >= seen.current;
    const cells = [];
    for (let j = 0; j < totalTests; j++) {
      const v = a?.verdicts[j];
      cells.push(
        <span
          key={j}
          className={`cell ${v ? VERDICT_CLASS[v] : 'tone-empty'} ${fresh ? 'flip' : ''}`}
          style={fresh ? { animationDelay: `${j * 45}ms` } : undefined}
          title={v ? t(`verdict_${v}`) : undefined}
        />,
      );
    }
    rows.push(
      <div className="grid-row" key={i}>
        <span className="grid-label">#{i + 1}</span>
        <div className="grid-cells">{cells}</div>
        <span className="grid-meta">
          {a ? (
            <>
              <strong className={a.passed === a.total ? 'ok' : ''}>
                {a.passed}/{a.total}
              </strong>{' '}
              <span className="muted">{LANGUAGE_LABELS[a.language] ?? a.language}</span>
              {a.timeMs != null && <span className="muted"> · {formatMs(a.timeMs)}</span>}
            </>
          ) : null}
        </span>
      </div>,
    );
  }
  return (
    <div className="submission-grid">
      {rows}
      <div className="legend">
        <span>
          <i className="cell tone-pass" /> {t('legendPass')}
        </span>
        <span>
          <i className="cell tone-fail" /> {t('legendFail')}
        </span>
        <span>
          <i className="cell tone-partial" /> {t('legendError')}
        </span>
        <span>
          <i className="cell tone-none" /> {t('legendSkipped')}
        </span>
      </div>
    </div>
  );
}
