import { useEffect, useState } from 'react'
import api from '../api/client'

function Profile() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/profile')
        setData(res.data)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const scoreColor = (score: number | null) => {
    if (score === null || score === undefined) return '#9CA3AF'
    if (score >= 80) return '#4ADE80'
    if (score >= 50) return '#FBBF24'
    return '#F87171'
  }

  const initials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[var(--color-text-muted)] text-sm">Loading profile...</p>
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

  const { user, stats, recentReviews } = data
  const totalSeverity = stats.severityCounts.error + stats.severityCounts.warning + stats.severityCounts.info

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div
        className="absolute top-[-15%] left-[10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{ background: 'var(--color-accent-blue)' }}
      />

      <div className="relative z-10 p-10 max-w-4xl mx-auto">
        <h1 className="text-3xl font-medium text-[var(--color-text)] mb-1">Profile</h1>
        <p className="text-[var(--color-text-muted)] mb-8 text-sm">Your account and review activity</p>

        {/* Identity card */}
        <div
          className="p-6 rounded-2xl border border-white/10 flex items-center gap-6 mb-4"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
        >
          <div
            className="flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center text-xl font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
            }}
          >
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="text-[var(--color-text)] text-xl font-medium mb-1">{user.name}</p>
            <p className="text-[var(--color-text-muted)] text-sm mb-1">{user.email}</p>
            <p className="text-[var(--color-text-muted)] text-xs">
              Member since {formatDate(user.createdAt)}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div
            className="p-5 rounded-2xl border border-white/10 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
          >
            <p className="text-[var(--color-text)] text-2xl font-semibold">{stats.totalProjects}</p>
            <p className="text-[var(--color-text-muted)] text-xs mt-1">Projects</p>
          </div>
          <div
            className="p-5 rounded-2xl border border-white/10 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
          >
            <p className="text-[var(--color-text)] text-2xl font-semibold">{stats.totalReviews}</p>
            <p className="text-[var(--color-text-muted)] text-xs mt-1">Reviews</p>
          </div>
          <div
            className="p-5 rounded-2xl border border-white/10 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
          >
            <p className="text-[var(--color-text)] text-2xl font-semibold">{stats.totalFindings}</p>
            <p className="text-[var(--color-text-muted)] text-xs mt-1">Findings</p>
          </div>
          <div
            className="p-5 rounded-2xl border border-white/10 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
          >
            <p
              className="text-2xl font-semibold"
              style={{ color: scoreColor(stats.averageScore) }}
            >
              {stats.averageScore ?? '—'}
            </p>
            <p className="text-[var(--color-text-muted)] text-xs mt-1">Avg score</p>
          </div>
        </div>

        {/* Severity breakdown */}
        <div
          className="p-6 rounded-2xl border border-white/10 mb-4"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
        >
          <p className="text-[var(--color-text)] font-medium mb-4 text-sm">Findings breakdown</p>
          {totalSeverity > 0 ? (
            <>
              <div className="flex h-3 rounded-full overflow-hidden mb-4">
                <div
                  style={{
                    width: `${(stats.severityCounts.error / totalSeverity) * 100}%`,
                    background: '#F87171',
                  }}
                />
                <div
                  style={{
                    width: `${(stats.severityCounts.warning / totalSeverity) * 100}%`,
                    background: '#FBBF24',
                  }}
                />
                <div
                  style={{
                    width: `${(stats.severityCounts.info / totalSeverity) * 100}%`,
                    background: '#60A5FA',
                  }}
                />
              </div>
              <div className="flex gap-6 text-sm">
                <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#F87171' }} />
                  {stats.severityCounts.error} errors
                </span>
                <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#FBBF24' }} />
                  {stats.severityCounts.warning} warnings
                </span>
                <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#60A5FA' }} />
                  {stats.severityCounts.info} info
                </span>
              </div>
            </>
          ) : (
            <p className="text-[var(--color-text-muted)] text-sm">No findings yet.</p>
          )}
        </div>

        {/* Recent reviews */}
        <div
          className="p-6 rounded-2xl border border-white/10"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
        >
          <p className="text-[var(--color-text)] font-medium mb-3 text-sm">Recent reviews</p>
          {recentReviews.length > 0 ? (
            <div className="space-y-2">
              {recentReviews.map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="min-w-0">
                    <p className="text-[var(--color-text)] text-sm font-medium">{r.projectName}</p>
                    <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                      {r.reviewType === 'paste' ? 'Pasted code' : 'File upload'} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2"
                    style={{
                      borderColor: scoreColor(r.overallScore),
                      color: scoreColor(r.overallScore),
                    }}
                  >
                    {r.overallScore ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--color-text-muted)] text-sm">No reviews yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile