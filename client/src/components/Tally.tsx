export function Tally({ n, max = 10, className = '' }: { n: number; max?: number; className?: string }) {
  const count = Math.max(0, Math.min(n, max));
  const groups = Math.ceil(count / 5) || 1;
  const w = groups * 26 - 6;
  const paths: string[] = [];
  for (let g = 0; g < groups; g++) {
    const inGroup = Math.min(5, count - g * 5);
    const x0 = g * 26 + 2;
    for (let i = 0; i < Math.min(inGroup, 4); i++) paths.push(`M${x0 + i * 4.5} 2.5 L${x0 + i * 4.5 + 0.6} 17.5`);
    if (inGroup === 5) paths.push(`M${x0 - 2} 14 L${x0 + 16} 5`);
  }
  const ghost = count === 0;
  if (ghost) for (let i = 0; i < 4; i++) paths.push(`M${2 + i * 4.5} 2.5 L${2.6 + i * 4.5} 17.5`);
  return (
    <svg className={`tally ${className}`} viewBox={`0 0 ${w} 20`} width={w} height={20} aria-hidden>
      {paths.map((d, i) => (
        <path key={i} d={d} className={ghost ? 'ghost' : undefined} />
      ))}
    </svg>
  );
}
