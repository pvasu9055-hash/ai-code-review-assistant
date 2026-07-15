import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import api from '../api/client'

type LoginMode = 'password' | 'otp'

function Login() {
  const [mode, setMode] = useState<LoginMode>('password')

  // password login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // otp login state
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)

  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', res.data.token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOtpLoading(true)
    try {
      await api.post('/auth/otp/email/login/request', { email: otpEmail })
      setOtpSent(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOtpLoading(true)
    try {
      const res = await api.post('/auth/otp/email/login/verify', {
        email: otpEmail,
        code: otpCode,
      })
      localStorage.setItem('token', res.data.token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired code')
    } finally {
      setOtpLoading(false)
    }
  }

  const switchMode = (next: LoginMode) => {
    setMode(next)
    setError('')
    setOtpSent(false)
    setOtpCode('')
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center px-4">
      <div
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-40 blur-[120px]"
        style={{ background: 'var(--color-accent-blue)' }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-30 blur-[140px]"
        style={{ background: 'var(--color-accent-purple)' }}
      />
      <div
        className="absolute top-[30%] right-[15%] w-[300px] h-[300px] rounded-full opacity-20 blur-[100px]"
        style={{ background: 'var(--color-accent-coral)' }}
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
          Welcome back
        </h1>
        <p className="text-[var(--color-text-muted)] text-center mb-6 text-sm">
          Sign in to review your code
        </p>

        {/* Tab switcher */}
        <div className="flex mb-6 rounded-full bg-white/5 border border-white/10 p-1">
          <button
            type="button"
            onClick={() => switchMode('password')}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition ${
              mode === 'password'
                ? 'text-white'
                : 'text-[var(--color-text-muted)]'
            }`}
            style={
              mode === 'password'
                ? { background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple))' }
                : {}
            }
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => switchMode('otp')}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition ${
              mode === 'otp'
                ? 'text-white'
                : 'text-[var(--color-text-muted)]'
            }`}
            style={
              mode === 'otp'
                ? { background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple))' }
                : {}
            }
          >
            Email OTP
          </button>
        </div>

        {mode === 'password' && (
          <form className="space-y-3" onSubmit={handleLogin}>
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
            <div className="text-right px-2">
              <Link
                to="/forgot-password"
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
              >
                Forgot password?
              </Link>
            </div>
            {error && <p className="text-[#F87171] text-sm text-center">{error}</p>}
            <button
              type="submit"
              className="w-full py-3.5 rounded-full text-white font-medium transition hover:opacity-90"
              style={{
                background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
              }}
            >
              Sign in
            </button>
          </form>
        )}

        {mode === 'otp' && !otpSent && (
          <form className="space-y-3" onSubmit={handleRequestOtp}>
            <input
              type="email"
              placeholder="Email"
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
              required
              className="w-full px-5 py-3.5 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition"
            />
            {error && <p className="text-[#F87171] text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={otpLoading}
              className="w-full py-3.5 rounded-full text-white font-medium transition hover:opacity-90 disabled:opacity-50"
              style={{
                background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
              }}
            >
              {otpLoading ? 'Sending code...' : 'Send code'}
            </button>
          </form>
        )}

        {mode === 'otp' && otpSent && (
          <form className="space-y-3" onSubmit={handleVerifyOtp}>
            <p className="text-[var(--color-text-muted)] text-sm text-center mb-2">
              Code sent to {otpEmail}
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              maxLength={6}
              required
              className="w-full px-5 py-3.5 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition text-center tracking-[0.5em] font-medium"
            />
            {error && <p className="text-[#F87171] text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={otpLoading}
              className="w-full py-3.5 rounded-full text-white font-medium transition hover:opacity-90 disabled:opacity-50"
              style={{
                background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
              }}
            >
              {otpLoading ? 'Verifying...' : 'Verify & sign in'}
            </button>
            <button
              type="button"
              onClick={() => setOtpSent(false)}
              className="w-full text-[var(--color-text-muted)] text-sm text-center hover:text-[var(--color-text)] transition"
            >
              Use a different email
            </button>
          </form>
        )}

        <p className="text-[var(--color-text-muted)] text-sm mt-6 text-center">
          Don't have an account?{' '}
          <Link to="/signup" className="gradient-text font-medium cursor-pointer">Sign up</Link>
        </p>
      </div>
    </div>
  )
}

export default Login