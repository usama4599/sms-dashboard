import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute({ children }) {
  const { session, profile, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // No session at all -> send to the admin login page, not the regular one,
  // since this route is reached via the admin-facing part of the app.
  if (!session) {
    return <Navigate to="/admin-login" state={{ from: location }} replace />
  }

  // Session exists but profile hasn't loaded yet for some reason (e.g. a
  // transient fetch error) -> treat as not-authorized rather than hanging.
  if (!profile) {
    return <Navigate to="/admin-login" replace />
  }

  // Logged in, but not an admin -> do NOT send to /admin-login (that would
  // imply they just need to "login again as admin"). Send them to their
  // normal dashboard instead, since they ARE a valid, authenticated user.
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
