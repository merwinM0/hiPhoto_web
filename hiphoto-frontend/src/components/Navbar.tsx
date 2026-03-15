import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useState, useRef, useEffect } from 'react'
import UserAvatar from './UserAvatar'
import { userApi } from '../api/auth'
import { roomApi } from '../api/room'
import type { JoinRequest } from '../types'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (user) {
      loadPendingCount()
      const interval = setInterval(loadPendingCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const loadPendingCount = async () => {
    try {
      const response = await roomApi.getPendingRequestCount()
      if (response.data) {
        setPendingCount(response.data.count)
      }
    } catch (err) {
      console.error('Failed to load pending count:', err)
    }
  }

  const handleLogout = () => {
    logout()
    setShowDropdown(false)
    navigate('/login')
  }

  const handleAvatarClick = () => {
    if (!user) {
      navigate('/login')
    } else {
      setShowDropdown(!showDropdown)
    }
  }

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDropdown(false)
    setShowProfileModal(true)
  }

  return (
    <>
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-xl font-bold text-primary-600">
              HiPhoto
            </Link>
            
            <div className="flex items-center gap-4" ref={dropdownRef}>
              {user ? (
                <div className="relative flex items-center gap-3">
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full"
                    title="消息"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {pendingCount > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    )}
                  </button>
                  <UserAvatar onClick={handleAvatarClick} />
                  
                   {showDropdown && (
                     <div 
                       className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                       onClick={(e) => e.stopPropagation()}
                     >
                       <div className="py-1">
                         <button
                           type="button"
                           onClick={handleProfileClick}
                           className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                         >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          个人信息
                        </button>
                         <button
                           type="button"
                           onClick={handleLogout}
                           className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                         >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          登出
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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

      {showProfileModal && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {showMessageModal && (
        <MessageModal
          onClose={() => {
            setShowMessageModal(false)
            loadPendingCount()
          }}
        />
      )}
    </>
  )
}

interface ProfileModalProps {
  user: any
  onClose: () => void
}

interface MessageModalProps {
  onClose: () => void
}

function MessageModal({ onClose }: MessageModalProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadRequests()

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const loadRequests = async () => {
    try {
      const response = await roomApi.getPendingRequests()
      if (response.data) {
        setRequests(response.data)
      }
    } catch (err) {
      console.error('Failed to load requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (roomId: string, userId: string) => {
    setActionLoading(`${roomId}-${userId}-approve`)
    try {
      await roomApi.approveMember(roomId, userId)
      setRequests(requests.filter(r => !(r.room_id === roomId && r.user_id === userId)))
    } catch (err) {
      console.error('Failed to approve:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (roomId: string, userId: string) => {
    setActionLoading(`${roomId}-${userId}-reject`)
    try {
      await roomApi.rejectMember(roomId, userId)
      setRequests(requests.filter(r => !(r.room_id === roomId && r.user_id === userId)))
    } catch (err) {
      console.error('Failed to reject:', err)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">消息</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              暂无新消息
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((request) => (
                <div key={`${request.room_id}-${request.user_id}`} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">{request.username || '未知用户'}</span>
                        <span className="text-gray-500"> 申请加入 </span>
                        <span className="font-medium">{request.room_name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleApprove(request.room_id, request.user_id)}
                      disabled={actionLoading !== null}
                      className="flex-1 px-3 py-1.5 text-sm bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50"
                    >
                      {actionLoading === `${request.room_id}-${request.user_id}-approve` ? '处理中...' : '接受'}
                    </button>
                    <button
                      onClick={() => handleReject(request.room_id, request.user_id)}
                      disabled={actionLoading !== null}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      {actionLoading === `${request.room_id}-${request.user_id}-reject` ? '处理中...' : '拒绝'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileModal({ user, onClose }: ProfileModalProps) {
  const [username, setUsername] = useState(user?.username || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { setUser } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const response = await userApi.updateProfile({ username, bio })
      if (response.data) {
        setUser(response.data)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      } else if (response.error) {
        setError(response.error)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    let fetchTimer: number

    const fetchUserProfile = async () => {
      if (!mounted) return
      
      setFetching(true)
      try {
        const response = await userApi.getProfile()
        if (mounted && response.data) {
          setUsername(response.data.username || '')
          setBio(response.data.bio || '')
        }
      } catch (err) {
        if (mounted) {
          console.error('Failed to fetch user profile:', err)
        }
      } finally {
        if (mounted) {
          setFetching(false)
        }
      }
    }

    // 添加微小延迟，避免立即状态变化导致的闪屏
    fetchTimer = window.setTimeout(fetchUserProfile, 50)

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      mounted = false
      clearTimeout(fetchTimer)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose, setUser])



   return (
     <div 
       className="fixed inset-0 bg-black bg-opacity-0 flex items-center justify-center z-[100] p-4 animate-fade-in"
     >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto opacity-0 scale-95 animate-modal-in"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">个人信息</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

           {fetching ? (
             <div className="flex justify-center items-center py-12">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
             </div>
           ) : (
             <form onSubmit={handleSubmit} className="space-y-4">
               {error && (
                 <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                   {error}
                 </div>
               )}

               {success && (
                 <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
                   保存成功
                 </div>
               )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                用户名
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="设置你的用户名"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                个人介绍
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="介绍一下自己"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                {loading ? '保存中...' : '保存'}
              </button>
             </div>
           </form>
           )}
        </div>
      </div>
    </div>
  )
}
