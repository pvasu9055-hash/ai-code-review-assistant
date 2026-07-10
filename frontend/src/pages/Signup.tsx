import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import api from '../api/client'

function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/auth/signup', { name, email, password })
      localStorage.setItem('token', res.data.token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed')
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center px-4">
      <div
        className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-40 blur-[120px]"
        style={{ background: 'var(--color-accent-coral)' }}
      />
      <div
        className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-30 blur-[140px]"
        style={{ background: 'var(--color-accent-purple)' }}
      />
      <div
        className="absolute top-[30%] left-[15%] w-[300px] h-[300px] rounded-full opacity-20 blur-[100px]"
        style={{ background: 'var(--color-accent-blue)' }}
      />

      <div
        className="w-full max-w-sm relative z-10 p-8 rounded-3xl border border-white/10"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex justify-center mb-6">
          <Logo size={48} />
        </div>

        <h1 className="text-3xl font-medium text-[var(--color-text)] text-center mb-1">
          Create account
        </h1>
        <p className="text-[var(--color-text-muted)] text-center mb-8 text-sm">
          Start reviewing your code with AI
        </p>

        <form className="space-y-3" onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-5 py-3.5 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-5 py-3.5 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-5 py-3.5 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition"
          />
          {error && <p className="text-[#F87171] text-sm text-center">{error}</p>}
          <button
            type="submit"
            className="w-full py-3.5 rounded-full text-white font-medium transition hover:opacity-90"
            style={{
              background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
            }}
          >
            Sign up
          </button>
        </form>

        <p className="text-[var(--color-text-muted)] text-sm mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="gradient-text font-medium cursor-pointer">Login</Link>
        </p>
      </div>
    </div>
  )
}

export default Signup