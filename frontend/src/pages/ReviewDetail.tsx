import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'

function ReviewDetail() {
  const { reviewId } = useParams()
  const [review, setReview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchReview = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get(`/reviews/${reviewId}`)
        setReview(res.data)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load review')
      } finally {
        setLoading(false)
      }
    }
    if (reviewId) fetchReview()
  }, [reviewId])

  const scoreColor = (score: number | null) => {
    if (score === null || score === undefined) return '#9CA3AF'
    if (score >= 80) return '#4ADE80'
    if (score >= 50) return '#FBBF24'
    return '#F87171'
  }

  const severityStyle = (severity: string) => {
    if (severity === 'error') {
      return { color: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.3)', chip: 'rgba(248,113,113,0.15)' }
    }
    if (severity === 'info') {
      return { color: '#60A5FA', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.3)', chip: 'rgba(96,165,250,0.15)' }
    }
    return { color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.3)', chip: 'rgba(251,191,36,0.15)' }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-10">
        <p className="text-[var(--color-text-muted)] text-sm">Loading review...</p>
      </div>
    )
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-black p-10">
        <p className="text-[#F87171] text-sm mb-4">{error || 'Review not found'}</p>
        <Link to="/history" className="text-[var(--color-accent-blue)] text-sm hover:underline">
          ← Back to history
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div
        className="absolute top-[-15%] right-[10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{ background: 'var(--color-accent-purple)' }}
      />

      <div className="relative z-10 p-10 max-w-3xl mx-auto">
        <Link to="/history" className="text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text)] transition mb-6 inline-block">
          ← Back to history
        </Link>

        <div
          className="p-6 rounded-2xl border border-white/10 flex items-center gap-6 mb-6"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
        >
          <div
            className="flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold border-2"
            style={{ borderColor: scoreColor(review.overallScore), color: scoreColor(review.overallScore) }}
          >
            {review.overallScore ?? '—'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[var(--color-text)] font-medium text-lg">{review.project?.projectName}</p>
              {review.passedQualityGate !== null && (
                <span
                  className="text-xs font-medium uppercase px-2.5 py-1 rounded-full"
                  style={
                    review.passedQualityGate
                      ? { color: '#4ADE80', background: 'rgba(74,222,128,0.15)' }
                      : { color: '#F87171', background: 'rgba(248,113,113,0.15)' }
                  }
                >
                  {review.passedQualityGate ? '✓ Gate passed' : '✕ Gate failed'}
                </span>
              )}
            </div>
            <p className="text-[var(--color-text-muted)] text-sm mb-1">{review.summary || 'No summary available.'}</p>
            <p className="text-[var(--color-text-muted)] text-xs">
              {review.reviewType === 'file' ? 'Uploaded file' : 'Pasted code'} · {formatDate(review.createdAt)}
            </p>
          </div>
        </div>

        <div
          className="p-6 rounded-2xl border border-white/10"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
        >
          <p className="text-[var(--color-text)] font-medium mb-3 text-sm">
            Findings — {review.findings?.length || 0} issue{review.findings?.length !== 1 ? 's' : ''}
          </p>
          {review.findings && review.findings.length > 0 ? (
            <div className="space-y-2">
              {review.findings.map((finding: any) => {
                const s = severityStyle(finding.severity)
                return (
                  <div key={finding.id} className="p-4 rounded-xl border" style={{ borderColor: s.border, background: s.bg }}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-xs font-medium uppercase px-2 py-0.5 rounded-full"
                        style={{ color: s.color, background: s.chip }}
                      >
                        {finding.severity}
                      </span>
                      {finding.fileName && (
                        <span className="text-[var(--color-text-muted)] text-xs">
                          {finding.fileName}
                          {finding.lineNumber ? `:${finding.lineNumber}` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-[var(--color-text)] text-sm font-medium mb-1">{finding.issue}</p>
                    <p className="text-[var(--color-text-muted)] text-sm mb-2">{finding.explanation}</p>
                    {finding.suggestedFix && (
                      <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-[var(--color-text-muted)] text-xs font-medium mb-1">Suggested fix</p>
                        <p className="text-[var(--color-text)] text-sm">{finding.suggestedFix}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-[var(--color-text-muted)] text-sm">✓ No issues found.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReviewDetail