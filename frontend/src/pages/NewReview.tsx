import { useState } from 'react'
import api from '../api/client'

function NewReview() {
  const [mode, setMode] = useState<'paste' | 'file'>('paste')
  const [projectName, setProjectName] = useState('')
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      if (mode === 'paste') {
        const res = await api.post('/reviews/submit-code', {
          code,
          language,
          projectName,
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

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div
        className="absolute top-[-15%] right-[10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{ background: 'var(--color-accent-purple)' }}
      />

      <div className="relative z-10 p-10 max-w-2xl mx-auto">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full text-white font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{
              background:
                'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
            }}
          >
            {loading ? 'Submitting...' : 'Submit for review'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-[#F87171] text-sm">
            {error}
          </div>
        )}

        {result && (
          <div
            className="mt-4 p-6 rounded-2xl border border-white/10"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
          >
            <p className="text-[var(--color-text)] font-medium mb-2">✓ {result.message}</p>
            <p className="text-[var(--color-text-muted)] text-sm">
              Project: {result.project.projectName}
            </p>
            <p className="text-[var(--color-text-muted)] text-sm font-mono mt-2 truncate">
              {result.codePreview}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewReview