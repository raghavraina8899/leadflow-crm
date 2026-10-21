import { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useClickOutside } from '../../lib/hooks.js';

export function Menu({ trigger, children, align = 'right', placement = 'bottom', width = 'w-56', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  return (
    <div ref={ref} className={clsx('relative', className)} onKeyDown={(e) => e.key === 'Escape' && close()}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          className={clsx(
            'animate-pop-in absolute z-40 rounded-xl border border-line bg-surface p-1 shadow-xl shadow-black/[0.07]',
            placement === 'top' ? 'bottom-full mb-1.5' : 'mt-1.5',
            align === 'right' ? 'right-0' : 'left-0',
            width,
          )}
          onClick={(e) => e.target.closest('[data-close]') && close()}
        >
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon: Icon, children, onClick, danger, selected, hint, disabled }) {
  return (
    <button
      type="button"
      role="menuitem"
      data-close
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition disabled:opacity-40',
        danger ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10' : 'hover:bg-surface-2',
      )}
    >
      {Icon && <Icon className={clsx('size-4 shrink-0', danger ? '' : 'text-subtle')} />}
      <span className="flex-1 truncate">{children}</span>
      {hint && <span className="text-xs text-subtle">{hint}</span>}
      {selected && <Check className="size-4 text-indigo-600 dark:text-indigo-400" />}
    </button>
  );
}

export const MenuLabel = ({ children }) => (
  <div className="px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-subtle uppercase">{children}</div>
);

export const MenuSeparator = () => <div className="my-1 h-px bg-line" />;
