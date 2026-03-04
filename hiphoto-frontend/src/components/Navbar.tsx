import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/rooms" className="text-xl font-bold text-primary-600">
            HiPhoto
          </Link>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-gray-600">
                  {user.username || user.email}
                </span>
                <Link
                  to="/profile"
                  className="text-gray-600 hover:text-primary-600"
                >
                  个人设置
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm bg-primary-500 text-white rounded hover:bg-primary-600"
                >
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
