import clsx from 'clsx';
import { initials } from '../../lib/format.js';

const AVATAR_TONES = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
];

const toneFor = (name = '') => AVATAR_TONES[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % AVATAR_TONES.length];

const AVATAR_SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-base',
  xl: 'size-14 text-lg',
};

export function Avatar({ name, size = 'md', className, square }) {
  return (
    <span
      title={name}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center font-semibold select-none',
        square ? 'rounded-xl' : 'rounded-full',
        AVATAR_SIZES[size],
        toneFor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Badge({ children, className, dot }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', className)}>
      {dot && <span className={clsx('size-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}

export function Skeleton({ className }) {
  return <div className={clsx('animate-pulse rounded-md bg-surface-3/70', className)} />;
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-line bg-surface-2 text-subtle">
          <Icon className="size-5" />
        </div>
      )}
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {children}
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={clsx('inline-flex rounded-lg bg-surface-2 p-0.5 ring-1 ring-line', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition',
            value === t.id ? 'bg-surface text-fg shadow-sm ring-1 ring-line' : 'text-muted hover:text-fg',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={clsx('rounded px-1.5 text-[11px] tabular-nums', t.alert ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-surface-3 text-muted')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Kbd({ children }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface px-1 font-sans text-[11px] text-subtle">
      {children}
    </kbd>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1 text-muted">{error?.message || 'Please try again.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
          Try again
        </button>
      )}
    </div>
  );
}
