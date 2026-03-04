import { useState, useRef } from 'react'

interface PhotoUploaderProps {
  onUpload: (base64: string) => Promise<void>
  disabled?: boolean
}

export default function PhotoUploader({ onUpload, disabled }: PhotoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB')
      return
    }

    setError(null)

    // 读取文件并转换为 base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!preview) return

    setLoading(true)
    setError(null)

    try {
      // 移除 data:image/xxx;base64, 前缀
      const base64Data = preview.split(',')[1]
      await onUpload(base64Data)
      setPreview(null)
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
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
      />

      {!preview ? (
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
          <p className="mt-2 text-sm text-gray-500">点击选择图片</p>
        </label>
      ) : (
        <div className="space-y-3">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-64 object-contain rounded-lg"
          />
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {loading ? '上传中...' : '确认上传'}
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
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
