import api from './index'
import type { ApiResponse, Room, RoomMember } from '../types'

export const roomApi = {
  getRooms: async (): Promise<ApiResponse<Room[]>> => {
    const response = await api.get('/rooms')
    return response.data
  },

  createRoom: async (data: { name: string; description?: string }): Promise<ApiResponse<Room>> => {
    const response = await api.post('/rooms', data)
    return response.data
  },

  getRoom: async (roomId: string): Promise<ApiResponse<Room>> => {
    const response = await api.get(`/rooms/${roomId}`)
    return response.data
  },

  updateRoom: async (roomId: string, data: Partial<Room>): Promise<ApiResponse<Room>> => {
    const response = await api.put(`/rooms/${roomId}`, data)
    return response.data
  },

  joinRoom: async (inviteCode: string): Promise<ApiResponse<Room>> => {
    const response = await api.post('/rooms/join', { invite_code: inviteCode })
    return response.data
  },

  getRoomMembers: async (roomId: string): Promise<ApiResponse<RoomMember[]>> => {
    const response = await api.get(`/rooms/${roomId}/members`)
    return response.data
  },

  kickMember: async (roomId: string, userId: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.delete(`/rooms/${roomId}/members/${userId}`)
    return response.data
  },

  leaveRoom: async (roomId: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.post(`/rooms/${roomId}/leave`)
    return response.data
  },
}
