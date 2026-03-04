import api from './index'
import type { ApiResponse, Photo, PhotoDetail } from '../types'

export const photoApi = {
  getRoomPhotos: async (roomId: string): Promise<ApiResponse<Photo[]>> => {
    const response = await api.get(`/rooms/${roomId}/photos`)
    return response.data
  },

  uploadPhoto: async (roomId: string, imageBase64: string): Promise<ApiResponse<Photo>> => {
    const response = await api.post(`/rooms/${roomId}/photos`, { image_base64: imageBase64 })
    return response.data
  },

  getPhoto: async (photoId: string): Promise<ApiResponse<PhotoDetail>> => {
    const response = await api.get(`/photos/${photoId}`)
    return response.data
  },

  deletePhoto: async (photoId: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.delete(`/photos/${photoId}`)
    return response.data
  },
}

export const tagApi = {
  createTag: async (data: { photo_id: string; x: number; y: number; content: string }): Promise<ApiResponse<Tag>> => {
    const response = await api.post('/tags', data)
    return response.data
  },

  deleteTag: async (tagId: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.delete(`/tags/${tagId}`)
    return response.data
  },

  getPhotoTags: async (photoId: string): Promise<ApiResponse<Tag[]>> => {
    const response = await api.get(`/photos/${photoId}/tags`)
    return response.data
  },
}

import type { Tag } from '../types'
