import { useState, useRef, useEffect } from 'react'
import api from '../api/client'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function NewReview() {
  const [mode, setMode] = useState<'paste' | 'file'>('paste')
  const [projectName, setProjectName] = useState('')
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  // Quality gate settings
  const [showGateSettings, setShowGateSettings] = useState(false)
  const [minScoreThreshold, setMinScoreThreshold] = useState('70')
  const [maxComplexityThreshold, setMaxComplexityThreshold] = useState('15')

  // Live streaming state
  const [streamedText, setStreamedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  // Chat widget state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatOpen])

  const streamAIPreview = async (codeToStream: string, lang: string) => {
    setStreamedText('')
    setIsStreaming(true)
    try {
      const token = localStorage.getItem('token')
      const url = `${api.defaults.baseURL}/reviews/stream-review?code=${encodeURIComponent(codeToStream)}&language=${lang}`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.body) return
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = JSON.parse(line.slice(6))
          if (payload.type === 'chunk') {
            setStreamedText((prev) => prev + payload.text)
          }
        }
      }
    } catch (err) {
      // Silent fail - streaming is a visual enhancement, main submitCode still runs
    } finally {
      setIsStreaming(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    setChatMessages([])
    setChatOpen(false)

    try {
      if (mode === 'paste') {
        streamAIPreview(code, language)

        const res = await api.post('/reviews/submit-code', {
          code,
          language,
          projectName,
          minScoreThreshold,
          maxComplexityThreshold,
        })
        setResult(res.data)
      } else {
        if (!file) {
          setError('Please select a file')
          setLoading(false)
          return
        }
        const formData = new FormData()
        formData.append('projectName', projectName)
        formData.append('file', file)
        formData.append('minScoreThreshold', minScoreThreshold)
        formData.append('maxComplexityThreshold', maxComplexityThreshold)

        const res = await api.post('/reviews/submit-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setResult(res.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSendChat = async () => {
    if (!chatInput.trim() || !result?.review?.id) return

    const newUserMessage: ChatMessage = { role: 'user', content: chatInput.trim() }
    const updatedMessages = [...chatMessages, newUserMessage]
    setChatMessages(updatedMessages)
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await api.post(`/reviews/${result.review.id}/chat`, {
        userMessage: newUserMessage.content,
        code: mode === 'paste' ? code : result.codePreview,
        language,
        complexityMetrics: result.complexityMetrics,
        chatHistory: updatedMessages,
      })
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong reaching the assistant.' },
      ])
    } finally {
      setChatLoading(false)
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

  const complexityRatingStyle = (rating: string) => {
    if (rating === 'low') return { color: '#4ADE80', bg: 'rgba(74,222,128,0.12)' }
    if (rating === 'moderate') return { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' }
    if (rating === 'high') return { color: '#FB923C', bg: 'rgba(251,146,60,0.12)' }
    if (rating === 'very-high') return { color: '#F87171', bg: 'rgba(248,113,113,0.12)' }
    return { color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' }
  }

  const staticFindings = result?.findings?.filter((f: any) => f.source === 'static') || []
  const aiFindings = result?.findings?.filter((f: any) => f.source === 'ai') || []
  const complexityFindings = result?.findings?.filter((f: any) => f.source === 'complexity') || []
  const metrics = result?.complexityMetrics
  const documentation = result?.documentation || []
  const qualityGate = result?.qualityGate

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div
        className="absolute top-[-15%] right-[10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{ background: 'var(--color-accent-purple)' }}
      />

      <div className="relative z-10 p-10 max-w-3xl mx-auto">
        <h1 className="text-3xl font-medium text-[var(--color-text)] mb-1">New review</h1>
        <p className="text-[var(--color-text-muted)] mb-8 text-sm">
          Paste your code or upload a file to get started
        </p>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('paste')}
            className="px-5 py-2 rounded-full text-sm font-medium transition"
            style={
              mode === 'paste'
                ? {
                    background:
                      'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
                    color: 'white',
                  }
                : { background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }
            }
          >
            Paste code
          </button>
          <button
            onClick={() => setMode('file')}
            className="px-5 py-2 rounded-full text-sm font-medium transition"
            style={
              mode === 'file'
                ? {
                    background:
                      'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
                    color: 'white',
                  }
                : { background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }
            }
          >
            Upload file
          </button>
        </div>

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

          {mode === 'paste' ? (
            <>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-5 py-3 rounded-full bg-white/5 text-[var(--color-text)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="c">C</option>
                <option value="cpp">C++</option>
                <option value="csharp">C#</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="php">PHP</option>
                <option value="ruby">Ruby</option>
                <option value="sql">SQL</option>
              </select>
              <textarea
                placeholder="Paste your code here..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                rows={10}
                className="w-full px-5 py-3 rounded-2xl bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition font-mono text-sm"
              />
            </>
          ) : (
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-5 py-3 rounded-full bg-white/5 text-[var(--color-text)] outline-none border border-white/10 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:bg-white/10 file:text-[var(--color-text)] file:cursor-pointer"
            />
          )}

          {/* Quality gate settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowGateSettings(!showGateSettings)}
              className="text-[var(--color-text-muted)] text-xs font-medium hover:text-[var(--color-text)] transition"
            >
              {showGateSettings ? '▾' : '▸'} Quality gate settings
            </button>
            {showGateSettings && (
              <div className="mt-3 flex gap-3">
                <div className="flex-1">
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
                <div className="flex-1">
                  <label className="text-[var(--color-text-muted)] text-xs block mb-1">Max complexity to pass</label>
                  <input
                    type="number"
                    min="1"
                    value={maxComplexityThreshold}
                    onChange={(e) => setMaxComplexityThreshold(e.target.value)}
                    className="w-full px-4 py-2 rounded-full bg-white/5 text-[var(--color-text)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition text-sm"
                  />
                </div>
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
            {loading ? 'Analyzing...' : 'Submit for review'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-[#F87171] text-sm">
            {error}
          </div>
        )}

        {/* Live streaming AI panel - shows while analysis is in progress */}
        {loading && streamedText && (
          <div
            className="mt-4 p-6 rounded-2xl border border-white/10"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent-blue)] animate-pulse" />
              <p className="text-[var(--color-text)] font-medium text-sm">
                {isStreaming ? 'AI is reviewing your code live...' : 'Finalizing analysis...'}
              </p>
            </div>
            <pre className="text-xs text-[var(--color-text-muted)] whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
              {streamedText}
              {isStreaming && <span className="animate-pulse">▊</span>}
            </pre>
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-4">
            {/* Score + summary card */}
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
                  <p className="text-[var(--color-text)] font-medium">
                    {result.project.projectName}
                  </p>
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
                <p className="text-[var(--color-text-muted)] text-sm">
                  {result.review?.summary || 'Review complete.'}
                </p>
                {qualityGate && (
                  <p className="text-[var(--color-text-muted)] text-xs mt-1">
                    Requires score ≥ {qualityGate.minScoreThreshold} and complexity ≤ {qualityGate.maxComplexityThreshold}
                  </p>
                )}
              </div>
            </div>

            {/* Complexity metrics row */}
            {metrics && (
              <div
                className="p-6 rounded-2xl border border-white/10"
                style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[var(--color-text)] font-medium text-sm">Complexity Metrics</p>
                  <span
                    className="text-xs font-medium uppercase px-3 py-1 rounded-full"
                    style={{
                      color: complexityRatingStyle(metrics.fileComplexityRating).color,
                      background: complexityRatingStyle(metrics.fileComplexityRating).bg,
                    }}
                  >
                    {metrics.fileComplexityRating}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <p className="text-[var(--color-text)] text-lg font-semibold">{metrics.loc}</p>
                    <p className="text-[var(--color-text-muted)] text-xs mt-0.5">Lines of code</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <p className="text-[var(--color-text)] text-lg font-semibold">{metrics.functionCount}</p>
                    <p className="text-[var(--color-text-muted)] text-xs mt-0.5">Functions</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <p className="text-[var(--color-text)] text-lg font-semibold">{metrics.classCount}</p>
                    <p className="text-[var(--color-text-muted)] text-xs mt-0.5">Classes</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <p className="text-[var(--color-text)] text-lg font-semibold">{metrics.fileComplexity}</p>
                    <p className="text-[var(--color-text-muted)] text-xs mt-0.5">Complexity score</p>
                  </div>
                </div>
              </div>
            )}

            {/* Static Analysis */}
            <div
              className="p-6 rounded-2xl border border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
            >
              <p className="text-[var(--color-text)] font-medium mb-3 text-sm">
                Static Analysis (ESLint) — {staticFindings.length} issue{staticFindings.length !== 1 ? 's' : ''}
              </p>
              {staticFindings.length > 0 ? (
                <div className="space-y-2">
                  {staticFindings.map((finding: any, idx: number) => {
                    const s = severityStyle(finding.severity)
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border"
                        style={{ borderColor: s.border, background: s.bg }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-xs font-medium uppercase px-2 py-0.5 rounded-full"
                            style={{ color: s.color, background: s.chip }}
                          >
                            {finding.severity}
                          </span>
                          <span className="text-[var(--color-text-muted)] text-xs">
                            {finding.fileName}:{finding.lineNumber}
                          </span>
                        </div>
                        <p className="text-[var(--color-text)] text-sm font-mono mb-1">{finding.issue}</p>
                        <p className="text-[var(--color-text-muted)] text-sm">{finding.explanation}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[var(--color-text-muted)] text-sm">✓ No static analysis issues found.</p>
              )}
            </div>

            {/* Complexity Analysis */}
            <div
              className="p-6 rounded-2xl border border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
            >
              <p className="text-[var(--color-text)] font-medium mb-3 text-sm">
                Complexity Analysis — {complexityFindings.length} finding{complexityFindings.length !== 1 ? 's' : ''}
              </p>
              {complexityFindings.length > 0 ? (
                <div className="space-y-2">
                  {complexityFindings.map((finding: any, idx: number) => {
                    const s = severityStyle(finding.severity)
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border"
                        style={{ borderColor: s.border, background: s.bg }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-xs font-medium uppercase px-2 py-0.5 rounded-full"
                            style={{ color: s.color, background: s.chip }}
                          >
                            {finding.severity}
                          </span>
                          <span className="text-[var(--color-text-muted)] text-xs">
                            {finding.fileName}
                          </span>
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
                <p className="text-[var(--color-text-muted)] text-sm">✓ No complexity issues found.</p>
              )}
            </div>

            {/* AI Review */}
            <div
              className="p-6 rounded-2xl border border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
            >
              <p className="text-[var(--color-text)] font-medium mb-3 text-sm">
                AI Review — {aiFindings.length} finding{aiFindings.length !== 1 ? 's' : ''}
              </p>
              {aiFindings.length > 0 ? (
                <div className="space-y-2">
                  {aiFindings.map((finding: any, idx: number) => {
                    const s = severityStyle(finding.severity)
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border"
                        style={{ borderColor: s.border, background: s.bg }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-xs font-medium uppercase px-2 py-0.5 rounded-full"
                            style={{ color: s.color, background: s.chip }}
                          >
                            {finding.severity}
                          </span>
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
                <p className="text-[var(--color-text-muted)] text-sm">✓ No AI-flagged issues found.</p>
              )}
            </div>

            {/* Generated Documentation */}
            {documentation.length > 0 && (
              <div
                className="p-6 rounded-2xl border border-white/10"
                style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
              >
                <p className="text-[var(--color-text)] font-medium mb-3 text-sm">
                  Generated Documentation — {documentation.length} item{documentation.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-3">
                  {documentation.map((doc: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-white/10 bg-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium uppercase px-2 py-0.5 rounded-full text-[var(--color-accent-blue)] bg-white/10">
                          {doc.type}
                        </span>
                        <p className="text-[var(--color-text)] text-sm font-mono">{doc.name}</p>
                      </div>
                      <p className="text-[var(--color-text-muted)] text-sm mb-2">{doc.description}</p>
                      <pre className="text-xs text-[var(--color-text-muted)] bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                        {doc.docblock}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating chat bubble - only shows after a review exists */}
      {result?.review?.id && (
        <>
          {chatOpen && (
            <div
              className="fixed bottom-24 right-6 w-96 h-[480px] rounded-2xl border border-white/10 flex flex-col overflow-hidden z-50"
              style={{ background: 'rgba(15,15,20,0.95)', backdropFilter: 'blur(20px)' }}
            >
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <p className="text-[var(--color-text)] font-medium text-sm">Ask about this review</p>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg leading-none"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <p className="text-[var(--color-text-muted)] text-sm">
                    Ask me anything about this review — why a finding matters, what to fix first, or how to refactor.
                  </p>
                )}
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl text-sm max-w-[85%] ${
                      msg.role === 'user' ? 'ml-auto text-white' : 'mr-auto text-[var(--color-text)]'
                    }`}
                    style={
                      msg.role === 'user'
                        ? { background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple))' }
                        : { background: 'rgba(255,255,255,0.06)' }
                    }
                  >
                    {msg.content}
                  </div>
                ))}
                {chatLoading && (
                  <div className="mr-auto p-3 rounded-xl text-sm bg-white/5 text-[var(--color-text-muted)]">
                    Thinking...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Ask a question..."
                  className="flex-1 px-4 py-2 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition text-sm"
                />
                <button
                  onClick={handleSendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-4 py-2 rounded-full text-white text-sm font-medium disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple))',
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl shadow-lg z-50 hover:scale-105 transition"
            style={{
              background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
            }}
          >
            {chatOpen ? '×' : '💬'}
          </button>
        </>
      )}
    </div>
  )
}

export default NewReview