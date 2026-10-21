import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  AlertTriangle, ArrowRight, CalendarCheck2, Check, Flame, IndianRupee, Kanban, Target, TrendingUp, UserPlus,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useLeadsChanged, useQuery } from '../lib/hooks.js';
import { ACTIVITY_TYPES, OPEN_STAGES } from '../lib/constants.js';
import { dueLabel, formatMoney, formatMoneyShort, formatNumber, greeting, timeAgo } from '../lib/format.js';
import { useAuth } from '../context/auth.jsx';
import { useToast } from '../context/toast.jsx';
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/Display.jsx';
import { Button } from '../components/ui/Button.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { TrendChart } from '../components/charts/TrendChart.jsx';
import { useChartTheme } from '../components/charts/ChartCard.jsx';
import { ScoreBadge } from '../components/leads/LeadBadges.jsx';

function Panel({ title, action, children, className }) {
  return (
    <section className={clsx('card flex flex-col', className)}>
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </header>
      <div className="flex-1 px-2 pb-2">{children}</div>
    </section>
  );
}

const ViewAll = ({ to }) => (
  <Link to={to} className="inline-flex items-center gap-1 text-[13px] font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
    View all <ArrowRight className="size-3.5" />
  </Link>
);

function StageBreakdown({ stages }) {
  const theme = useChartTheme();
  const rows = OPEN_STAGES.map((s) => ({ ...s, ...(stages[s.id] || { count: 0, value: 0 }) }));
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((sum, r) => sum + r.value, 0);

  return (
    <section className="card flex flex-col p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Open pipeline by stage</h2>
        <Link to="/pipeline" className="text-subtle hover:text-fg" aria-label="Open pipeline board"><Kanban className="size-4" /></Link>
      </div>
      <p className="mt-0.5 text-[13px] text-muted">{formatMoney(total)} across {formatNumber(rows.reduce((s, r) => s + r.count, 0))} deals</p>
      <ul className="mt-5 flex flex-1 flex-col justify-between gap-4">
        {rows.map((r) => (
          <li key={r.id}>
            <Link to={`/leads?status=${r.id}`} className="group block" title={`${r.label}: ${r.count} deals, ${formatMoney(r.value)}`}>
              <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                <span className="flex items-center gap-2 font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  <span className={clsx('size-2 rounded-full', r.dot)} />
                  {r.label}
                  <span className="font-normal text-subtle">{r.count}</span>
                </span>
                <span className="font-medium tabular-nums">{formatMoneyShort(r.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-2">
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: theme.series[0] }} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DueSoon({ tasks, onComplete }) {
  if (!tasks.length) {
    return <EmptyState icon={CalendarCheck2} title="Nothing due in the next 48 hours" description="Schedule follow-ups from any lead to keep deals moving." className="py-10" />;
  }
  return (
    <ul>
      {tasks.map((t) => (
        <li key={t.id} className="group flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-2/70">
          <button
            onClick={() => onComplete(t)}
            className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line-strong text-transparent transition hover:border-emerald-500 hover:text-emerald-500"
            aria-label={`Mark "${t.subject}" done`}
          >
            <Check className="size-3" strokeWidth={3} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium">{t.subject}</p>
            <p className="truncate text-xs text-muted">
              <Link to={`/leads/${t.lead_id}`} className="hover:text-fg hover:underline">{t.lead_name}</Link>
              {t.lead_company && ` · ${t.lead_company}`}
            </p>
          </div>
          <span className={clsx('shrink-0 text-xs font-medium', t.overdue ? 'text-rose-600 dark:text-rose-400' : 'text-muted')}>
            {dueLabel(t.due_at)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function HotLeads({ leads }) {
  if (!leads.length) return <EmptyState icon={Flame} title="No open leads yet" className="py-10" />;
  return (
    <ul>
      {leads.map((l) => (
        <li key={l.id}>
          <Link to={`/leads/${l.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-2/70">
            <Avatar name={l.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium">{l.name}</p>
              <p className="truncate text-xs text-muted">{l.company || '—'} · {formatMoneyShort(l.value)}</p>
            </div>
            <ScoreBadge score={l.score} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RecentActivity({ items }) {
  if (!items.length) return <EmptyState title="No activity yet" className="py-10" />;
  return (
    <ul className="px-3 pt-1">
      {items.map((a, i) => {
        const type = ACTIVITY_TYPES[a.type];
        return (
          <li key={a.id} className="relative flex gap-3 pb-4">
            {i < items.length - 1 && <span className="absolute top-7 bottom-0 left-3.25 w-px bg-line" />}
            <span className={clsx('relative flex size-7 shrink-0 items-center justify-center rounded-full', type.tone)}>
              <type.icon className="size-3.5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[13px] leading-snug">
                <span className="font-medium">{a.user_name}</span>
                <span className="text-muted"> · {a.subject.charAt(0).toLowerCase() + a.subject.slice(1)} · </span>
                <Link to={`/leads/${a.lead_id}`} className="font-medium hover:underline">{a.lead_name}</Link>
              </p>
              <p className="mt-0.5 text-xs text-subtle">{timeAgo(a.created_at)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TeamTable({ team }) {
  const max = Math.max(1, ...team.map((t) => t.won_value));
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-140 text-[13px]">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Rep</th>
            <th className="px-3 py-2 text-right font-medium">Leads</th>
            <th className="px-3 py-2 text-right font-medium">Won</th>
            <th className="px-3 py-2 text-right font-medium">Open pipeline</th>
            <th className="w-[34%] px-3 py-2 font-medium">Revenue won</th>
          </tr>
        </thead>
        <tbody>
          {team.map((t) => (
            <tr key={t.id} className="border-t border-line">
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-2.5 font-medium"><Avatar name={t.name} size="sm" />{t.name}</span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{t.leads}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{t.converted}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatMoneyShort(t.pipeline_value)}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(t.won_value / max) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right font-medium tabular-nums">{formatMoneyShort(t.won_value)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const dashboard = useQuery(() => api.get('/dashboard'), []);
  const hot = useQuery(() => api.get('/leads?status=open&sort=score&limit=5'), []);
  useLeadsChanged(() => { dashboard.reload(); hot.reload(); });

  const complete = async (task) => {
    dashboard.setData((d) => ({ ...d, dueSoon: d.dueSoon.filter((t) => t.id !== task.id) }));
    try {
      await api.patch(`/activities/${task.id}/complete`, { completed: true });
      toast.success('Follow-up completed', task.subject);
      dashboard.reload();
    } catch (err) {
      toast.error('Could not complete task', err.message);
      dashboard.reload();
    }
  };

  if (dashboard.error) return <ErrorState error={dashboard.error} onRetry={dashboard.reload} />;
  const d = dashboard.data;
  const k = d?.kpis;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        description={isAdmin ? "Here's how the team's pipeline is moving." : "Here's how your pipeline is moving."}
        actions={<Button to="/pipeline" icon={Kanban}>Open pipeline</Button>}
      />

      {k?.followUpsOverdue > 0 && (
        <Link
          to="/tasks"
          className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 transition hover:bg-amber-100/70 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span className="flex-1 text-[13.5px]">
            <span className="font-semibold">{k.followUpsOverdue} overdue follow-up{k.followUpsOverdue === 1 ? '' : 's'}</span>
            {' '}need attention. Deals go cold when follow-ups slip.
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={!d} label="Open pipeline" icon={IndianRupee} value={k && formatMoneyShort(k.pipelineValue)} sub={k && `${formatNumber(k.openLeads)} open deals`} />
        <StatCard loading={!d} label="Revenue won · 30 days" icon={TrendingUp} value={k && formatMoneyShort(k.won30)} delta={k?.wonChange} />
        <StatCard loading={!d} label="New leads · 30 days" icon={UserPlus} value={k && formatNumber(k.newLeads30)} delta={k?.newLeadsChange} />
        <StatCard loading={!d} label="Win rate" icon={Target} value={k && `${k.winRate}%`} sub={k && `${k.conversionRate}% of all leads convert`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {d ? (
          <>
            <TrendChart data={d.trend} description="Weekly new leads vs deals won, last 12 weeks" className="lg:col-span-2" />
            <StageBreakdown stages={d.stages} />
          </>
        ) : (
          <>
            <Skeleton className="h-85 rounded-xl lg:col-span-2" />
            <Skeleton className="h-85 rounded-xl" />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Due soon" action={<ViewAll to="/tasks" />}>
          {d ? <DueSoon tasks={d.dueSoon} onComplete={complete} /> : <Skeleton className="m-3 h-40" />}
        </Panel>
        <Panel title="Hottest open deals" action={<ViewAll to="/leads?status=open&sort=score" />}>
          {hot.data ? <HotLeads leads={hot.data.data} /> : <Skeleton className="m-3 h-40" />}
        </Panel>
        <Panel title="Recent activity">
          {d ? <RecentActivity items={d.recentActivity.slice(0, 6)} /> : <Skeleton className="m-3 h-40" />}
        </Panel>
      </div>

      {isAdmin && d?.team && (
        <Panel title="Team performance" action={<ViewAll to="/reports" />} className="mt-4">
          <TeamTable team={d.team} />
        </Panel>
      )}
    </>
  );
}

