import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmed = email.trim()
    if (!trimmed) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmed,
        {
          redirectTo: window.location.origin + '/reset-password',
        }
      )

      if (resetError) throw resetError

      // Supabase returns success even when the email doesn't exist (a
      // security best-practice to prevent email enumeration). We always
      // show the success state so no information is leaked to the caller.
      setSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center font-bold text-lg text-white">
            S
          </div>
          <span className="text-xl font-semibold text-white tracking-tight">
            SMS Dashboard
          </span>
        </div>

        <div className="card animate-fade-in">
          {sent ? (
            /* ── Success state ─────────────────────────────────────────────── */
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Check your inbox</h1>
              <p className="text-muted text-sm mb-6 leading-relaxed">
                Password reset email sent. Please check your inbox and follow the link to reset your password.
              </p>
              <p className="text-xs text-muted">
                Didn't receive it? Check your spam folder or{' '}
                <button
                  onClick={() => { setSent(false); setEmail('') }}
                  className="text-primary-light hover:underline"
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            /* ── Form state ────────────────────────────────────────────────── */
            <>
              <h1 className="text-2xl font-semibold text-white mb-1">Forgot Password</h1>
              <p className="text-muted text-sm mb-6">
                Enter your email address and we'll send you a password reset link.
              </p>

              {error && (
                <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="input-label">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading}
                    className="input-field"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full mt-2"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6">
          Remember your password?{' '}
          <Link to="/login" className="text-primary-light hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}