import { useState } from 'react';
import clsx from 'clsx';
import { BarChart3, Table2 } from 'lucide-react';
import { useTheme } from '../../context/theme.jsx';
import { CHART_THEME } from '../../lib/constants.js';

export const useChartTheme = () => CHART_THEME[useTheme().resolved];

export function ChartCard({ title, description, action, table, children, className, bodyClassName }) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className={clsx('card flex flex-col', className)}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {table && (
            <button
              onClick={() => setShowTable((s) => !s)}
              className="flex size-8 items-center justify-center rounded-lg text-subtle transition hover:bg-surface-2 hover:text-fg"
              title={showTable ? 'Show chart' : 'Show as table'}
              aria-label={showTable ? 'Show chart' : 'Show as table'}
            >
              {showTable ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}
            </button>
          )}
        </div>
      </header>
      <div className={clsx('flex flex-1 flex-col px-5 pt-3 pb-4 [&>*]:flex-1', bodyClassName)}>
        {showTable && table ? <DataTable {...table} /> : children}
      </div>
    </section>
  );
}

export function DataTable({ columns, rows }) {
  return (
    <div className="scrollbar-thin max-h-72 overflow-auto rounded-lg border border-line">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-surface-2 text-xs text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={clsx('px-3 py-2 font-medium', c.numeric ? 'text-right' : 'text-left')}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-line">
              {columns.map((c) => (
                <td key={c.key} className={clsx('px-3 py-2', c.numeric && 'text-right tabular-nums')}>
                  {c.format ? c.format(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter = (v) => v }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] shadow-lg shadow-black/5">
      <p className="mb-1.5 font-medium">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-muted">
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums">{valueFormatter(p.value, p.dataKey)}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
