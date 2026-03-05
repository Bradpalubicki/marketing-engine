'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface SpendDataPoint {
  date: string
  google: number
  microsoft: number
  meta: number
}

interface SpendChartProps {
  data: SpendDataPoint[]
}

export function SpendChart({ data }: SpendChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No spend data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `$${v}`}
        />
        <Tooltip
          formatter={(value: number | string) => `$${Number(value).toFixed(2)}`}
          labelStyle={{ color: '#374151', fontWeight: 600 }}
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="google" name="Google" stackId="a" fill="#4285F4" radius={[0, 0, 0, 0]} />
        <Bar dataKey="microsoft" name="Microsoft" stackId="a" fill="#00a4ef" />
        <Bar dataKey="meta" name="Meta" stackId="a" fill="#1877F2" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
