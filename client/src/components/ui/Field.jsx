import { forwardRef, useId, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, X } from 'lucide-react';

export function Field({ label, hint, error, className, children, id }) {
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="label">{label}</label>}
      {children}
      {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : hint && <p className="mt-1.5 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, hint, error, className, icon: Icon, ...props }, ref) {
  const id = useId();
  const input = Icon ? (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
      <input ref={ref} id={id} className={clsx('field pl-9', error && 'border-rose-400')} {...props} />
    </div>
  ) : (
    <input ref={ref} id={id} className={clsx('field', error && 'border-rose-400')} {...props} />
  );
  return label || hint || error ? <Field {...{ label, hint, error, className, id }}>{input}</Field> : <div className={className}>{input}</div>;
});

export const Textarea = forwardRef(function Textarea({ label, hint, className, ...props }, ref) {
  const id = useId();
  return (
    <Field {...{ label, hint, className, id }}>
      <textarea ref={ref} id={id} className="field min-h-[72px] resize-y leading-relaxed" {...props} />
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, hint, className, children, size = 'md', ...props }, ref) {
  const id = useId();
  const select = (
    <div className="relative">
      <select
        ref={ref}
        id={id}
        className={clsx('field cursor-pointer appearance-none pr-8', size === 'sm' && 'h-8 py-1 text-[13px]')}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-subtle" />
    </div>
  );
  return label || hint ? <Field {...{ label, hint, className, id }}>{select}</Field> : <div className={className}>{select}</div>;
});

export function Checkbox({ checked, indeterminate, onChange, className, ...props }) {
  return (
    <input
      type="checkbox"
      ref={(el) => el && (el.indeterminate = Boolean(indeterminate))}
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className={clsx('size-4 cursor-pointer rounded border-line-strong accent-indigo-600', className)}
      {...props}
    />
  );
}

export function TagInput({ value = [], onChange, suggestions = [], placeholder = 'Add tag…' }) {
  const [draft, setDraft] = useState('');
  const add = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/,/g, '');
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft('');
  };
  const listId = useId();

  return (
    <div className="field flex min-h-9 flex-wrap items-center gap-1.5 px-2 py-1.5">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="text-subtle hover:text-fg">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        list={listId}
        value={draft}
        onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={value.length ? '' : placeholder}
        className="min-w-[80px] flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-subtle"
      />
      <datalist id={listId}>
        {suggestions.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}
