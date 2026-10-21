import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard, ChartTooltip, Legend, useChartTheme } from './ChartCard.jsx';
import { formatShortDate } from '../../lib/format.js';

const weekLabel = (w) => `Week of ${formatShortDate(w)}`;

export function TrendChart({ data, title = 'Lead flow', description, className }) {
  const theme = useChartTheme();
  const [createdColor, convertedColor] = theme.series;
  const last = data[data.length - 1];

  return (
    <ChartCard
      title={title}
      description={description}
      className={className}
      action={<Legend items={[{ label: 'New leads', color: createdColor }, { label: 'Won', color: convertedColor }]} />}
      table={{
        columns: [
          { key: 'week', label: 'Week of', format: formatShortDate },
          { key: 'created', label: 'New leads', numeric: true },
          { key: 'converted', label: 'Won', numeric: true },
        ],
        rows: [...data].reverse(),
      }}
    >
      <div className="h-64 lg:h-full lg:min-h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 36, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke={theme.grid} />
            <XAxis
              dataKey="week"
              tickFormatter={formatShortDate}
              tick={{ fill: theme.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: theme.grid }}
              interval={Math.max(0, Math.ceil(data.length / 7) - 1)}
              tickMargin={8}
            />
            <YAxis allowDecimals={false} tick={{ fill: theme.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              cursor={{ stroke: theme.cursor, strokeWidth: 1 }}
              content={<ChartTooltip labelFormatter={weekLabel} />}
            />
            <Line
              type="monotone"
              dataKey="created"
              name="New leads"
              stroke={createdColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4.5, strokeWidth: 2, stroke: theme.surface }}
              label={({ x, y, index }) => index === data.length - 1 ? (
                <text x={x + 8} y={y} dy={4} fontSize={11} fontWeight={600} fill={theme.axis}>{last.created}</text>
              ) : null}
            />
            <Line
              type="monotone"
              dataKey="converted"
              name="Won"
              stroke={convertedColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4.5, strokeWidth: 2, stroke: theme.surface }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
