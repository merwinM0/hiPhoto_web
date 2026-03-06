import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((state) => state.setAuth)

  // const from = (location.state as any)?.from?.pathname || '/rooms'
  const from = (location.state as any)?.from?.pathname || '/'
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const response = await authApi.login(email, password)
      console.log('Login response:', response)
      
      // 检查是否有错误
      if (response.error) {
        console.error('Login API error:', response.error)
        setError(response.error)
        return
      }
      
      // 检查响应数据是否存在
      if (!response.data) {
        console.error('Login response missing data:', response)
        setError('登录响应数据为空')
        return
      }
      
      const authData = response.data
      console.log('Auth data:', authData)
      console.log('Token:', authData.token)
      console.log('User ID:', authData.user_id)
      
      if (authData.token && authData.user_id) {
        // 创建一个临时的user对象，稍后可以通过userApi.getProfile获取完整信息
        const tempUser = {
          id: authData.user_id,
          email: authData.email,
          username: null,
          bio: null,
          is_verified: false
        }
        console.log('Setting auth with token:', authData.token)
        setAuth(authData.token, tempUser)
        console.log('Navigating to:', from)
        navigate(from, { replace: true })
      } else {
        console.error('Login response missing token or user_id:', response)
        setError('登录响应数据不完整')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      // 处理未捕获的错误
      if (err.message) {
        setError(err.message)
      } else {
        setError('登录失败')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">登录</h1>
          <p className="mt-2 text-gray-600">欢迎回到 HiPhoto</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <div className="mt-4 text-center text-sm text-gray-600">
            还没有账号？{' '}
            <Link to="/register" className="text-primary-600 hover:underline">
              立即注册
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
