import { useState, useEffect } from 'react'
import api from '../api/client'

function UploadStandards() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  const [standards, setStandards] = useState<any[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchStandards = async () => {
    setListLoading(true)
    try {
      const res = await api.get('/standards')
      setStandards(res.data)
    } catch (err) {
      // silent fail on list load, upload errors are shown separately
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    fetchStandards()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file (PDF, DOCX, TXT, or MD)')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (title.trim()) formData.append('title', title.trim())

      const res = await api.post('/standards/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
      setFile(null)
      setTitle('')
      fetchStandards()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await api.delete(`/standards/${id}`)
      setStandards((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      // silent fail, list stays as-is
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div
        className="absolute top-[-15%] right-[10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{ background: 'var(--color-accent-purple)' }}
      />

      <div className="relative z-10 p-10 max-w-3xl mx-auto">
        <h1 className="text-3xl font-medium text-[var(--color-text)] mb-1">Coding standards</h1>
        <p className="text-[var(--color-text-muted)] mb-8 text-sm">
          Upload your team's style guide (PDF, DOCX, TXT, or MD) — future reviews can check code against it.
        </p>

        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl border border-white/10 space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
        >
          <input
            type="text"
            placeholder="Title (optional, e.g. 'Backend Style Guide')"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-5 py-3 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition"
          />

          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full px-5 py-3 rounded-full bg-white/5 text-[var(--color-text)] outline-none border border-white/10 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:bg-white/10 file:text-[var(--color-text)] file:cursor-pointer"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full text-white font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{
              background:
                'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
            }}
          >
            {loading ? 'Uploading & indexing...' : 'Upload standard'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-[#F87171] text-sm">
            {error}
          </div>
        )}

        {result && (
          <div
            className="mt-4 p-5 rounded-2xl border"
            style={{ borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)' }}
          >
            <p className="text-[#4ADE80] font-medium text-sm mb-1">✓ {result.message}</p>
            <p className="text-[var(--color-text-muted)] text-sm">
              Indexed into {result.embeddedChunks} / {result.totalChunks} chunk{result.totalChunks !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Existing standards list */}
        <div className="mt-8">
          <p className="text-[var(--color-text)] font-medium mb-3 text-sm">Uploaded standards</p>

          {listLoading ? (
            <p className="text-[var(--color-text-muted)] text-sm">Loading...</p>
          ) : standards.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-sm">
              No standards uploaded yet — upload one above to enable RAG-based review.
            </p>
          ) : (
            <div className="space-y-2">
              {standards.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-white/10 flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="min-w-0">
                    <p className="text-[var(--color-text)] text-sm font-medium truncate">
                      {s.title || s.fileName}
                    </p>
                    <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                      {s.fileName} · {s.fileType.toUpperCase()} · {s._count?.chunks ?? 0} chunk
                      {s._count?.chunks !== 1 ? 's' : ''} · {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    className="ml-4 px-4 py-1.5 rounded-full text-xs font-medium text-[#F87171] border border-red-500/30 hover:bg-red-500/10 transition disabled:opacity-40 flex-shrink-0"
                  >
                    {deletingId === s.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UploadStandards