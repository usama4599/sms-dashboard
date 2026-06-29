import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut()
      navigate(isAdmin ? '/admin-login' : '/login', { replace: true })
    } catch (err) {
      console.error('Logout failed:', err.message)
    }
  }

  const initials = profile?.email
    ? profile.email.slice(0, 2).toUpperCase()
    : '??'

  return (
    <nav className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold text-sm">
            S
          </div>
          <span className="font-semibold text-white tracking-tight">
            SMS Dashboard
            {isAdmin && (
              <span className="ml-2 badge-primary align-middle">Admin</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {!isAdmin && (
            <div className="hidden sm:flex items-center gap-1.5 badge-success">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {profile?.credits ?? 0} credits
            </div>
          )}

          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-white leading-tight">
              {profile?.email ?? '—'}
            </p>
            <p className="text-xs text-muted leading-tight">
              {isAdmin ? 'Administrator' : 'User'}
            </p>
          </div>

          <div className="h-9 w-9 rounded-full bg-surface-light border border-border flex items-center justify-center text-xs font-semibold text-white">
            {initials}
          </div>

          <button
            onClick={handleLogout}
            className="btn-secondary !px-3 !py-2"
            title="Log out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  )
}