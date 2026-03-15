import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { roomApi } from '../api/room'
import type { Room } from '../types'
import RoomCard from '../components/RoomCard'
import CreateRoomModal from '../components/CreateRoomModal'

export default function Home() {
  const { user } = useAuthStore()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showMyRooms, setShowMyRooms] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchRooms = async () => {
    if (!isAuthenticated) return
    
    try {
      setLoading(true)
      let response
      if (showMyRooms) {
        response = await roomApi.getRooms()
      } else {
        response = await roomApi.getPublicRooms()
      }
      
      if (response.data) {
        setRooms(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinPublicRoom = async (roomId: string) => {
    try {
      const response = await roomApi.joinPublicRoom(roomId)
      if (response.data) {
        return { success: true, data: response.data, message: response.data.message }
      }
      return { success: false, error: response.error || '申请失败' }
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || '申请失败' }
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [isAuthenticated, showMyRooms])

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateRoom = async (data: { name: string; description?: string; is_public?: boolean }) => {
    try {
      const response = await roomApi.createRoom(data)
      if (response.data) {
        setShowCreateModal(false)
        fetchRooms()
      }
    } catch (error) {
      console.error('Failed to create room:', error)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-800 mb-6">
              HiPhoto
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              与朋友分享旅途中的精彩瞬间，共同评分选出最佳照片
            </p>
            
            <div className="flex justify-center gap-4">
              <a
                href="/login"
                className="px-8 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                登录
              </a>
              <a
                href="/register"
                className="px-8 py-3 border border-primary-500 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
              >
                注册
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="container mx-auto px-4 py-8">
        {/* 搜索栏 */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索房间..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 创建/我的按钮 */}
        <div className="max-w-2xl mx-auto mb-8 flex gap-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建
          </button>
          <button
            onClick={() => setShowMyRooms(!showMyRooms)}
            className={`flex-1 px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
              showMyRooms 
                ? 'bg-primary-100 text-primary-600 border border-primary-300' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {showMyRooms ? '返回推荐' : '我的'}
          </button>
        </div>

        {/* 房间网格 */}
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {showMyRooms ? '您还没有加入任何房间' : '暂无公开房间'}
              </h3>
              <p className="text-gray-500">
                {showMyRooms ? '点击"创建"按钮创建一个新房间' : '房间创建者可以将房间设置为公开'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRooms.map((room) => (
                <RoomCard 
                  key={room.id} 
                  room={room} 
                  isOwner={room.owner_id === user?.id}
                  isPublic={!showMyRooms}
                  onJoinRoom={!showMyRooms ? handleJoinPublicRoom : undefined}
                  onJoinSuccess={fetchRooms}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 创建房间弹窗 */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRoom}
      />
    </div>
  )
}