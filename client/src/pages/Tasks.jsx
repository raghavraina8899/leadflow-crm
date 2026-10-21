import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { AlarmClock, CalendarCheck2, Check, Mail, PartyPopper, Phone, RotateCcw } from 'lucide-react';
import { api, qs } from '../lib/api.js';
import { announceLeadsChanged, useQuery } from '../lib/hooks.js';
import { dueLabel, formatDateTime, startOfDay } from '../lib/format.js';
import { useAuth } from '../context/auth.jsx';
import { useToast } from '../context/toast.jsx';
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton, Tabs } from '../components/ui/Display.jsx';
import { Menu, MenuItem, MenuLabel } from '../components/ui/Menu.jsx';
import { PriorityIcon } from '../components/leads/LeadBadges.jsx';

const DAY = 86400000;

function bucketFor(due) {
  const today = startOfDay(new Date()).getTime();
  const time = new Date(due).getTime();
  if (time < Date.now()) return 'overdue';
  if (time < today + DAY) return 'today';
  if (time < today + 2 * DAY) return 'tomorrow';
  if (time < today + 7 * DAY) return 'week';
  return 'later';
}

const BUCKETS = [
  { id: 'overdue', label: 'Overdue', tone: 'text-rose-600 dark:text-rose-400' },
  { id: 'today', label: 'Today', tone: 'text-fg' },
  { id: 'tomorrow', label: 'Tomorrow', tone: 'text-fg' },
  { id: 'week', label: 'Next 7 days', tone: 'text-fg' },
  { id: 'later', label: 'Later', tone: 'text-muted' },
];

function TaskRow({ task, showOwner, onToggle, onSnooze }) {
  const done = Boolean(task.completed_at);
  return (
    <li className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:px-5">
      <button
        onClick={() => onToggle(task)}
        className={clsx(
          'flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition',
          done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-line-strong text-transparent hover:border-emerald-500 hover:text-emerald-500',
        )}
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
      >
        <Check className="size-3" strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <p className={clsx('truncate text-[13.5px] font-medium', done && 'text-muted line-through')}>{task.subject}</p>
        <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted">
          <Link to={`/leads/${task.lead_id}`} className="font-medium text-fg/80 hover:text-indigo-600 hover:underline dark:hover:text-indigo-400">{task.lead_name}</Link>
          {task.lead_company && <span className="truncate">{task.lead_company}</span>}
          <PriorityIcon priority={task.lead_priority} />
        </p>
      </div>

      <div className="hidden items-center gap-0.5 opacity-0 transition group-hover:opacity-100 sm:flex">
        {task.lead_phone && (
          <a href={`tel:${task.lead_phone.replace(/\s/g, '')}`} className="rounded-md p-1.5 text-subtle hover:bg-surface-3 hover:text-fg" aria-label="Call">
            <Phone className="size-4" />
          </a>
        )}
        {task.lead_email && (
          <a href={`mailto:${task.lead_email}`} className="rounded-md p-1.5 text-subtle hover:bg-surface-3 hover:text-fg" aria-label="Email">
            <Mail className="size-4" />
          </a>
        )}
      </div>

      {!done && (
        <Menu
          width="w-40"
          trigger={({ toggle }) => (
            <button onClick={toggle} className="rounded-md p-1.5 text-subtle hover:bg-surface-3 hover:text-fg" aria-label="Snooze">
              <AlarmClock className="size-4" />
            </button>
          )}
        >
          <MenuLabel>Snooze</MenuLabel>
          {[[1, '1 day'], [3, '3 days'], [7, '1 week']].map(([days, label]) => (
            <MenuItem key={days} onClick={() => onSnooze(task, days)}>{label}</MenuItem>
          ))}
        </Menu>
      )}

      <span className={clsx('w-28 shrink-0 text-right text-xs font-medium sm:w-36', task.overdue ? 'text-rose-600 dark:text-rose-400' : 'text-muted')}>
        {done ? `Done ${formatDateTime(task.completed_at)}` : dueLabel(task.due_at)}
      </span>
      {showOwner && <Avatar name={task.user_name} size="xs" />}
    </li>
  );
}

export default function Tasks() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('open');
  const [mine, setMine] = useState(!isAdmin);
  const tasks = useQuery(
    () => api.get(`/activities/tasks${qs({ filter: tab === 'open' ? 'pending' : 'completed', mine: mine ? 'true' : '' })}`),
    [tab, mine],
  );

  const groups = useMemo(() => {
    const list = tasks.data ?? [];
    return BUCKETS.map((b) => ({ ...b, items: list.filter((t) => bucketFor(t.due_at) === b.id) })).filter((g) => g.items.length);
  }, [tasks.data]);

  const overdueCount = groups.find((g) => g.id === 'overdue')?.items.length ?? 0;

  const toggle = async (task) => {
    const completed = !task.completed_at;
    tasks.setData((list) => list.filter((t) => t.id !== task.id));
    try {
      await api.patch(`/activities/${task.id}/complete`, { completed });
      announceLeadsChanged();
      if (completed) {
        toast.info('Follow-up completed', task.subject, {
          label: 'Undo',
          onClick: () => api.patch(`/activities/${task.id}/complete`, { completed: false }).then(() => { tasks.reload(); announceLeadsChanged(); }),
        });
      } else {
        toast.success('Moved back to open', task.subject);
      }
    } catch (err) {
      toast.error('Could not update', err.message);
      tasks.reload();
    }
  };

  const snooze = async (task, days) => {
    try {
      await api.patch(`/activities/${task.id}/reschedule`, { days });
      toast.success('Snoozed', task.subject);
      tasks.reload();
      announceLeadsChanged();
    } catch (err) {
      toast.error('Could not snooze', err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Follow-ups"
        description={tab === 'open'
          ? overdueCount ? `${overdueCount} overdue — start with these.` : 'You are on top of things. Nothing is overdue.'
          : 'Completed in the last 30 days.'}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'open', label: 'Open', count: tab === 'open' ? tasks.data?.length : undefined, alert: overdueCount > 0 },
            { id: 'completed', label: 'Completed' },
          ]}
        />
        {isAdmin && (
          <Tabs value={mine ? 'mine' : 'all'} onChange={(v) => setMine(v === 'mine')} tabs={[{ id: 'all', label: 'Everyone' }, { id: 'mine', label: 'Assigned to me' }]} />
        )}
      </div>

      {tasks.error && <ErrorState error={tasks.error} onRetry={tasks.reload} />}
      {!tasks.data && !tasks.error && <Skeleton className="h-96 rounded-xl" />}

      {tasks.data && !tasks.data.length && (
        <div className="card">
          <EmptyState
            icon={tab === 'open' ? PartyPopper : CalendarCheck2}
            title={tab === 'open' ? 'Inbox zero' : 'Nothing completed yet'}
            description={tab === 'open' ? 'No open follow-ups. Schedule next steps from any lead page.' : 'Completed follow-ups from the last 30 days show here.'}
          />
        </div>
      )}

      {tasks.data && tab === 'open' && (
        <div className={clsx('space-y-4 transition-opacity', tasks.loading && 'opacity-60')}>
          {groups.map((g) => (
            <section key={g.id} className="card overflow-hidden">
              <h2 className={clsx('flex items-center gap-2 border-b border-line bg-surface-2/50 px-5 py-2.5 text-[13px] font-semibold', g.tone)}>
                {g.label}
                <span className="rounded-md bg-surface-3 px-1.5 text-xs font-medium text-muted tabular-nums">{g.items.length}</span>
              </h2>
              <ul className="divide-y divide-line">
                {g.items.map((t) => <TaskRow key={t.id} task={t} showOwner={isAdmin && !mine} onToggle={toggle} onSnooze={snooze} />)}
              </ul>
            </section>
          ))}
        </div>
      )}

      {tasks.data?.length > 0 && tab === 'completed' && (
        <section className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {tasks.data.map((t) => <TaskRow key={t.id} task={t} showOwner={isAdmin && !mine} onToggle={toggle} onSnooze={snooze} />)}
          </ul>
          <p className="flex items-center gap-1.5 border-t border-line px-5 py-3 text-xs text-muted">
            <RotateCcw className="size-3.5" /> Tick a completed item to reopen it.
          </p>
        </section>
      )}
    </>
  );
}
