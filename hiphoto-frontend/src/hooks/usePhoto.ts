import { useState } from 'react'
import { photoApi } from '../api/photo'
import type { Photo, PhotoDetail } from '../types'

export function usePhoto() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadPhoto = async (roomId: string, file: File): Promise<Photo | null> => {
    setLoading(true)
    setError(null)

    try {
      // 转换为 base64
      const base64 = await fileToBase64(file)
      const response = await photoApi.uploadPhoto(roomId, base64)
      return response.data || null
    } catch (err: any) {
      setError(err.response?.data?.error || '上传失败')
      return null
    } finally {
      setLoading(false)
    }
  }

  const getPhoto = async (photoId: string): Promise<PhotoDetail | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await photoApi.getPhoto(photoId)
      return response.data || null
    } catch (err: any) {
      setError(err.response?.data?.error || '获取失败')
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    uploadPhoto,
    getPhoto,
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // 移除 data:image/xxx;base64, 前缀
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
