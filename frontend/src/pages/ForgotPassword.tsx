import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import api from '../api/client'

function ForgotPassword() {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request')

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/otp/password/reset/request', { email })
      setStep('reset')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/otp/password/reset/verify', {
        email,
        code,
        newPassword,
      })
      setStep('done')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
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

        {step === 'request' && (
          <>
            <h1 className="text-3xl font-medium text-[var(--color-text)] text-center mb-1">
              Forgot password?
            </h1>
            <p className="text-[var(--color-text-muted)] text-center mb-8 text-sm">
              Enter your email and we'll send you a reset code
            </p>

            <form className="space-y-3" onSubmit={handleRequestReset}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-3.5 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition"
              />
              {error && <p className="text-[#F87171] text-sm text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full text-white font-medium transition hover:opacity-90 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
                }}
              >
                {loading ? 'Sending code...' : 'Send reset code'}
              </button>
            </form>
          </>
        )}

        {step === 'reset' && (
          <>
            <h1 className="text-3xl font-medium text-[var(--color-text)] text-center mb-1">
              Reset password
            </h1>
            <p className="text-[var(--color-text-muted)] text-center mb-8 text-sm">
              Code sent to {email}
            </p>

            <form className="space-y-3" onSubmit={handleResetPassword}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
                className="w-full px-5 py-3.5 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition text-center tracking-[0.5em] font-medium"
              />
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-5 py-3.5 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-5 py-3.5 rounded-full bg-white/5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-white/10 focus:border-[var(--color-accent-blue)] transition"
              />
              {error && <p className="text-[#F87171] text-sm text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full text-white font-medium transition hover:opacity-90 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
                }}
              >
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
              <button
                type="button"
                onClick={() => setStep('request')}
                className="w-full text-[var(--color-text-muted)] text-sm text-center hover:text-[var(--color-text)] transition"
              >
                Use a different email
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <>
            <h1 className="text-3xl font-medium text-[var(--color-text)] text-center mb-1">
              Password reset!
            </h1>
            <p className="text-[var(--color-text-muted)] text-center mb-8 text-sm">
              Your password has been updated successfully
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3.5 rounded-full text-white font-medium transition hover:opacity-90"
              style={{
                background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
              }}
            >
              Back to login
            </button>
          </>
        )}

        {step !== 'done' && (
          <p className="text-[var(--color-text-muted)] text-sm mt-6 text-center">
            Remembered your password?{' '}
            <Link to="/login" className="gradient-text font-medium cursor-pointer">Login</Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword