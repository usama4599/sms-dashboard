import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const { signUp, signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { user, session } = await signUp(email, password)
      if (!user) throw new Error('Signup failed — no user was created')

      if (session) {
        await signIn(email, password)
        navigate('/dashboard', { replace: true })
      } else {
        setSuccessMessage(
          'Account created! Please check your email to confirm your address, then log in.'
        )
      }
    } catch (err) {
      setError(
        err.message?.includes('already registered')
          ? 'An account with this email already exists'
          : err.message || 'Failed to create account'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center font-bold text-lg">
            S
          </div>
          <span className="text-xl font-semibold text-white tracking-tight">
            SMS Dashboard
          </span>
        </div>

        <div className="card animate-fade-in">
          <h1 className="text-2xl font-semibold text-white mb-1">Create your account</h1>
          <p className="text-muted text-sm mb-6">Sign up to start claiming numbers.</p>

          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="bg-success/10 border border-success/30 text-success text-sm rounded-lg px-4 py-3 mb-4">
              {successMessage}
            </div>
          )}

          {!successMessage && (
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
              <div>
                <label htmlFor="password" className="input-label">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  disabled={loading}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="input-label">Confirm password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  disabled={loading}
                  className="input-field"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>
          )}

          {successMessage && (
            <Link to="/login" className="btn-primary w-full mt-2 block text-center">
              Go to Login
            </Link>
          )}

          <p className="text-center text-sm text-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-light font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}