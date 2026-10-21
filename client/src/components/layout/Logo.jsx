import clsx from 'clsx';

export function Logo({ className, inverted }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm shadow-indigo-600/30">
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 16.5 10 11l3.5 3.5L19 8" />
        </svg>
      </span>
      <span className={clsx('text-[17px] font-semibold tracking-tight', inverted ? 'text-white' : 'text-fg')}>LeadFlow</span>
    </span>
  );
}
