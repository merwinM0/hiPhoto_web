import api, { apiCall } from './index'
import type { ApiResponse, Photo, PhotoDetail, Tag } from '../types'

export const photoApi = {
  getRoomPhotos: async (roomId: string): Promise<ApiResponse<Photo[]>> => {
    return apiCall(api.get(`/rooms/${roomId}/photos`))
  },

  uploadPhoto: async (roomId: string, imageBase64: string): Promise<ApiResponse<Photo>> => {
    return apiCall(api.post(`/rooms/${roomId}/photos`, { image_base64: imageBase64 }))
  },

  getPhoto: async (photoId: string): Promise<ApiResponse<PhotoDetail>> => {
    return apiCall(api.get(`/photos/${photoId}`))
  },

  deletePhoto: async (photoId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiCall(api.delete(`/photos/${photoId}`))
  },
}

export const tagApi = {
  createTag: async (data: { photo_id: string; x: number; y: number; content: string }): Promise<ApiResponse<Tag>> => {
    return apiCall(api.post('/tags', data))
  },

  deleteTag: async (tagId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiCall(api.delete(`/tags/${tagId}`))
  },

  getPhotoTags: async (photoId: string): Promise<ApiResponse<Tag[]>> => {
    return apiCall(api.get(`/photos/${photoId}/tags`))
  },
}
