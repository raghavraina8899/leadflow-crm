import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Skeleton } from './Display.jsx';

export function Delta({ value, suffix = 'vs prior 30d' }) {
  if (value === undefined || value === null) return null;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span
        className={clsx(
          'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold',
          value > 0 && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
          value < 0 && 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
          value === 0 && 'bg-surface-2 text-muted',
        )}
      >
        <Icon className="size-3" />
        {Math.abs(value)}%
      </span>
      <span className="text-subtle">{suffix}</span>
    </span>
  );
}

export function StatCard({ label, value, sub, delta, icon: Icon, loading, className }) {
  return (
    <div className={clsx('card p-5', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        {Icon && <Icon className="size-4 text-subtle" />}
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-8 w-28" />
          <Skeleton className="mt-3 h-4 w-36" />
        </>
      ) : (
        <>
          <p className="mt-2 text-[28px] leading-none font-semibold tracking-tight">{value}</p>
          <div className="mt-3 flex min-h-5 flex-wrap items-center gap-2">
            {delta !== undefined ? <Delta value={delta} /> : <span className="text-xs text-muted">{sub}</span>}
          </div>
        </>
      )}
    </div>
  );
}
