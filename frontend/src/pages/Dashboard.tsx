import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/auth/profile')
        setData(res.data)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const scoreColor = (score: number | null) => {
    if (score === null || score === undefined) return '#9CA3AF'
    if (score >= 80) return '#34D399'
    if (score >= 50) return '#FBBF24'
    return '#F87171'
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[var(--color-text-muted)] text-sm">Loading dashboard...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[#F87171] text-sm">{error || 'Something went wrong'}</p>
      </div>
    )
  }

  const { stats, recentReviews } = data

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-[-15%] left-[20%] w-[500px] h-[500px] rounded-full opacity-20 blur-[140px] pointer-events-none"
        style={{ background: 'var(--color-accent-blue)' }}
      />
      <div
        className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{ background: 'var(--color-accent-purple)' }}
      />

      <div className="relative z-10 p-10 max-w-6xl mx-auto">
        <h1 className="text-3xl font-medium text-[var(--color-text)] mb-1">
          Dashboard
        </h1>
        <p className="text-[var(--color-text-muted)] mb-10 text-sm">
          Your recent code reviews
        </p>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div
            className="p-6 rounded-2xl border border-white/10"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
          >
            <p className="text-[var(--color-text-muted)] text-sm">Total reviews</p>
            <p className="text-4xl font-medium text-[var(--color-text)] mt-2">{stats.totalReviews}</p>
          </div>

          <div
            className="p-6 rounded-2xl border border-white/10 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
          >
            <div>
              <p className="text-[var(--color-text-muted)] text-sm">Avg score</p>
              <p className="text-4xl font-medium gradient-text mt-2">{stats.averageScore ?? '—'}</p>
            </div>
            <div className="relative w-16 h-16 shrink-0">
              <div className="gradient-ring w-16 h-16 rounded-full" />
              <div className="absolute inset-1.5 rounded-full bg-black" />
            </div>
          </div>

          <div
            className="p-6 rounded-2xl border border-white/10"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
          >
            <p className="text-[var(--color-text-muted)] text-sm">Issues found</p>
            <p className="text-4xl font-medium text-[#F87171] mt-2">{stats.totalFindings}</p>
          </div>
        </div>

        {/* Reviews table */}
        <div
          className="rounded-2xl border border-white/10 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}
        >
          {recentReviews.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-[var(--color-text-muted)] text-xs font-medium uppercase tracking-wide">Project</th>
                  <th className="px-6 py-4 text-[var(--color-text-muted)] text-xs font-medium uppercase tracking-wide">Score</th>
                  <th className="px-6 py-4 text-[var(--color-text-muted)] text-xs font-medium uppercase tracking-wide">Issues</th>
                  <th className="px-6 py-4 text-[var(--color-text-muted)] text-xs font-medium uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentReviews.map((r: any) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4 text-[var(--color-text)] font-medium">{r.projectName}</td>
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          color: scoreColor(r.overallScore),
                          background: `${scoreColor(r.overallScore)}1A`,
                        }}
                      >
                        {r.overallScore ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{r.issuesCount}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center">
              <p className="text-[var(--color-text-muted)] text-sm mb-4">
                No reviews yet. Submit your first code review to see it here.
              </p>
              <Link
                to="/new-review"
                className="inline-block px-5 py-2.5 rounded-full text-white text-sm font-medium"
                style={{
                  background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
                }}
              >
                New review
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard