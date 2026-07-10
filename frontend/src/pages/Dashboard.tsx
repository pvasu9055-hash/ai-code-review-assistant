import Logo from '../components/Logo'

function Dashboard() {
  const reviews = [
    { id: 1, project: 'auth-service', score: 82, date: '2026-07-08', issues: 5 },
    { id: 2, project: 'payment-gateway', score: 67, date: '2026-07-06', issues: 12 },
    { id: 3, project: 'portfolio-site', score: 91, date: '2026-07-01', issues: 2 },
  ]

  const avgScore = Math.round(reviews.reduce((a, r) => a + r.score, 0) / reviews.length)
  const totalIssues = reviews.reduce((a, r) => a + r.issues, 0)

  const scoreColor = (score: number) =>
    score >= 80 ? '#34D399' : score >= 60 ? '#FBBF24' : '#F87171'

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
        <div className="flex items-center gap-3 mb-1">
          <Logo size={32} />
          <span className="text-[var(--color-text-muted)] text-sm">AI Code Review</span>
        </div>
        <h1 className="text-3xl font-medium text-[var(--color-text)] mt-3 mb-1">
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
            <p className="text-4xl font-medium text-[var(--color-text)] mt-2">{reviews.length}</p>
          </div>

          <div
            className="p-6 rounded-2xl border border-white/10 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
          >
            <div>
              <p className="text-[var(--color-text-muted)] text-sm">Avg score</p>
              <p className="text-4xl font-medium gradient-text mt-2">{avgScore}</p>
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
            <p className="text-4xl font-medium text-[#F87171] mt-2">{totalIssues}</p>
          </div>
        </div>

        {/* Reviews table */}
        <div
          className="rounded-2xl border border-white/10 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}
        >
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
              {reviews.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4 text-[var(--color-text)] font-medium">{r.project}</td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        color: scoreColor(r.score),
                        background: `${scoreColor(r.score)}1A`,
                      }}
                    >
                      {r.score}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[var(--color-text-muted)]">{r.issues}</td>
                  <td className="px-6 py-4 text-[var(--color-text-muted)]">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard