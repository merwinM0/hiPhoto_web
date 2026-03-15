import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { photoApi, tagApi, scoreApi } from '../api'
import { useAuthStore } from '../stores/authStore'
import PhotoViewer from '../components/PhotoViewer'
import type { PhotoDetail } from '../types'

export default function PhotoDetail() {
  const { photoId } = useParams<{ photoId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [photo, setPhoto] = useState<PhotoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTagModal, setShowTagModal] = useState(false)
  const [tagPosition, setTagPosition] = useState({ x: 0, y: 0 })
  const [tagContent, setTagContent] = useState('')
  const [tagLoading, setTagLoading] = useState(false)

  // 评分相关
  const [scoreValues, setScoreValues] = useState<Record<string, number>>({})
  const [scoreLoading, setScoreLoading] = useState(false)

  useEffect(() => {
    if (photoId) {
      loadPhoto()
    }
  }, [photoId])

  const loadPhoto = async () => {
    if (!photoId) return
    setLoading(true)

    try {
      const response = await photoApi.getPhoto(photoId)
      if (response.data) {
        setPhoto(response.data)
      }
    } catch (err) {
      console.error('Failed to load photo:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTagClick = (x: number, y: number) => {
    // 检查是否已添加过标签
    const existingTag = photo?.tags.find((t) => t.creator_id === user?.id)
    if (existingTag) {
      alert('每张照片只能添加一个标签')
      return
    }

    setTagPosition({ x, y })
    setShowTagModal(true)
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!photoId) return

    setTagLoading(true)
    try {
      await tagApi.createTag({
        photo_id: photoId,
        x: tagPosition.x,
        y: tagPosition.y,
        content: tagContent,
      })
      setShowTagModal(false)
      setTagContent('')
      await loadPhoto()
    } catch (err: any) {
      alert(err.response?.data?.error || '添加标签失败')
    } finally {
      setTagLoading(false)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('确定要删除这个标签吗？')) return
    
    try {
      await tagApi.deleteTag(tagId)
      await loadPhoto()
    } catch (err) {
      console.error('Failed to delete tag:', err)
    }
  }

  const handleSubmitScore = async (criteriaType: string) => {
    if (!photoId) return

    const score = scoreValues[criteriaType]
    if (!score) return

    setScoreLoading(true)
    try {
      await scoreApi.submitScore({
        photo_id: photoId,
        criteria_type: criteriaType,
        score,
      })
      alert('评分成功')
    } catch (err: any) {
      alert(err.response?.data?.error || '评分失败')
    } finally {
      setScoreLoading(false)
    }
  }

  const handleDeletePhoto = async () => {
    if (!photoId || !photo) return
    
    const isOwner = photo.uploader_id === user?.id
    if (!confirm(isOwner ? '确定要删除这张照片吗？' : '确定要删除这张照片吗？')) return

    try {
      await photoApi.deletePhoto(photoId)
      navigate(`/rooms/${photo.room_id}`)
    } catch (err) {
      console.error('Failed to delete photo:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!photo) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">照片不存在</p>
      </div>
    )
  }

  const canDelete = photo.uploader_id === user?.id // 需要额外判断是否是房主

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 图片查看器 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="h-[60vh]">
              <PhotoViewer
                imageBase64={photo.image_base64}
                tags={photo.tags}
                width={photo.width}
                height={photo.height}
                onTagClick={handleTagClick}
              />
            </div>
          </div>

          {/* 标签列表 */}
          <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold mb-3">标签 ({photo.tags.length})</h3>
            {photo.tags.length === 0 ? (
              <p className="text-sm text-gray-500">点击图片添加标签</p>
            ) : (
              <div className="space-y-2">
                {photo.tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <span className="font-medium">{tag.content}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        by {tag.creator_name || '匿名'}
                      </span>
                    </div>
                    {tag.creator_id === user?.id && (
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="text-sm text-red-500 hover:text-red-600"
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-4">
          {/* 照片信息 */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold mb-2">照片信息</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>上传者: {photo.uploader_name || '未知'}</p>
              <p>尺寸: {photo.width} × {photo.height}</p>
              <p>上传时间: {new Date(photo.created_at).toLocaleString()}</p>
            </div>
          </div>

          {/* 评分 */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold mb-3">评分</h3>
            <div className="space-y-3">
              {/* 默认评分项 */}
              {['构图', '色彩', '创意'].map((criteria) => (
                <div key={criteria} className="space-y-1">
                  <label className="text-sm text-gray-600">{criteria}</label>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={scoreValues[criteria] || 5}
                      onChange={(e) =>
                        setScoreValues({
                          ...scoreValues,
                          [criteria]: parseInt(e.target.value),
                        })
                      }
                      className="flex-1"
                    />
                    <span className="w-6 text-center">{scoreValues[criteria] || 5}</span>
                    <button
                      onClick={() => handleSubmitScore(criteria)}
                      disabled={scoreLoading}
                      className="px-2 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50"
                    >
                      提交
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          {canDelete && (
            <button
              onClick={handleDeletePhoto}
              className="w-full px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50"
            >
              删除照片
            </button>
          )}

          <button
            onClick={() => navigate(`/rooms/${photo.room_id}`)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            返回房间
          </button>
        </div>
      </div>

      {/* 添加标签弹窗 */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">添加标签</h2>
            
            <form onSubmit={handleCreateTag} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签内容
                </label>
                <input
                  type="text"
                  value={tagContent}
                  onChange={(e) => setTagContent(e.target.value)}
                  required
                  maxLength={50}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="输入标签内容"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTagModal(false)
                    setTagContent('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={tagLoading || !tagContent.trim()}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                  {tagLoading ? '添加中...' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
