import type { ReactNode } from 'react';

export function Boxed({ children, draw = false }: { children: ReactNode; draw?: boolean }) {
  return (
    <span className={`boxed ${draw ? 'draw' : ''}`}>
      {children}
      <svg className="uline" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
        <path d="M0 3 H100" pathLength={1} />
        <path d="M3 8 H97" pathLength={1} />
      </svg>
    </span>
  );
}
