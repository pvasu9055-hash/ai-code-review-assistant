import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../api/client'

function Analytics() {
  const [trend, setTrend] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const res = await api.get('/reviews/analytics/trend')
        setTrend(res.data)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchTrend()
  }, [])

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const chartData = trend.map((t) => ({
    date: formatDate(t.date),
    score: t.score,
    project: t.projectName,
  }))

  const projectNames = Array.from(new Set(trend.map((t) => t.projectName)))

  const colors = ['#60A5FA', '#A78BFA', '#F472B6', '#4ADE80', '#FBBF24', '#F87171']

  const perProjectSeries = projectNames.map((name, idx) => ({
    name,
    color: colors[idx % colors.length],
    data: trend
      .filter((t) => t.projectName === name)
      .map((t) => ({ date: formatDate(t.date), score: t.score })),
  }))

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div
        className="absolute top-[-15%] right-[15%] w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{ background: 'var(--color-accent-purple)' }}
      />

      <div className="relative z-10 p-10 max-w-5xl mx-auto">
        <h1 className="text-3xl font-medium text-[var(--color-text)] mb-1">Analytics</h1>
        <p className="text-[var(--color-text-muted)] mb-8 text-sm">
          Code quality score trends over time
        </p>

        {loading ? (
          <p className="text-[var(--color-text-muted)] text-sm">Loading analytics...</p>
        ) : error ? (
          <p className="text-[#F87171] text-sm">{error}</p>
        ) : trend.length === 0 ? (
          <div
            className="p-10 rounded-2xl border border-white/10 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}
          >
            <p className="text-[var(--color-text-muted)] text-sm">
              No scored reviews yet. Submit a few reviews to see trends here.
            </p>
          </div>
        ) : (
          <div
            className="p-6 rounded-2xl border border-white/10"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
          >
            <p className="text-[var(--color-text)] font-medium mb-4 text-sm">
              Overall score trend ({trend.length} review{trend.length !== 1 ? 's' : ''})
            </p>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,15,20,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Overall score"
                  stroke="#60A5FA"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {perProjectSeries.map((p) => (
                <div key={p.name} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                    <p className="text-[var(--color-text)] text-sm font-medium truncate">{p.name}</p>
                  </div>
                  <p className="text-[var(--color-text-muted)] text-xs">
                    {p.data.length} review{p.data.length !== 1 ? 's' : ''} · latest score:{' '}
                    {p.data[p.data.length - 1]?.score ?? '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Analytics