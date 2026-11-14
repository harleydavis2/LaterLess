import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const axis = { tickLine: false, axisLine: false, tick: { fontSize: 12, fill: '#78716c' } };
const tooltip = { cursor: { fill: '#f5f5f4' }, contentStyle: { borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 13 } };

export function WeeklyChart({ data, height = 180 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f5f5f4" />
        <XAxis dataKey="label" {...axis} />
        <YAxis allowDecimals={false} width={24} {...axis} />
        <Tooltip {...tooltip} formatter={(v) => [v, 'Completed']} labelFormatter={(_, p) => p?.[0]?.payload.date ?? ''} />
        <Bar dataKey="completed" fill="#0f766e" radius={[6, 6, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PlannedActualChart({ data }) {
  const short = data.map((d) => ({ ...d, label: d.name.length > 10 ? `${d.name.slice(0, 9)}…` : d.name }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={short} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f5f5f4" />
        <XAxis dataKey="label" {...axis} interval={0} />
        <YAxis width={32} unit="m" {...axis} />
        <Tooltip {...tooltip} labelFormatter={(_, p) => p?.[0]?.payload.name ?? ''} formatter={(v, name) => [`${v} min`, name]} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="planned" name="Planned" fill="#d6d3d1" radius={[6, 6, 0, 0]} maxBarSize={24} />
        <Bar dataKey="actual" name="Actual" fill="#0f766e" radius={[6, 6, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
