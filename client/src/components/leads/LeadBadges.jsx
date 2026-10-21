import clsx from 'clsx';
import { Badge } from '../ui/Display.jsx';
import { PRIORITY, STAGE } from '../../lib/constants.js';

export function StatusBadge({ status }) {
  const stage = STAGE[status];
  if (!stage) return null;
  return <Badge className={stage.badge} dot={stage.dot}>{stage.label}</Badge>;
}

export function PriorityIcon({ priority, showLabel, className }) {
  const p = PRIORITY[priority];
  if (!p) return null;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', className)} title={`${p.label} priority`}>
      <span className={clsx('flex items-end gap-[2px]', p.color)} aria-hidden>
        {[1, 2, 3].map((bar) => (
          <span key={bar} className={clsx('w-[3px] rounded-sm', bar <= p.bars ? 'bg-current' : 'bg-current opacity-20')} style={{ height: 3 + bar * 3 }} />
        ))}
      </span>
      {showLabel && <span className="text-muted">{p.label}</span>}
    </span>
  );
}

export function ScoreBadge({ score, size = 'sm' }) {
  if (score === null || score === undefined) return <span className="text-subtle">—</span>;
  const tone = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-slate-400';
  const label = score >= 70 ? 'Hot' : score >= 40 ? 'Warm' : 'Cold';
  return (
    <span className="inline-flex items-center gap-2" title={`Lead score ${score}/100 · ${label}`}>
      <span className={clsx('relative overflow-hidden rounded-full bg-surface-3', size === 'sm' ? 'h-1.5 w-10' : 'h-2 w-16')}>
        <span className={clsx('absolute inset-y-0 left-0 rounded-full', tone)} style={{ width: `${score}%` }} />
      </span>
      <span className="text-xs font-medium text-muted tabular-nums">{score}</span>
    </span>
  );
}

export function TagList({ tags = [], max = 3, onClick }) {
  if (!tags.length) return null;
  const shown = tags.slice(0, max);
  return (
    <span className="inline-flex flex-wrap gap-1">
      {shown.map((t) => (
        <button
          key={t}
          type="button"
          onClick={onClick ? (e) => { e.stopPropagation(); onClick(t); } : undefined}
          className={clsx(
            'rounded-md border border-line bg-surface-2 px-1.5 py-px text-[11px] font-medium text-muted',
            onClick ? 'hover:border-indigo-300 hover:text-indigo-600' : 'cursor-default',
          )}
        >
          {t}
        </button>
      ))}
      {tags.length > max && <span className="px-1 text-[11px] text-subtle">+{tags.length - max}</span>}
    </span>
  );
}
