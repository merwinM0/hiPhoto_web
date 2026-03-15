import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Room } from '../types'

interface RoomCardProps {
  room: Room
  isOwner?: boolean
  isPublic?: boolean
  onJoinRoom?: (roomId: string) => Promise<{ success: boolean; error?: string; data?: any; message?: string }>
  onJoinSuccess?: () => void
}

export default function RoomCard({ room, isOwner = false, isPublic = false, onJoinRoom, onJoinSuccess }: RoomCardProps) {
  const navigate = useNavigate()
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joining, setJoining] = useState(false)

  const handleCardClick = () => {
    if (isPublic && !isOwner) {
      setShowJoinModal(true)
    } else {
      navigate(`/rooms/${room.id}`)
    }
  }

  const handleJoinConfirm = async () => {
    if (!onJoinRoom) return
    
    setJoining(true)
    const result = await onJoinRoom(room.id)
    setJoining(false)
    
    if (result.success) {
      setShowJoinModal(false)
      alert('已提交加入申请，等待房主审批')
      onJoinSuccess?.()
    } else {
      alert(result.error || '申请失败')
    }
  }

  return (
    <>
      <div 
        className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800">{room.name}</h3>
            {room.description && (
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{room.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {room.is_public && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                公开
              </span>
            )}
            {isOwner && (
              <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded">
                房主
              </span>
            )}
          </div>
        </div>
        
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
          <span>{room.member_count} 成员</span>
          <span>{room.photo_count} 张照片</span>
        </div>
        
        {isOwner && (
          <div className="mt-2 text-xs text-gray-400">
            邀请码: <span className="font-mono">{room.invite_code}</span>
          </div>
        )}
      </div>

      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowJoinModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">加入房间</h3>
            <p className="text-gray-600 mb-4">是否申请加入「{room.name}」？</p>
            <p className="text-sm text-gray-500 mb-6">申请后需要房主审批才能加入</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleJoinConfirm}
                disabled={joining}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                {joining ? '申请中...' : '申请加入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
