import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 focus-visible:ring-indigo-500/40',
  secondary: 'border border-line bg-surface text-fg shadow-[0_1px_2px_rgba(16,16,24,0.05)] hover:bg-surface-2 focus-visible:ring-indigo-500/25',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg focus-visible:ring-indigo-500/25',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-500 focus-visible:ring-rose-500/40',
  'danger-ghost': 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10',
};

const SIZES = {
  xs: 'h-7 gap-1 rounded-md px-2 text-xs',
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-[13px]',
  md: 'h-9 gap-2 rounded-lg px-3.5 text-sm',
  lg: 'h-11 gap-2 rounded-xl px-5 text-[15px]',
  icon: 'size-9 rounded-lg',
  'icon-sm': 'size-8 rounded-lg',
};

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, loading, className, children, to, href, ...props },
  ref,
) {
  const classes = clsx(
    'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition select-none',
    'focus-visible:ring-4 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
  const iconSize = size === 'xs' ? 'size-3.5' : 'size-4';
  const content = (
    <>
      {loading ? <Loader2 className={clsx(iconSize, 'animate-spin')} /> : Icon && <Icon className={iconSize} />}
      {children}
      {IconRight && <IconRight className={iconSize} />}
    </>
  );

  if (to) return <Link ref={ref} to={to} className={classes} {...props}>{content}</Link>;
  if (href) return <a ref={ref} href={href} className={classes} {...props}>{content}</a>;
  return (
    <button ref={ref} type="button" className={classes} disabled={loading || props.disabled} {...props}>
      {content}
    </button>
  );
});
