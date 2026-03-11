import api, { apiCall } from './index'
import type { ApiResponse, Room, RoomMember } from '../types'

export const roomApi = {
  getRooms: async (): Promise<ApiResponse<Room[]>> => {
    return apiCall(api.get('/rooms'))
  },

  getPublicRooms: async (): Promise<ApiResponse<Room[]>> => {
    return apiCall(api.get('/rooms/public'))
  },

  createRoom: async (data: { name: string; description?: string; is_public?: boolean }): Promise<ApiResponse<Room>> => {
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

  joinPublicRoom: async (roomId: string): Promise<ApiResponse<{ message: string; room_id: string }>> => {
    return apiCall(api.post('/rooms/join-public', { room_id: roomId }))
  },

  approveMember: async (roomId: string, userId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiCall(api.post(`/rooms/${roomId}/members/${userId}/approve`))
  },

  rejectMember: async (roomId: string, userId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiCall(api.post(`/rooms/${roomId}/members/${userId}/reject`))
  },
}
