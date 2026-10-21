import { ChartCard, useChartTheme } from './ChartCard.jsx';
import { STAGE } from '../../lib/constants.js';
import { formatNumber } from '../../lib/format.js';

const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

export function FunnelChart({ data, className }) {
  const theme = useChartTheme();
  const top = data[0]?.count || 0;

  return (
    <ChartCard
      title="Conversion funnel"
      description="Share of leads that reached each stage"
      className={className}
      table={{
        columns: [
          { key: 'stage', label: 'Stage', format: (s) => STAGE[s].label },
          { key: 'count', label: 'Leads', numeric: true },
          { key: 'ofTotal', label: '% of total', numeric: true, format: (v) => `${v}%` },
          { key: 'step', label: 'Step conversion', numeric: true, format: (v) => (v === null ? '—' : `${v}%`) },
        ],
        rows: data.map((d, i) => ({
          ...d,
          ofTotal: percent(d.count, top),
          step: i === 0 ? null : percent(d.count, data[i - 1].count),
        })),
      }}
    >
      <ol className="space-y-2.5">
        {data.map((d, i) => {
          const width = Math.max(percent(d.count, top), 2);
          const step = i === 0 ? null : percent(d.count, data[i - 1].count);
          return (
            <li key={d.stage} className="group" title={`${STAGE[d.stage].label}: ${formatNumber(d.count)} leads (${percent(d.count, top)}% of total)`}>
              <div className="mb-1 flex items-baseline justify-between text-[13px]">
                <span className="font-medium">{STAGE[d.stage].label}</span>
                <span className="text-muted tabular-nums">
                  <span className="font-semibold text-fg">{formatNumber(d.count)}</span>
                  <span className="ml-2 inline-block w-10 text-right">{percent(d.count, top)}%</span>
                </span>
              </div>
              <div className="h-6 rounded-md bg-surface-2">
                <div
                  className="h-full rounded-md transition-[width] duration-500 group-hover:brightness-110"
                  style={{ width: `${width}%`, background: theme.funnel[i] }}
                />
              </div>
              {step !== null && (
                <p className="mt-1 text-[11px] text-subtle">{step}% moved on from {STAGE[data[i - 1].stage].label.toLowerCase()}</p>
              )}
            </li>
          );
        })}
      </ol>
    </ChartCard>
  );
}
