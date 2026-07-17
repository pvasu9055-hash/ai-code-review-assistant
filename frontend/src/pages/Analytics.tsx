import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../api/client'

function Analytics() {
  const [trend, setTrend] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendRes, projectsRes] = await Promise.all([
          api.get('/reviews/analytics/trend'),
          api.get('/reviews/projects'),
        ])
        setTrend(trendRes.data)
        setProjects(projectsRes.data)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    const fetchInsights = async () => {
      try {
        const res = await api.get('/reviews/insights')
        setInsights(res.data)
      } catch (err) {
        // silent fail, insights card just won't render
      } finally {
        setInsightsLoading(false)
      }
    }
    fetchData()
    fetchInsights()
  }, [])

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const timeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const scoreColor = (score: number | null) => {
    if (score === null || score === undefined) return '#9CA3AF'
    if (score >= 80) return '#4ADE80'
    if (score >= 50) return '#FBBF24'
    return '#F87171'
  }

  const chartData = trend.map((t) => ({
    date: formatDate(t.date),
    score: t.score,
    project: t.projectName,
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
          Code quality score trends and repository breakdowns
        </p>

        {/* AI Insights panel - shown first */}
        {!insightsLoading && insights && (
          <div
            className="p-6 rounded-2xl border mb-8"
            style={{
              borderColor: 'rgba(167,139,250,0.3)',
              background: 'linear-gradient(135deg, rgba(96,165,250,0.06), rgba(167,139,250,0.08), rgba(244,114,182,0.06))',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📊</span>
              <p className="text-[var(--color-text)] font-medium text-sm">AI Insights</p>
            </div>

            <p className="text-[var(--color-text)] text-sm mb-5 leading-relaxed">{insights.narrative}</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-[var(--color-text)] text-xl font-semibold">{insights.repositoriesReviewed}</p>
                <p className="text-[var(--color-text-muted)] text-xs">Repositories reviewed</p>
              </div>
              <div>
                <p className="text-xl font-semibold" style={{ color: scoreColor(insights.averageQuality) }}>
                  {insights.averageQuality ?? '—'}
                </p>
                <p className="text-[var(--color-text-muted)] text-xs">Average quality</p>
              </div>
              <div>
                <p className="text-[var(--color-text)] text-xl font-semibold">{insights.securityIssuesCount}</p>
                <p className="text-[var(--color-text-muted)] text-xs">Security issues</p>
              </div>
              <div>
                <p className="text-[var(--color-text)] text-xl font-semibold">{insights.performanceIssuesCount}</p>
                <p className="text-[var(--color-text-muted)] text-xs">Performance suggestions</p>
              </div>
              <div>
                <p className="text-[var(--color-text)] text-sm font-medium truncate">
                  {insights.mostCommonIssue || '—'}
                </p>
                <p className="text-[var(--color-text-muted)] text-xs">
                  Most common issue {insights.mostCommonIssueCount ? `(${insights.mostCommonIssueCount}×)` : ''}
                </p>
              </div>
              <div>
                <p className="text-[#4ADE80] text-sm font-medium truncate">
                  {insights.mostImprovedRepo ? `${insights.mostImprovedRepo} (+${insights.mostImprovedDelta})` : '—'}
                </p>
                <p className="text-[var(--color-text-muted)] text-xs">Most improved repo</p>
              </div>
            </div>

            <p className="text-[var(--color-text-muted)] text-xs mt-4 italic">Generated by AI</p>
          </div>
        )}

        {loading ? (
          <p className="text-[var(--color-text-muted)] text-sm">Loading analytics...</p>
        ) : error ? (
          <p className="text-[#F87171] text-sm">{error}</p>
        ) : (
          <>
            {/* Score trend chart */}
            {trend.length === 0 ? (
              <div
                className="p-10 rounded-2xl border border-white/10 text-center mb-8"
                style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}
              >
                <p className="text-[var(--color-text-muted)] text-sm">
                  No scored reviews yet. Submit a few reviews to see trends here.
                </p>
              </div>
            ) : (
              <div
                className="p-6 rounded-2xl border border-white/10 mb-8"
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
              </div>
            )}

            {/* Repository analytics cards */}
            {projects.length > 0 && (
              <div className="mb-8">
                <p className="text-[var(--color-text)] font-medium mb-3 text-sm">
                  Repositories ({projects.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((p) => (
                    <Link
                      to={`/history?search=${encodeURIComponent(p.projectName)}`}
                      key={p.projectId}
                      className="p-5 rounded-2xl border border-white/10 block hover:border-white/20 transition cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[var(--color-text)] font-medium truncate">{p.projectName}</p>
                        <div
                          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold border-2"
                          style={{ borderColor: scoreColor(p.averageScore), color: scoreColor(p.averageScore) }}
                        >
                          {p.averageScore ?? '—'}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-[var(--color-text)] text-lg font-semibold">{p.reviewCount}</p>
                          <p className="text-[var(--color-text-muted)] text-xs">Reviews</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-text)] text-lg font-semibold">{p.averageScore ?? '—'}</p>
                          <p className="text-[var(--color-text-muted)] text-xs">Avg score</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-text)] text-sm font-semibold truncate">{timeAgo(p.lastReviewedAt)}</p>
                          <p className="text-[var(--color-text-muted)] text-xs">Last reviewed</p>
                        </div>
                      </div>
                      {p.reviewTypes?.length > 0 && (
                        <div className="flex gap-1.5 mt-3 flex-wrap">
                          {p.reviewTypes.map((type: string) => (
                            <span
                              key={type}
                              className="text-xs font-medium px-2 py-0.5 rounded-full text-[var(--color-text-muted)] bg-white/5 border border-white/10"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-[var(--color-text-muted)] text-xs mt-3">→ View review history</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Analytics