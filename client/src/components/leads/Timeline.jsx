import clsx from 'clsx';
import { Trash2 } from 'lucide-react';
import { ACTIVITY_TYPES } from '../../lib/constants.js';
import { formatDate, formatTime, startOfDay } from '../../lib/format.js';
import { EmptyState } from '../ui/Display.jsx';

function dayHeading(date) {
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(date))) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return formatDate(date, { weekday: 'short' });
}

function groupByDay(items) {
  const groups = [];
  for (const item of items) {
    const key = startOfDay(new Date(item.created_at)).getTime();
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, label: dayHeading(item.created_at), items: [item] });
  }
  return groups;
}

export function Timeline({ activities, canDelete, onDelete }) {
  if (!activities.length) {
    return <EmptyState title="No activity yet" description="Log a call, meeting or note above to start this lead's history." className="py-10" />;
  }

  return (
    <div className="space-y-6">
      {groupByDay(activities).map((group) => (
        <div key={group.key}>
          <p className="mb-3 text-xs font-semibold tracking-wide text-subtle uppercase">{group.label}</p>
          <ol>
            {group.items.map((a, i) => {
              const type = ACTIVITY_TYPES[a.type];
              const isStage = a.type === 'status_change';
              return (
                <li key={a.id} className="group relative flex gap-3.5 pb-5 last:pb-0">
                  {i < group.items.length - 1 && <span className="absolute top-8 bottom-1 left-3.75 w-px bg-line" />}
                  <span className={clsx('relative flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-surface', type.tone)}>
                    <type.icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className={clsx('text-[13.5px] leading-snug', isStage ? 'text-muted' : 'font-medium', a.completed_at && 'text-muted line-through decoration-line-strong')}>
                        {isStage ? <><span className="font-medium text-fg">{a.user_name}</span> {a.subject.charAt(0).toLowerCase() + a.subject.slice(1)}</> : a.subject}
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        <time className="text-xs text-subtle" dateTime={a.created_at}>{formatTime(a.created_at)}</time>
                        {!isStage && canDelete(a) && (
                          <button
                            onClick={() => onDelete(a)}
                            className="text-subtle opacity-0 transition group-hover:opacity-100 hover:text-rose-600 focus:opacity-100"
                            aria-label="Delete activity"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {!isStage && (
                      <p className="mt-0.5 text-xs text-subtle">
                        {type.label} by {a.user_name}
                        {a.due_at && ` · due ${formatDate(a.due_at, { year: undefined })}`}
                        {a.completed_at && ' · done'}
                      </p>
                    )}
                    {a.notes && (
                      <p className={clsx('mt-2 text-[13px] leading-relaxed whitespace-pre-wrap', isStage ? 'text-muted' : 'rounded-lg bg-surface-2 px-3 py-2')}>
                        {isStage ? `Reason: ${a.notes}` : a.notes}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
