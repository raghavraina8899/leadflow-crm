import { useState } from 'react';
import clsx from 'clsx';
import { Clock, IndianRupee, Percent, Target, UserPlus } from 'lucide-react';
import { api, qs } from '../lib/api.js';
import { useQuery } from '../lib/hooks.js';
import { formatMoney, formatMoneyShort, formatNumber } from '../lib/format.js';
import { useTeam } from '../lib/directory.js';
import { useAuth } from '../context/auth.jsx';
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton, Tabs } from '../components/ui/Display.jsx';
import { Select } from '../components/ui/Field.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { ChartCard, useChartTheme } from '../components/charts/ChartCard.jsx';
import { TrendChart } from '../components/charts/TrendChart.jsx';
import { RevenueChart } from '../components/charts/RevenueChart.jsx';
import { FunnelChart } from '../components/charts/FunnelChart.jsx';

const RANGES = [
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: '180', label: '6 months' },
  { id: '365', label: '12 months' },
];

function HorizontalBars({ rows, valueKey, format = formatNumber, detail }) {
  const theme = useChartTheme();
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r[valueKey])}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-medium">{r.label}</span>
            <span className="shrink-0 text-muted tabular-nums">
              <span className="font-semibold text-fg">{format(r[valueKey])}</span>
              {detail && <span className="ml-2">{detail(r)}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(2, (r[valueKey] / max) * 100)}%`, background: theme.series[0] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Leaderboard({ owners }) {
  const best = Math.max(...owners.map((o) => o.wonValue));
  return (
    <section className="card overflow-hidden">
      <header className="px-5 pt-4 pb-3">
        <h2 className="font-semibold">Rep performance</h2>
        <p className="mt-0.5 text-[13px] text-muted">Leads created in this period, by owner</p>
      </header>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-160 text-[13.5px]">
          <thead className="border-y border-line bg-surface-2/60 text-left text-xs text-muted">
            <tr>
              <th className="px-5 py-2.5 font-medium">Rep</th>
              <th className="px-3 py-2.5 text-right font-medium">Leads</th>
              <th className="px-3 py-2.5 text-right font-medium">Calls, meetings & emails</th>
              <th className="px-3 py-2.5 text-right font-medium">Won</th>
              <th className="px-3 py-2.5 text-right font-medium">Lost</th>
              <th className="px-3 py-2.5 text-right font-medium">Win rate</th>
              <th className="px-5 py-2.5 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((o, i) => (
              <tr key={o.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-3 font-medium">
                    <span className="w-4 text-xs text-subtle tabular-nums">{i + 1}</span>
                    <Avatar name={o.name} size="sm" />
                    {o.name}
                  </span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{o.leads}</td>
                <td className="px-3 py-3 text-right tabular-nums">{o.touches}</td>
                <td className="px-3 py-3 text-right tabular-nums">{o.converted}</td>
                <td className="px-3 py-3 text-right tabular-nums">{o.lost}</td>
                <td className="px-3 py-3 text-right tabular-nums">{o.converted + o.lost ? `${o.winRate}%` : '—'}</td>
                <td className={clsx('px-5 py-3 text-right font-semibold tabular-nums', o.wonValue === best && best > 0 && 'text-emerald-600 dark:text-emerald-400')}>
                  {formatMoney(o.wonValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Reports() {
  const { isAdmin } = useAuth();
  const team = useTeam();
  const [days, setDays] = useState('90');
  const [owner, setOwner] = useState('');
  const report = useQuery(() => api.get(`/reports${qs({ days, owner })}`), [days, owner]);

  if (report.error) return <ErrorState error={report.error} onRetry={report.reload} />;
  const r = report.data;
  const s = r?.summary;

  return (
    <>
      <PageHeader title="Reports" description={isAdmin ? 'Pipeline health and team performance.' : 'How your pipeline is performing.'} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tabs tabs={RANGES} value={days} onChange={setDays} />
        {isAdmin && (
          <Select size="sm" value={owner} onChange={(e) => setOwner(e.target.value)} className="w-44">
            <option value="">Whole team</option>
            {team.filter((u) => u.role === 'sales').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        )}
      </div>

      <div className={clsx('transition-opacity', report.loading && r && 'opacity-60')}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard loading={!r} label="New leads" icon={UserPlus} value={s && formatNumber(s.leads)} sub={s && `${s.converted} won · ${s.lost} lost`} />
          <StatCard loading={!r} label="Revenue won" icon={IndianRupee} value={s && formatMoneyShort(s.wonValue)} sub={s && `from leads created in period`} />
          <StatCard loading={!r} label="Win rate" icon={Target} value={s && `${s.winRate}%`} sub="Won ÷ (won + lost)" />
          <StatCard loading={!r} label="Avg. deal size" icon={Percent} value={s && (s.avgDeal ? formatMoneyShort(s.avgDeal) : '—')} sub="Across won deals" />
          <StatCard loading={!r} label="Avg. time to close" icon={Clock} value={s && (s.avgDaysToConvert === null ? '—' : `${s.avgDaysToConvert} days`)} sub="Created → won" />
        </div>

        {r ? (
          <>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <TrendChart data={r.trend} title="Leads vs wins" description="Weekly new leads and deals won" className="lg:col-span-2" />
              <FunnelChart data={r.funnel} />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <RevenueChart data={r.revenue} className="lg:col-span-1" />
              <ChartCard
                title="Lead sources"
                description="Volume and conversion by channel"
                table={{
                  columns: [
                    { key: 'source', label: 'Source' },
                    { key: 'leads', label: 'Leads', numeric: true },
                    { key: 'converted', label: 'Won', numeric: true },
                    { key: 'rate', label: 'Conversion', numeric: true, format: (v) => `${v}%` },
                    { key: 'wonValue', label: 'Revenue', numeric: true, format: formatMoney },
                  ],
                  rows: r.sources,
                }}
              >
                {r.sources.length ? (
                  <HorizontalBars
                    rows={r.sources.map((x) => ({ ...x, label: x.source }))}
                    valueKey="leads"
                    detail={(x) => `${x.rate}% won`}
                  />
                ) : <EmptyState title="No leads in this period" className="py-8" />}
              </ChartCard>
              <ChartCard
                title="Why deals are lost"
                description={s.lost ? `${s.lost} lost deals in this period` : 'No lost deals in this period'}
                table={r.lostReasons.length ? {
                  columns: [{ key: 'reason', label: 'Reason' }, { key: 'count', label: 'Deals', numeric: true }],
                  rows: r.lostReasons,
                } : undefined}
              >
                {r.lostReasons.length ? (
                  <HorizontalBars rows={r.lostReasons.map((x) => ({ ...x, label: x.reason }))} valueKey="count" />
                ) : <EmptyState title="Nothing lost" description="Keep it up." className="py-8" />}
              </ChartCard>
            </div>

            {r.owners && !owner && <div className="mt-4"><Leaderboard owners={r.owners} /></div>}
          </>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-80 rounded-xl lg:col-span-2" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        )}
      </div>
    </>
  );
}
