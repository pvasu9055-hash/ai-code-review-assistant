import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

function History() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [minScore, setMinScore] = useState('')
  const [maxScore, setMaxScore] = useState('')
  const [reviewType, setReviewType] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // AI semantic search state
  const [mode, setMode] = useState<'filter' | 'ai'>('filter')
  const [aiQuery, setAiQuery] = useState('')
  const [aiResults, setAiResults] = useState<any[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiSearched, setAiSearched] = useState(false)

  const fetchReviews = async () => {
    setLoading(true)
    setError('')
    try {
      const params: any = { sortBy }
      if (search) params.search = search
      if (minScore) params.minScore = minScore
      if (maxScore) params.maxScore = maxScore
      if (reviewType) params.reviewType = reviewType

      const res = await api.get('/reviews', { params })
      setReviews(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    fetchReviews()
  }

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiQuery.trim()) return
    setAiLoading(true)
    setAiError('')
    setAiSearched(true)
    try {
      const res = await api.get('/reviews/search', { params: { q: aiQuery } })
      setAiResults(res.data)
    } catch (err: any) {
      setAiError(err.response?.data?.message || 'AI search failed')
    } finally {
      setAiLoading(false)
    }
  }

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('Delete this review? This cannot be undone.')) return
    setDeletingId(reviewId)
    try {
      await api.delete(`/reviews/${reviewId}`)
      setReviews((prev) => prev.filter((r) => r.id !== reviewId))
      setAiResults((prev) => prev.filter((r) => r.id !== reviewId))
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete review')
    } finally {
      setDeletingId(null)
    }
  }

  const scoreColor = (score: number | null) => {
    if (score === null || score === undefined) return '#9CA3AF'
    if (score >= 80) return '#34D399'
    if (score >= 50) return '#FBBF24'
    return '#F87171'
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div
        className="absolute top-[-15%] left-[20%] w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{ background: 'var(--color-accent-blue)' }}
      />

      <div className="relative z-10 p-10 max-w-5xl mx-auto">
        <h1 className="text-3xl font-medium text-[var(--color-text)] mb-1">Review history</h1>
        <p className="text-[var(--color-text-muted)] mb-8 text-sm">
          Search, filter, and manage your past reviews
        </p>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('filter')}
            className="px-5 py-2 rounded-full text-sm font-medium transition"
            style={
              mode === 'filter'
                ? {
                    background:
                      'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
                    color: 'white',
                  }
                : { background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }
            }
          >
            Filters
          </button>
          <button
            onClick={() => setMode('ai')}
            className="px-5 py-2 rounded-full text-sm font-medium transition"
            style={
              mode === 'ai'
                ? {
                    background:
                      'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
                    color: 'white',
                  }
                : { background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }
            }
          >
            ✨ AI Search
          </button>
        </div>

        {mode === 'filter' ? (
          <form
            onSubmit={handleFilter}
            className="p-5 rounded-2xl border border-white/10 mb-6 flex flex-wrap gap-3 items-center"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
          >
            <input
              type="text"
              placeholder="Search by project name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[180px] px-4 py-2.5 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition text-sm"
            />
            <input
              type="number"
              placeholder="Min score"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="w-28 px-4 py-2.5 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition text-sm"
            />
            <input
              type="number"
              placeholder="Max score"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="w-28 px-4 py-2.5 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition text-sm"
            />
            <select
              value={reviewType}
              onChange={(e) => setReviewType(e.target.value)}
              className="px-4 py-2.5 rounded-full bg-white/5 text-[var(--color-text)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition text-sm"
            >
              <option value="">All types</option>
              <option value="paste">Pasted code</option>
              <option value="file">Uploaded file</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 rounded-full bg-white/5 text-[var(--color-text)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition text-sm"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full text-white text-sm font-medium"
              style={{
                background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
              }}
            >
              Apply
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleAiSearch}
            className="p-5 rounded-2xl border border-white/10 mb-6 flex gap-3 items-center"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
          >
            <input
              type="text"
              placeholder='Ask in plain English — e.g. "reviews with SQL injection risks"'
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition text-sm"
            />
            <button
              type="submit"
              disabled={aiLoading || !aiQuery.trim()}
              className="px-5 py-2.5 rounded-full text-white text-sm font-medium disabled:opacity-50"
              style={{
                background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
              }}
            >
              {aiLoading ? 'Searching...' : 'Search'}
            </button>
          </form>
        )}

        {mode === 'ai' ? (
          aiLoading ? (
            <p className="text-[var(--color-text-muted)] text-sm">Searching with AI...</p>
          ) : aiError ? (
            <p className="text-[#F87171] text-sm">{aiError}</p>
          ) : !aiSearched ? (
            <div
              className="p-10 rounded-2xl border border-white/10 text-center"
              style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}
            >
              <p className="text-[var(--color-text-muted)] text-sm">
                Type a question above to search your review history by meaning, not just keywords.
              </p>
            </div>
          ) : aiResults.length === 0 ? (
            <div
              className="p-10 rounded-2xl border border-white/10 text-center"
              style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}
            >
              <p className="text-[var(--color-text-muted)] text-sm">No matching reviews found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {aiResults.map((r) => (
                <Link
                  key={r.id}
                  to={`/history/${r.id}`}
                  className="block p-5 rounded-2xl border border-white/10 hover:border-white/20 transition"
                  style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[var(--color-text)] font-medium">{r.projectName}</p>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ color: scoreColor(r.overallScore), background: `${scoreColor(r.overallScore)}1A` }}
                    >
                      Score: {r.overallScore ?? '—'}
                    </span>
                  </div>
                  <p className="text-[var(--color-text-muted)] text-sm mb-2">{r.summary}</p>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                    <span>{r.issuesCount} issue{r.issuesCount !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{formatDate(r.createdAt)}</span>
                    <span>·</span>
                    <span>Match: {(r.score * 100).toFixed(0)}%</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : loading ? (
          <p className="text-[var(--color-text-muted)] text-sm">Loading reviews...</p>
        ) : error ? (
          <p className="text-[#F87171] text-sm">{error}</p>
        ) : reviews.length === 0 ? (
          <div
            className="p-10 rounded-2xl border border-white/10 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}
          >
            <p className="text-[var(--color-text-muted)] text-sm mb-4">No reviews match your filters.</p>
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
        ) : (
          <div
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}
          >
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-[var(--color-text-muted)] text-xs font-medium uppercase tracking-wide">Project</th>
                  <th className="px-6 py-4 text-[var(--color-text-muted)] text-xs font-medium uppercase tracking-wide">Type</th>
                  <th className="px-6 py-4 text-[var(--color-text-muted)] text-xs font-medium uppercase tracking-wide">Score</th>
                  <th className="px-6 py-4 text-[var(--color-text-muted)] text-xs font-medium uppercase tracking-wide">Issues</th>
                  <th className="px-6 py-4 text-[var(--color-text-muted)] text-xs font-medium uppercase tracking-wide">Date</th>
                  <th className="px-6 py-4 text-[var(--color-text-muted)] text-xs font-medium uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4 text-[var(--color-text)] font-medium">{r.projectName}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)] text-sm capitalize">{r.reviewType}</td>
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ color: scoreColor(r.overallScore), background: `${scoreColor(r.overallScore)}1A` }}
                      >
                        {r.overallScore ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{r.issuesCount}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)]">{formatDate(r.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="text-[#F87171] text-xs font-medium hover:underline disabled:opacity-50"
                      >
                        {deletingId === r.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default History