import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const token = useAuthStore((state) => state.token)
  const location = useLocation()

  console.log('ProtectedRoute check:', { isAuthenticated, token, path: location.pathname })

  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  console.log('ProtectedRoute: Authenticated, rendering children')
  return children ? <>{children}</> : <Outlet />
}
