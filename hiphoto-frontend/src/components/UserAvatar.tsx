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
    return ''
  }
  
  const initial = getInitial()
  
  return (
    <button
      onClick={onClick}
      className={`${sizeClasses[size]} ${className} rounded-full flex items-center justify-center bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
      aria-label={user ? '用户菜单' : '登录'}
    >
      {initial}
    </button>
  )
}