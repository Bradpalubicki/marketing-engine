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
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface BarDataPoint {
  name: string
  form: number
  call: number
  chat: number
}

interface PieDataPoint {
  name: string
  value: number
}

interface AttributionChartProps {
  type: 'bar' | 'pie'
  data: BarDataPoint[] | PieDataPoint[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function AttributionChart({ type, data }: AttributionChartProps) {
  if (type === 'pie') {
    const pieData = data as PieDataPoint[]
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  const barData = data as BarDataPoint[]
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={barData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="form" fill="#3b82f6" name="Form" />
        <Bar dataKey="call" fill="#10b981" name="Call" />
        <Bar dataKey="chat" fill="#f59e0b" name="Chat" />
      </BarChart>
    </ResponsiveContainer>
  )
}
