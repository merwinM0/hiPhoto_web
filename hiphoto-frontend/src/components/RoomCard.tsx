import { Link } from 'react-router-dom'
import type { Room } from '../types'

interface RoomCardProps {
  room: Room
  isOwner: boolean
}

export default function RoomCard({ room, isOwner }: RoomCardProps) {
  return (
    <Link
      to={`/rooms/${room.id}`}
      className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">{room.name}</h3>
          {room.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{room.description}</p>
          )}
        </div>
        {isOwner && (
          <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded">
            房主
          </span>
        )}
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
    </Link>
  )
}
