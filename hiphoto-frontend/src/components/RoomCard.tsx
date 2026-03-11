import { Link, useNavigate } from 'react-router-dom'
import type { Room } from '../types'

interface RoomCardProps {
  room: Room
  isOwner?: boolean
  isPublic?: boolean
  onJoinRoom?: (inviteCode: string) => Promise<{ success: boolean; error?: string; data?: any }>
}

export default function RoomCard({ room, isOwner = false, isPublic = false, onJoinRoom }: RoomCardProps) {
  const navigate = useNavigate()
  
  const handleJoinClick = async (e: React.MouseEvent) => {
    if (isPublic && onJoinRoom) {
      e.preventDefault()
      e.stopPropagation()
      
      const result = await onJoinRoom(room.invite_code)
      if (result.success) {
        // 使用React Router导航
        navigate(`/rooms/${room.id}`)
      }
    }
  }

  const CardContent = () => (
    <div className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
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

      {isPublic && !isOwner && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={handleJoinClick}
            className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm font-medium"
          >
            立即加入
          </button>
          <p className="mt-1 text-xs text-gray-500 text-center">
            通过邀请码直接加入
          </p>
        </div>
      )}
    </div>
  )

  if (isPublic && !isOwner) {
    return <CardContent />
  }

  return (
    <Link to={`/rooms/${room.id}`}>
      <CardContent />
    </Link>
  )
}
