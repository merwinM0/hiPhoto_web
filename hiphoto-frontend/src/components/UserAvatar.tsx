import { useAuthStore } from '../stores/authStore'

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  className?: string
}

export default function UserAvatar({ size = 'md', onClick, className = '' }: UserAvatarProps) {
  const { user } = useAuthStore()
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  }
  
  const getInitial = () => {
    if (!user) return ''
    if (user.username && user.username.length > 0) {
      return user.username.charAt(0).toUpperCase()
    }
    if (user.email && user.email.length > 0) {
      return user.email.charAt(0).toUpperCase()
    }
    return ''
  }
  
  const initial = getInitial()
  
  return (
    <button
      onClick={onClick}
      className={`${sizeClasses[size]} ${className} rounded-full flex items-center justify-center bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
      aria-label={user ? '用户菜单' : '登录'}
    >
      {initial || (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )}
    </button>
  )
}