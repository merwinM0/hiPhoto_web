import { useState, useRef } from 'react'

interface PhotoUploaderProps {
  onUpload: (base64: string) => Promise<void>
  disabled?: boolean
  maxFiles?: number
}

export default function PhotoUploader({ onUpload, disabled, maxFiles = 9 }: PhotoUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (files.length === 0) return

    // 验证文件数量
    if (previews.length + files.length > maxFiles) {
      setError(`最多只能上传 ${maxFiles} 张图片`)
      return
    }

    // 验证文件类型和大小
    const invalidFiles = files.filter(file => {
      return !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024
    })

    if (invalidFiles.length > 0) {
      setError('请选择有效的图片文件（支持格式：JPG、PNG等，单张不超过10MB）')
      return
    }

    setError(null)

    // 读取所有文件
    const newPreviews: string[] = []
    let loadedCount = 0

    files.forEach((file, index) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        newPreviews[index] = base64
        loadedCount++

        if (loadedCount === files.length) {
          setPreviews(prev => [...prev, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleUpload = async () => {
    if (previews.length === 0) return

    setLoading(true)
    setError(null)

    try {
      // 依次上传所有图片
      for (const preview of previews) {
        const base64Data = preview.split(',')[1]
        await onUpload(base64Data)
      }
      
      setPreviews([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '上传失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setPreviews([])
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removePreview = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || loading}
        className="hidden"
        id="photo-upload"
        multiple
      />

      {previews.length === 0 ? (
        <label
          htmlFor="photo-upload"
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            disabled
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-primary-500 hover:bg-gray-50'
          }`}
        >
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">点击选择图片（最多 {maxFiles} 张）</p>
          <p className="text-xs text-gray-400 mt-1">支持批量选择</p>
        </label>
      ) : (
        <div className="space-y-4">
          {/* 预览网格 */}
          <div className="grid grid-cols-3 gap-3">
            {previews.map((preview, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePreview(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
                >
                  ×
                </button>
                <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  图片 {index + 1}
                </div>
              </div>
            ))}
          </div>

          {/* 上传状态 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              已选择 {previews.length} / {maxFiles} 张图片
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={previews.length >= maxFiles}
              className="text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400"
            >
              + 添加更多
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {loading ? `上传中... (${previews.length} 张)` : `确认上传 (${previews.length} 张)`}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
