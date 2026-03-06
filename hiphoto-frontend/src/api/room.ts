import api, { apiCall } from './index'
import type { ApiResponse, Room, RoomMember } from '../types'

export const roomApi = {
  getRooms: async (): Promise<ApiResponse<Room[]>> => {
    return apiCall(api.get('/rooms'))
  },

  createRoom: async (data: { name: string; description?: string }): Promise<ApiResponse<Room>> => {
    return apiCall(api.post('/rooms', data))
  },

  getRoom: async (roomId: string): Promise<ApiResponse<Room>> => {
    return apiCall(api.get(`/rooms/${roomId}`))
  },

  updateRoom: async (roomId: string, data: Partial<Room>): Promise<ApiResponse<Room>> => {
    return apiCall(api.put(`/rooms/${roomId}`, data))
  },

  joinRoom: async (inviteCode: string): Promise<ApiResponse<Room>> => {
    return apiCall(api.post('/rooms/join', { invite_code: inviteCode }))
  },

  getRoomMembers: async (roomId: string): Promise<ApiResponse<RoomMember[]>> => {
    return apiCall(api.get(`/rooms/${roomId}/members`))
  },

  kickMember: async (roomId: string, userId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiCall(api.delete(`/rooms/${roomId}/members/${userId}`))
  },

  leaveRoom: async (roomId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiCall(api.post(`/rooms/${roomId}/leave`))
  },
}
