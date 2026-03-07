import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const navigate = useNavigate()

  useEffect(() => {
    let timer: number
    if (countdown > 0) {
      timer = window.setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendCode = async () => {
    if (!email) {
      setError('请输入邮箱')
      return
    }

    setSendingCode(true)
    setError(null)

    try {
      await authApi.sendVerificationCode(email)
      setCountdown(60) // 60秒倒计时
    } catch (err: any) {
      setError(err.response?.data?.error || '发送验证码失败')
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码至少需要 6 个字符')
      return
    }

    if (!code) {
      setError('请输入验证码')
      return
    }

    setLoading(true)

    try {
      await authApi.register(email, password, code)
      navigate('/login', { state: { message: '注册成功，请登录' } })
    } catch (err: any) {
      setError(err.response?.data?.error || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">注册</h1>
          <p className="mt-2 text-gray-600">创建你的 HiPhoto 账号</p>
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
               <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                 验证码
               </label>
               <div className="flex gap-2">
                 <input
                   id="code"
                   type="text"
                   value={code}
                   onChange={(e) => setCode(e.target.value)}
                   required
                   className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                   placeholder="6位验证码"
                   maxLength={6}
                 />
                 <button
                   type="button"
                   onClick={handleSendCode}
                   disabled={sendingCode || countdown > 0}
                   className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                 >
                   {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}秒后重试` : '发送验证码'}
                 </button>
               </div>
               <p className="mt-1 text-xs text-gray-500">验证码10分钟内有效</p>
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
                 placeholder="至少 6 个字符"
               />
             </div>

             <div>
               <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                 确认密码
               </label>
               <input
                 id="confirmPassword"
                 type="password"
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
                 required
                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                 placeholder="再次输入密码"
               />
             </div>
           </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '注册中...' : '注册'}
          </button>

          <div className="mt-4 text-center text-sm text-gray-600">
            已有账号？{' '}
            <Link to="/login" className="text-primary-600 hover:underline">
              立即登录
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
