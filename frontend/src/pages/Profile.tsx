import { useEffect, useRef, useState } from 'react'
import api from '../api/client'

// Reusable tilt wrapper — gives any card a mouse-tracked 3D tilt + spotlight
function TiltCard({
  children,
  className = '',
  style = {},
  strength = 1,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  strength?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [t, setT] = useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false })

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    setT({
      rx: (0.5 - py) * 10 * strength,
      ry: (px - 0.5) * 12 * strength,
      mx: px * 100,
      my: py * 100,
      active: true,
    })
  }
  const onLeave = () => setT({ rx: 0, ry: 0, mx: 50, my: 50, active: false })

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`relative transition-transform duration-150 ease-out ${className}`}
      style={{
        transform: `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) ${t.active ? 'translateZ(6px)' : ''}`,
        transformStyle: 'preserve-3d',
        boxShadow: t.active
          ? '0 30px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)'
          : '0 12px 24px -14px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02)',
        ...style,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-200"
        style={{
          opacity: t.active ? 1 : 0,
          background: `radial-gradient(420px circle at ${t.mx}% ${t.my}%, rgba(147,120,255,0.14), transparent 60%)`,
        }}
      />
      {children}
    </div>
  )
}

function Profile() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [floatT, setFloatT] = useState(0)

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

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

  useEffect(() => {
    fetchProfile()

    // continuous idle float loop for the avatar
    let raf: number
    const start = performance.now()
    const loop = (now: number) => {
      setFloatT((now - start) / 1000)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await fetchProfile() // refresh to get the new avatarUrl
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Failed to upload avatar')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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

  const shimmer = 'animate-pulse bg-white/5 rounded-xl'
  const cardBg = { background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(20px)' }
  const apiOrigin = (api.defaults.baseURL || '').replace(/\/api\/?$/, '')

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div
          className="absolute top-[-15%] left-[10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
          style={{ background: 'var(--color-accent-blue)' }}
        />
        <div className="relative z-10 p-10 max-w-4xl mx-auto">
          <div className={`h-8 w-32 mb-2 ${shimmer}`} />
          <div className={`h-4 w-56 mb-8 ${shimmer}`} />
          <div className="p-6 rounded-2xl border border-white/10 flex items-center gap-6 mb-4" style={cardBg}>
            <div className={`flex-shrink-0 w-20 h-20 rounded-full ${shimmer}`} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className={`h-5 w-40 ${shimmer}`} />
              <div className={`h-4 w-52 ${shimmer}`} />
              <div className={`h-3 w-36 ${shimmer}`} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-2xl border border-white/10 text-center" style={cardBg}>
                <div className={`h-7 w-10 mx-auto mb-2 ${shimmer}`} />
                <div className={`h-3 w-14 mx-auto ${shimmer}`} />
              </div>
            ))}
          </div>
          <div className="p-6 rounded-2xl border border-white/10 mb-4" style={cardBg}>
            <div className={`h-4 w-32 mb-4 ${shimmer}`} />
            <div className={`h-3 w-full mb-4 ${shimmer}`} />
            <div className="flex gap-6">
              <div className={`h-4 w-20 ${shimmer}`} />
              <div className={`h-4 w-24 ${shimmer}`} />
              <div className={`h-4 w-16 ${shimmer}`} />
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-white/10" style={cardBg}>
            <div className={`h-4 w-28 mb-3 ${shimmer}`} />
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`h-16 w-full ${shimmer}`} />
              ))}
            </div>
          </div>
        </div>
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
  const floatY = Math.sin(floatT * 1.4) * 5
  const floatRot = Math.sin(floatT * 1.1) * 4
  const avatarSrc = user.avatarUrl ? `${apiOrigin}${user.avatarUrl}` : null

  return (
    <div className="min-h-screen bg-black relative overflow-hidden" style={{ perspective: '1400px' }}>
      <div
        className="absolute top-[-15%] left-[10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{ background: 'var(--color-accent-blue)' }}
      />
      <div
        className="absolute top-[10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-10 blur-[130px] pointer-events-none"
        style={{ background: 'var(--color-accent-coral)' }}
      />

      <div className="relative z-10 p-10 max-w-4xl mx-auto">
        <h1 className="text-3xl font-medium text-[var(--color-text)] mb-1">Profile</h1>
        <p className="text-[var(--color-text-muted)] mb-8 text-sm">Your account and review activity</p>

        {/* Identity card — 3D tilt, per-user avatar with upload */}
        <TiltCard className="p-6 rounded-2xl border border-white/10 flex items-center gap-6 mb-4 overflow-hidden" style={cardBg}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div
            onClick={handleAvatarClick}
            role="button"
            title="Change profile photo"
            className="flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center text-xl font-semibold text-white relative cursor-pointer group overflow-hidden"
            style={{
              background: avatarSrc
                ? undefined
                : 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
              boxShadow: '0 18px 34px -10px rgba(124,58,237,0.65), 0 0 0 4px rgba(255,255,255,0.05)',
              transform: `translateZ(50px) translateY(${floatY}px) rotate(${floatRot}deg)`,
            }}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              initials(user.name)
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-medium text-center px-1">
              {uploading ? 'Uploading...' : 'Change photo'}
            </div>
          </div>
          <div className="min-w-0 relative" style={{ transform: 'translateZ(24px)' }}>
            <p className="text-[var(--color-text)] text-xl font-medium mb-1">{user.name}</p>
            <p className="text-[var(--color-text-muted)] text-sm mb-1">{user.email}</p>
            <p className="text-[var(--color-text-muted)] text-xs">Member since {formatDate(user.createdAt)}</p>
            {uploadError && <p className="text-[#F87171] text-xs mt-1">{uploadError}</p>}
          </div>
        </TiltCard>

        {/* Stats grid — each card gets its own independent 3D tilt */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { value: stats.totalProjects, label: 'Projects', color: undefined },
            { value: stats.totalReviews, label: 'Reviews', color: undefined },
            { value: stats.totalFindings, label: 'Findings', color: undefined },
            { value: stats.averageScore ?? '—', label: 'Avg score', color: scoreColor(stats.averageScore) },
          ].map((s, i) => (
            <TiltCard key={i} className="p-5 rounded-2xl border border-white/10 text-center" style={cardBg} strength={1.3}>
              <p
                className="text-2xl font-semibold"
                style={{ color: s.color || 'var(--color-text)', transform: 'translateZ(30px)' }}
              >
                {s.value}
              </p>
              <p className="text-[var(--color-text-muted)] text-xs mt-1" style={{ transform: 'translateZ(20px)' }}>
                {s.label}
              </p>
            </TiltCard>
          ))}
        </div>

        {/* Severity breakdown — embossed 3D bar */}
        <TiltCard className="p-6 rounded-2xl border border-white/10 mb-4" style={cardBg} strength={0.5}>
          <p className="text-[var(--color-text)] font-medium mb-4 text-sm">Findings breakdown</p>
          {totalSeverity > 0 ? (
            <>
              <div
                className="flex h-4 rounded-full overflow-hidden mb-4"
                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06)' }}
              >
                <div
                  style={{
                    width: `${(stats.severityCounts.error / totalSeverity) * 100}%`,
                    background: 'linear-gradient(180deg, #fca5a5, #F87171 45%, #dc4c4c)',
                  }}
                />
                <div
                  style={{
                    width: `${(stats.severityCounts.warning / totalSeverity) * 100}%`,
                    background: 'linear-gradient(180deg, #fde68a, #FBBF24 45%, #d99f0e)',
                  }}
                />
                <div
                  style={{
                    width: `${(stats.severityCounts.info / totalSeverity) * 100}%`,
                    background: 'linear-gradient(180deg, #93c5fd, #60A5FA 45%, #3b82f6)',
                  }}
                />
              </div>
              <div className="flex gap-6 text-sm">
                <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#F87171', boxShadow: '0 2px 6px rgba(248,113,113,0.6)' }} />
                  {stats.severityCounts.error} errors
                </span>
                <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#FBBF24', boxShadow: '0 2px 6px rgba(251,191,36,0.6)' }} />
                  {stats.severityCounts.warning} warnings
                </span>
                <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#60A5FA', boxShadow: '0 2px 6px rgba(96,165,250,0.6)' }} />
                  {stats.severityCounts.info} info
                </span>
              </div>
            </>
          ) : (
            <p className="text-[var(--color-text-muted)] text-sm">No findings yet.</p>
          )}
        </TiltCard>

        {/* Recent reviews — each row tilts on hover */}
        <TiltCard className="p-6 rounded-2xl border border-white/10" style={cardBg} strength={0.4}>
          <p className="text-[var(--color-text)] font-medium mb-3 text-sm">Recent reviews</p>
          {recentReviews.length > 0 ? (
            <div className="space-y-2">
              {recentReviews.map((r: any) => (
                <TiltCard
                  key={r.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                  strength={0.6}
                >
                  <div className="min-w-0" style={{ transform: 'translateZ(16px)' }}>
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
                      transform: 'translateZ(28px)',
                      boxShadow: `0 8px 16px -6px ${scoreColor(r.overallScore)}55`,
                    }}
                  >
                    {r.overallScore ?? '—'}
                  </div>
                </TiltCard>
              ))}
            </div>
          ) : (
            <p className="text-[var(--color-text-muted)] text-sm">No reviews yet.</p>
          )}
        </TiltCard>
      </div>
    </div>
  )
}

export default Profile