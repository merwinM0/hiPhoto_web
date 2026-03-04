import { useAuthStore } from '../stores/authStore'
import { userApi } from '../api/auth'
import { useEffect } from 'react'

export function useAuth() {
  const { user, token, setAuth, setUser, logout, isAuthenticated } = useAuthStore()

  useEffect(() => {
    // 如果有 token 但没有 user 信息，尝试获取
    if (token && !user) {
      userApi.getProfile()
        .then((response) => {
          if (response.data) {
            setUser(response.data)
          }
        })
        .catch(() => {
          logout()
        })
    }
  }, [token, user, setUser, logout])

  return {
    user,
    token,
    isAuthenticated: isAuthenticated(),
    setAuth,
    logout,
  }
}
