import { useState, useEffect } from 'react'
import { roomApi } from '../api/room'
import { useAuthStore } from '../stores/authStore'
import RoomCard from '../components/RoomCard'
import InviteCodeSearch from '../components/InviteCodeSearch'
import type { Room } from '../types'

export default function RoomList() {
  const { user } = useAuthStore()
  const [rooms, setRooms] = useState<Room[]>([])
  const [publicRooms, setPublicRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDescription, setNewRoomDescription] = useState('')
  const [newRoomIsPublic, setNewRoomIsPublic] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadRooms()
    loadPublicRooms()
  }, [])

  const loadRooms = async () => {
    try {
      const response = await roomApi.getRooms()
      if (response.data) {
        setRooms(response.data)
      }
    } catch (err) {
      console.error('Failed to load rooms:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPublicRooms = async () => {
    try {
      const response = await roomApi.getPublicRooms()
      if (response.data) {
        setPublicRooms(response.data)
      }
    } catch (err) {
      console.error('Failed to load public rooms:', err)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setActionLoading(true)

    try {
      const response = await roomApi.createRoom({
        name: newRoomName,
        description: newRoomDescription || undefined,
        is_public: newRoomIsPublic,
      })
      if (response.data) {
        setRooms([...rooms, response.data])
        setShowCreateModal(false)
        setNewRoomName('')
        setNewRoomDescription('')
        setNewRoomIsPublic(false)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '创建失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleJoinRoom = async (inviteCode: string) => {
    try {
      const response = await roomApi.joinRoom(inviteCode.toUpperCase())
      if (response.data) {
        loadRooms() // 重新加载房间列表
        return { success: true, data: response.data }
      }
      return { success: false, error: '加入失败' }
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || '加入失败' }
    }
  }

  const handleJoinPublicRoom = async (roomId: string) => {
    try {
      const response = await roomApi.joinPublicRoom(roomId)
      if (response.data) {
        return { success: true, data: response.data, message: response.data.message }
      }
      return { success: false, error: '申请失败' }
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || '申请失败' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div>
      {/* 邀请码搜索 */}
      <div className="mb-8">
        <InviteCodeSearch onJoinRoom={handleJoinRoom} />
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">我的房间</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            创建房间
          </button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-gray-500">还没有加入任何房间</p>
          <p className="text-sm text-gray-400 mt-1">创建一个房间或使用邀请码加入</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              isOwner={room.owner_id === user?.id}
            />
          ))}
        </div>
      )}

      {/* 公开房间推荐 */}
      {publicRooms.length > 0 && (
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">推荐房间</h2>
             <span className="text-sm text-gray-500">公开房间，需要房主审批</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isOwner={room.owner_id === user?.id}
                isPublic={true}
                onJoinRoom={handleJoinPublicRoom}
              />
            ))}
          </div>
        </div>
      )}

      {/* 创建房间弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">创建房间</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  房间名称
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="给房间起个名字"
                 />
               </div>

               <div>
                 <label className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     checked={newRoomIsPublic}
                     onChange={(e) => setNewRoomIsPublic(e.target.checked)}
                     className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                   />
                   <span className="text-sm text-gray-700">设为公开房间（允许被推荐）</span>
                 </label>
                 <p className="text-xs text-gray-500 mt-1">
                   公开房间会显示在推荐列表中，用户可以通过邀请码直接加入
                 </p>
               </div>

               <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setError(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                  {actionLoading ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
       )}
    </div>
  )
}
