import { useState } from 'react'
import api from '../api/client'
import { Link } from 'react-router-dom'

function RAGReview() {
  const [projectName, setProjectName] = useState('')
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const [showGateSettings, setShowGateSettings] = useState(false)
  const [minScoreThreshold, setMinScoreThreshold] = useState('70')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await api.post('/reviews/rag', {
        code,
        language,
        projectName,
        minScoreThreshold,
      })
      setResult(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
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

  const scoreColor = (score: number | null) => {
    if (score === null || score === undefined) return '#9CA3AF'
    if (score >= 80) return '#4ADE80'
    if (score >= 50) return '#FBBF24'
    return '#F87171'
  }

  const qualityGate = result?.qualityGate
  const noStandardsError = error.includes('No coding standards uploaded')

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div
        className="absolute top-[-15%] right-[10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{ background: 'var(--color-accent-purple)' }}
      />

      <div className="relative z-10 p-10 max-w-3xl mx-auto">
        <h1 className="text-3xl font-medium text-[var(--color-text)] mb-1">Review against your standards</h1>
        <p className="text-[var(--color-text-muted)] mb-8 text-sm">
          RAG-powered review — retrieves your uploaded coding standards and checks compliance
        </p>

        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl border border-white/10 space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
        >
          <input
            type="text"
            placeholder="Project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
            className="w-full px-5 py-3 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition"
          />

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-5 py-3 rounded-full bg-white/5 text-[var(--color-text)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>

          <textarea
            placeholder="Paste your code here..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            rows={10}
            className="w-full px-5 py-3 rounded-2xl bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition font-mono text-sm"
          />

          <div>
            <button
              type="button"
              onClick={() => setShowGateSettings(!showGateSettings)}
              className="text-[var(--color-text-muted)] text-xs font-medium hover:text-[var(--color-text)] transition"
            >
              {showGateSettings ? '▾' : '▸'} Quality gate settings
            </button>
            {showGateSettings && (
              <div className="mt-3">
                <label className="text-[var(--color-text-muted)] text-xs block mb-1">Min score to pass</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minScoreThreshold}
                  onChange={(e) => setMinScoreThreshold(e.target.value)}
                  className="w-full px-4 py-2 rounded-full bg-white/5 text-[var(--color-text)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition text-sm"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full text-white font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{
              background:
                'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
            }}
          >
            {loading ? 'Reviewing against standards...' : 'Submit for RAG review'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-[#F87171] text-sm flex items-center justify-between gap-4">
            <span>{error}</span>
            {noStandardsError && (
              <Link
                to="/standards"
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium text-white"
                style={{ background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple))' }}
              >
                Upload one
              </Link>
            )}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-4">
            {/* Score + summary */}
            <div
              className="p-6 rounded-2xl border border-white/10 flex items-center gap-6"
              style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
            >
              <div
                className="flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold border-2"
                style={{
                  borderColor: scoreColor(result.review?.overallScore),
                  color: scoreColor(result.review?.overallScore),
                }}
              >
                {result.review?.overallScore ?? '—'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[var(--color-text)] font-medium">{result.project.projectName}</p>
                  {qualityGate && (
                    <span
                      className="text-xs font-medium uppercase px-2.5 py-1 rounded-full"
                      style={
                        qualityGate.passed
                          ? { color: '#4ADE80', background: 'rgba(74,222,128,0.15)' }
                          : { color: '#F87171', background: 'rgba(248,113,113,0.15)' }
                      }
                    >
                      {qualityGate.passed ? '✓ Gate passed' : '✕ Gate failed'}
                    </span>
                  )}
                </div>
                <p className="text-[var(--color-text-muted)] text-sm">{result.review?.summary}</p>
              </div>
            </div>

            {/* Retrieved standards (the RAG part) */}
            {result.retrievedStandards?.length > 0 && (
              <div
                className="p-6 rounded-2xl border border-white/10"
                style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
              >
                <p className="text-[var(--color-text)] font-medium mb-3 text-sm">
                  Retrieved standards ({result.retrievedStandards.length})
                </p>
                <div className="space-y-2">
                  {result.retrievedStandards.map((s: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[var(--color-text-muted)] text-xs">{s.sourceFile}</span>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ color: 'var(--color-accent-blue)', background: 'rgba(96,165,250,0.12)' }}
                        >
                          {(Number(s.similarity) * 100).toFixed(0)}% match
                        </span>
                      </div>
                      <p className="text-[var(--color-text-muted)] text-xs font-mono">{s.preview}...</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Findings */}
            <div
              className="p-6 rounded-2xl border border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
            >
              <p className="text-[var(--color-text)] font-medium mb-3 text-sm">
                Findings — {result.findings?.length || 0} issue{result.findings?.length !== 1 ? 's' : ''}
              </p>
              {result.findings?.length > 0 ? (
                <div className="space-y-2">
                  {result.findings.map((finding: any, idx: number) => {
                    const s = severityStyle(finding.severity)
                    return (
                      <div key={idx} className="p-4 rounded-xl border" style={{ borderColor: s.border, background: s.bg }}>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-xs font-medium uppercase px-2 py-0.5 rounded-full"
                            style={{ color: s.color, background: s.chip }}
                          >
                            {finding.severity}
                          </span>
                          {finding.standardViolated && (
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{ color: '#C084FC', background: 'rgba(192,132,252,0.15)' }}
                            >
                              📋 Standard violation
                            </span>
                          )}
                        </div>
                        <p className="text-[var(--color-text)] text-sm font-medium mb-1">{finding.issue}</p>
                        <p className="text-[var(--color-text-muted)] text-sm mb-2">{finding.explanation}</p>
                        {finding.standardViolated && (
                          <div className="mb-2 p-3 rounded-lg bg-white/5 border border-purple-500/20">
                            <p className="text-[#C084FC] text-xs font-medium mb-1">Standard referenced</p>
                            <p className="text-[var(--color-text-muted)] text-sm">{finding.standardViolated}</p>
                          </div>
                        )}
                        {finding.suggestedFix && (
                          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
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
        )}
      </div>
    </div>
  )
}

export default RAGReview