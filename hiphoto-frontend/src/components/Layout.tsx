import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { userApi } from '../api/auth'

export default function Layout() {
  const { user, token, setUser } = useAuthStore()

  useEffect(() => {
    const fetchUserProfile = async () => {
      // 如果有token但没有完整的用户信息（username为null），则获取用户信息
      if (token && user && !user.username) {
        try {
          const response = await userApi.getProfile()
          if (response.data) {
            setUser(response.data)
          }
        } catch (err) {
          console.error('Failed to fetch user profile:', err)
        }
      }
    }

    fetchUserProfile()
  }, [token, user, setUser])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
