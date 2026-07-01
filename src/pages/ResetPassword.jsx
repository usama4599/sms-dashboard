import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    // When the user clicks the reset link in their email, Supabase appends
    // an access_token + refresh_token to the URL as a hash fragment and
    // fires an onAuthStateChange event with type = "PASSWORD_RECOVERY".
    // We listen for that event to confirm the session is valid before
    // showing the password form. If the link is invalid or expired,
    // onAuthStateChange won't fire a PASSWORD_RECOVERY event and we surface
    // an appropriate error.

    let timeoutId

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          // Valid reset link — session is active, show the form.
          setSessionReady(true)
          clearTimeout(timeoutId)
        } else if (event === 'SIGNED_IN' && session) {
          // Some Supabase versions fire SIGNED_IN instead of PASSWORD_RECOVERY
          // for the reset flow — treat it the same way.
          setSessionReady(true)
          clearTimeout(timeoutId)
        }
      }
    )

    // If no PASSWORD_RECOVERY / SIGNED_IN event fires within 4 seconds,
    // the link is likely expired or malformed.
    timeoutId = setTimeout(() => {
      if (!sessionReady) {
        setSessionError(
          'This password reset link is invalid or has expired. Please request a new one.'
        )
      }
    }, 4000)

    return () => {
      clearTimeout(timeoutId)
      authListener?.subscription?.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const validate = () => {
    if (!password) {
      setError('Please enter a new password.')
      return false
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return false
    }
    if (!confirmPassword) {
      setError('Please confirm your new password.')
      return false
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validate()) return

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) throw updateError

      setSuccess(true)
      // Redirect to /login after 2 seconds so the user sees the success
      // message before being taken away.
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      const message = err.message || ''
      if (message.toLowerCase().includes('weak')) {
        setError('Password is too weak. Please choose a stronger password.')
      } else if (
        message.toLowerCase().includes('expired') ||
        message.toLowerCase().includes('invalid')
      ) {
        setError('This reset link has expired. Please request a new one.')
      } else if (message.toLowerCase().includes('network')) {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError(message || 'Failed to update password. Please try again.')
      }
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
          {/* ── Session error (invalid / expired link) ────────────────────── */}
          {sessionError && !sessionReady && (
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Link Expired</h1>
              <p className="text-muted text-sm mb-6 leading-relaxed">{sessionError}</p>
              <a href="/forgot-password" className="btn-primary inline-flex">
                Request a new link
              </a>
            </div>
          )}

          {/* ── Waiting for Supabase session (link is valid, page just loaded) */}
          {!sessionError && !sessionReady && !success && (
            <div className="text-center py-4">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-muted text-sm">Verifying reset link…</p>
            </div>
          )}

          {/* ── Success state ─────────────────────────────────────────────── */}
          {success && (
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Password updated!</h1>
              <p className="text-muted text-sm">
                Your password has been updated successfully. Redirecting you to login…
              </p>
            </div>
          )}

          {/* ── New password form ─────────────────────────────────────────── */}
          {sessionReady && !success && (
            <>
              <h1 className="text-2xl font-semibold text-white mb-1">Set New Password</h1>
              <p className="text-muted text-sm mb-6">
                Choose a strong password with at least 8 characters.
              </p>

              {error && (
                <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="input-label">New Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    disabled={loading}
                    className="input-field"
                    required
                  />
                  {/* Inline character count hint */}
                  {password.length > 0 && password.length < 8 && (
                    <p className="text-warning text-xs mt-1.5">
                      {8 - password.length} more character{8 - password.length !== 1 ? 's' : ''} needed
                    </p>
                  )}
                  {password.length >= 8 && (
                    <p className="text-success text-xs mt-1.5">✓ Length looks good</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="input-label">Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    disabled={loading}
                    className="input-field"
                    required
                  />
                  {/* Inline match hint */}
                  {confirmPassword.length > 0 && confirmPassword !== password && (
                    <p className="text-warning text-xs mt-1.5">Passwords do not match</p>
                  )}
                  {confirmPassword.length > 0 && confirmPassword === password && (
                    <p className="text-success text-xs mt-1.5">✓ Passwords match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full mt-2"
                >
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}