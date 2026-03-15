import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { roomApi, photoApi, scoreApi } from '../api'
import { useAuthStore } from '../stores/authStore'
import PhotoUploader from '../components/PhotoUploader'
import ScoreBoard from '../components/ScoreBoard'
import type { Room, RoomMember, Photo, ScoreRound } from '../types'

type Tab = 'photos' | 'members' | 'scoreboard' | 'settings'

export default function RoomDetail() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [room, setRoom] = useState<Room | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [members, setMembers] = useState<RoomMember[]>([])
  const [scoreRound, setScoreRound] = useState<ScoreRound | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('photos')
  const [error, setError] = useState<string | null>(null)

  const isOwner = room?.owner_id === user?.id

  useEffect(() => {
    console.log('RoomDetail mounted with roomId:', roomId)
    if (roomId) {
      loadRoomData()
    } else {
      console.error('No roomId provided in URL')
      setError('房间ID不存在')
      setLoading(false)
    }
  }, [roomId])

  const loadRoomData = async () => {
    if (!roomId) return
    setLoading(true)
    setError(null)

    try {
      console.log('Loading room data for:', roomId)
      const [roomRes, photosRes, membersRes, scoreRes] = await Promise.all([
        roomApi.getRoom(roomId),
        photoApi.getRoomPhotos(roomId),
        roomApi.getRoomMembers(roomId),
        scoreApi.getScoreboard(roomId),
      ])

      console.log('Room response:', roomRes)
      console.log('Photos response:', photosRes)
      console.log('Members response:', membersRes)
      console.log('Score response:', scoreRes)

      if (roomRes.data) {
        setRoom(roomRes.data)
      } else if (roomRes.error) {
        console.log('Room API returned error:', roomRes.error)
        setError(`房间加载失败: ${roomRes.error}`)
      } else {
        console.log('Room API returned no data and no error')
        setError('房间加载失败：未知错误')
      }
      
      if (photosRes.data) setPhotos(photosRes.data)
      if (membersRes.data) setMembers(membersRes.data)
      if (scoreRes.data) setScoreRound(scoreRes.data)
    } catch (err) {
      console.error('Failed to load room:', err)
      setError(`加载失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadPhoto = async (base64: string) => {
    if (!roomId) return
    await photoApi.uploadPhoto(roomId, base64)
    await loadRoomData()
  }



  const handleKickMember = async (userId: string) => {
    if (!roomId) return
    
    if (confirm('确定要移除该成员吗？')) {
      await roomApi.kickMember(roomId, userId)
      await loadRoomData()
    }
  }

  const handleApproveMember = async (userId: string) => {
    if (!roomId) return
    
    if (confirm('确定要批准该成员加入吗？')) {
      await roomApi.approveMember(roomId, userId)
      await loadRoomData()
    }
  }

  const handleRejectMember = async (userId: string) => {
    if (!roomId) return
    
    if (confirm('确定要拒绝该成员加入吗？')) {
      await roomApi.rejectMember(roomId, userId)
      await loadRoomData()
    }
  }

  const handleEndRound = async () => {
    if (!roomId) return
    
    if (confirm('确定要结束本轮评分吗？')) {
      await scoreApi.endRound(roomId)
      await loadRoomData()
    }
  }

  const handleStartNewRound = async () => {
    if (!roomId) return
    
    if (confirm('确定要开始新一轮评分吗？')) {
      await scoreApi.startNewRound(roomId)
      await loadRoomData()
    }
  }

  console.log('RoomDetail render state:', { loading, error, room, photos, members, scoreRound })

  if (loading) {
    console.log('RoomDetail: Showing loading state')
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-gray-600">加载房间数据中...</span>
      </div>
    )
  }

  if (error || !room) {
    console.log('RoomDetail: Showing error/not found state', { error, room })
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">{error || '房间不存在'}</p>
        <button 
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          返回
        </button>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'photos', label: `照片 (${photos.length})` },
    { key: 'members', label: `成员 (${members.length})` },
    { key: 'scoreboard', label: '评分榜' },
  ]

  if (isOwner) {
    tabs.push({ key: 'settings', label: '设置' })
  }

  return (
    <div>
      {/* 房间信息 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{room.name}</h1>
            {room.description && (
              <p className="mt-1 text-gray-600">{room.description}</p>
            )}
          </div>
          {isOwner && (
            <div className="text-right">
              <p className="text-sm text-gray-500">邀请码</p>
              <p className="text-xl font-mono font-bold text-primary-600">
                {room.invite_code}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 照片列表 */}
      {activeTab === 'photos' && (
        <div className="space-y-6">
          <PhotoUploader
            onUpload={handleUploadPhoto}
            disabled={photos.filter((p) => p.uploader_id === user?.id).length >= room.upload_limit}
          />
          
          {photos.filter((p) => p.uploader_id === user?.id).length >= room.upload_limit && (
            <p className="text-sm text-orange-600">
              你已达到上传上限（{room.upload_limit} 张）
            </p>
          )}

          {photos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">还没有照片</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => navigate(`/photos/${photo.id}`)}
                  className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                >
                   <img
                    src={`data:image/jpeg;base64,${photo.thumbnail_base64}`}
                    alt="Photo"
                    className="w-full h-full object-contain bg-black"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 成员列表 */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* 已批准成员 */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold">已批准成员 ({members.filter(m => m.status === 'approved').length})</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {members.filter(member => member.status === 'approved').map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-medium">
                        {(member.username || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.username || '未设置用户名'}</p>
                      <p className="text-sm text-gray-500">
                        {member.photo_count} 张照片
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      member.role === 'owner'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {member.role === 'owner' ? '房主' : '成员'}
                    </span>
                    {isOwner && member.role !== 'owner' && (
                      <button
                        onClick={() => handleKickMember(member.user_id)}
                        className="text-sm text-red-500 hover:text-red-600"
                      >
                        移除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 待审批成员 */}
          {isOwner && members.filter(m => m.status === 'pending').length > 0 && (
            <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200">
              <div className="p-4 border-b border-yellow-200">
                <h3 className="font-semibold text-yellow-800">待审批成员 ({members.filter(m => m.status === 'pending').length})</h3>
                <p className="text-sm text-yellow-600 mt-1">这些用户申请加入房间，等待您的审批</p>
              </div>
              <div className="divide-y divide-yellow-100">
                {members.filter(member => member.status === 'pending').map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600 font-medium">
                          {(member.username || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{member.username || '未设置用户名'}</p>
                        <p className="text-sm text-yellow-600">等待审批中</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveMember(member.user_id)}
                        className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        批准
                      </button>
                      <button
                        onClick={() => handleRejectMember(member.user_id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 评分榜 */}
      {activeTab === 'scoreboard' && scoreRound && (
        <div className="space-y-4">
          {isOwner && (
            <div className="flex gap-2">
              {scoreRound.status === 'active' && (
                <button
                  onClick={handleEndRound}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  结束本轮
                </button>
              )}
              {scoreRound.status === 'completed' && (
                <button
                  onClick={handleStartNewRound}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  开始新一轮
                </button>
              )}
            </div>
          )}
          <ScoreBoard scoreRound={scoreRound} />
        </div>
      )}

      {/* 设置 */}
      {activeTab === 'settings' && isOwner && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">房间设置</h3>
          <p className="text-gray-500">设置功能开发中...</p>
        </div>
      )}
    </div>
  )
}
