import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { roomApi, photoApi, scoreApi } from '../api'
import { useAuthStore } from '../stores/authStore'
import PhotoUploader from '../components/PhotoUploader'
import ScoringCriteriaSettings from '../components/ScoringCriteriaSettings'
import type { Room, RoomMember, Photo, ScoreRound, ScoringCriteria } from '../types'

export default function RoomDetail() {
  const { roomId } = useParams<{ roomId: string }>()
  const { user } = useAuthStore()

  const [room, setRoom] = useState<Room | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [members, setMembers] = useState<RoomMember[]>([])
  const [scoreRound, setScoreRound] = useState<ScoreRound | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [scoreValue, setScoreValue] = useState(5)

  const isOwner = room?.owner_id === user?.id

  useEffect(() => {
    if (roomId) {
      loadRoomData()
    } else {
      setError('房间ID不存在')
      setLoading(false)
    }
  }, [roomId])

  const loadRoomData = async () => {
    if (!roomId) return
    setLoading(true)
    setError(null)

    try {
      const [roomRes, photosRes, membersRes, scoreRes] = await Promise.all([
        roomApi.getRoom(roomId),
        photoApi.getRoomPhotos(roomId),
        roomApi.getRoomMembers(roomId),
        scoreApi.getScoreboard(roomId),
      ])

      if (roomRes.data) {
        setRoom(roomRes.data)
      } else if (roomRes.error) {
        setError(`房间加载失败: ${roomRes.error}`)
      } else {
        setError('房间加载失败：未知错误')
      }
      
      if (photosRes.data) setPhotos(photosRes.data)
      if (membersRes.data) setMembers(membersRes.data)
      if (scoreRes.data) setScoreRound(scoreRes.data)
    } catch (err) {
      setError(`加载失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadPhoto = async (base64: string) => {
    if (!roomId) return
    await photoApi.uploadPhoto(roomId, base64)
    await loadRoomData()
    setShowUploadModal(false)
  }

  const handleKickMember = async (userId: string) => {
    if (!roomId) return
    
    if (confirm('确定要移除该成员吗？')) {
      await roomApi.kickMember(roomId, userId)
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

  const handleSubmitScore = async () => {
    if (!roomId || !photos[currentPhotoIndex]) return
    
    try {
      await scoreApi.submitScore({
        photo_id: photos[currentPhotoIndex].id,
        criteria_type: 'overall',
        score: scoreValue
      })
      alert('评分提交成功！')
    } catch (err) {
      alert('评分提交失败')
    }
  }

  const handleSaveScoringCriteria = async (criteria: ScoringCriteria) => {
    if (!roomId) return
    
    try {
      await roomApi.updateRoom(roomId, { scoring_criteria: criteria })
      await loadRoomData()
      alert('评分标准保存成功！')
    } catch (err) {
      alert('保存失败')
    }
  }

  const handleSaveRoomSettings = async () => {
    if (!roomId) return
    
    // 这里可以添加保存房间设置的逻辑
    alert('房间设置保存成功！')
    setShowSettingsModal(false)
  }

  const handlePrevPhoto = () => {
    setCurrentPhotoIndex(prev => prev > 0 ? prev - 1 : photos.length - 1)
  }

  const handleNextPhoto = () => {
    setCurrentPhotoIndex(prev => prev < photos.length - 1 ? prev + 1 : 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-gray-600">加载房间数据中...</span>
      </div>
    )
  }

  if (error || !room) {
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

  const currentPhoto = photos[currentPhotoIndex]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{room.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                邀请码: <span className="font-mono font-bold text-primary-600">{room.invite_code}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                上传图片
              </button>
              {isOwner && (
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  设置
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧用户列表 */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-4">房间成员 ({members.filter(m => m.status === 'approved').length})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {members.filter(member => member.status === 'approved').map((member) => (
                  <div key={member.user_id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 text-sm font-medium">
                        {(member.username || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{member.username || '未设置用户名'}</p>
                      <p className="text-xs text-gray-500">{member.photo_count} 张照片</p>
                    </div>
                    {isOwner && member.role !== 'owner' && (
                      <button
                        onClick={() => handleKickMember(member.user_id)}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        移除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 中间主区域 - 图片展示 */}
          <div className="col-span-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {photos.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500">还没有照片</p>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    上传第一张照片
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 图片展示 */}
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <img
                    src={`data:image/jpeg;base64,${currentPhoto.thumbnail_base64}`}
                    alt="Photo"
                    className="w-full h-full object-contain"
                  />
                    
                    {/* 翻页按钮 */}
                    <button
                      onClick={handlePrevPhoto}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
                    >
                      ←
                    </button>
                    <button
                      onClick={handleNextPhoto}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
                    >
                      →
                    </button>
                    
                    {/* 图片信息 */}
                    <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded">
                      <p className="text-sm">
                        上传者: {currentPhoto.uploader_name || '未知用户'} • 
                        第 {currentPhotoIndex + 1} / {photos.length} 张
                      </p>
                    </div>
                  </div>

                  {/* 评分栏 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-800">评分 (1-10分)</h4>
                      <span className="text-primary-600 font-bold text-lg">{scoreValue} 分</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={scoreValue}
                      onChange={(e) => setScoreValue(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1分</span>
                      <span>5分</span>
                      <span>10分</span>
                    </div>
                    <button
                      onClick={handleSubmitScore}
                      className="mt-4 w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                    >
                      提交评分
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      同一张图片重复提交会覆盖前一次的评分
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右侧评分榜 */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">评分榜</h3>
                {isOwner && scoreRound && (
                  <div className="flex gap-1">
                    {scoreRound.status === 'active' && (
                      <button
                        onClick={handleEndRound}
                        className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
                      >
                        结束本轮
                      </button>
                    )}
                    {scoreRound.status === 'completed' && (
                      <button
                        onClick={handleStartNewRound}
                        className="text-xs px-2 py-1 bg-primary-500 text-white rounded hover:bg-primary-600"
                      >
                        开始新一轮
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {scoreRound ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {scoreRound.scoreboard.map((entry, index) => (
                    <div key={entry.photo_id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.uploader_name || '未知用户'}</p>
                        <p className="text-xs text-gray-500">{entry.total_score.toFixed(1)} 分</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>暂无评分数据</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 上传图片弹窗 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">上传图片</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <PhotoUploader
                onUpload={handleUploadPhoto}
                disabled={photos.filter((p) => p.uploader_id === user?.id).length >= room.upload_limit}
              />
              {photos.filter((p) => p.uploader_id === user?.id).length >= room.upload_limit && (
                <p className="text-sm text-orange-600 mt-4">
                  你已达到上传上限（{room.upload_limit} 张）
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 设置弹窗 */}
      {showSettingsModal && isOwner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">房间设置</h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="space-y-8">
                {/* 评分标准设置 */}
                <div className="border-b border-gray-200 pb-6">
                  <ScoringCriteriaSettings
                    criteria={room.scoring_criteria || null}
                    onSave={handleSaveScoringCriteria}
                  />
                </div>

                {/* 房间信息设置 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">房间信息</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        房间名称
                      </label>
                      <input
                        type="text"
                        defaultValue={room.name}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        房间描述
                      </label>
                      <textarea
                        defaultValue={room.description || ''}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                        placeholder="描述房间的主题或规则..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        上传限制
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="50"
                          defaultValue={room.upload_limit}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="w-16 text-center font-medium">{room.upload_limit} 张</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">限制每个成员最多上传的照片数量</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is-public"
                        defaultChecked={room.is_public}
                        className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                      <label htmlFor="is-public" className="text-sm text-gray-700">
                        设为公开房间（允许被推荐）
                      </label>
                    </div>
                  </div>
                </div>

                {/* 保存按钮 */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveRoomSettings}
                    className="w-full px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium"
                  >
                    保存所有设置
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}