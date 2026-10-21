import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard, ChartTooltip, useChartTheme } from './ChartCard.jsx';
import { formatMoney, formatMoneyShort } from '../../lib/format.js';

const monthLabel = (m) => `${new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })} ’${m.slice(2, 4)}`;
const monthLong = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

export function RevenueChart({ data, className }) {
  const theme = useChartTheme();
  const total = data.reduce((sum, m) => sum + m.value, 0);

  return (
    <ChartCard
      title="Revenue won"
      description={`${formatMoney(total)} closed across ${data.length} months`}
      className={className}
      table={{
        columns: [
          { key: 'month', label: 'Month', format: monthLong },
          { key: 'deals', label: 'Deals', numeric: true },
          { key: 'value', label: 'Revenue', numeric: true, format: formatMoney },
        ],
        rows: [...data].reverse(),
      }}
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 4, bottom: 0, left: 4 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={theme.grid} />
            <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fill: theme.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: theme.grid }} tickMargin={8} />
            <YAxis tickFormatter={formatMoneyShort} tick={{ fill: theme.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
            <Tooltip
              cursor={{ fill: theme.grid, opacity: 0.5 }}
              content={<ChartTooltip labelFormatter={monthLong} valueFormatter={(v) => formatMoney(v)} />}
            />
            <Bar dataKey="value" name="Revenue" fill={theme.series[0]} radius={[4, 4, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
