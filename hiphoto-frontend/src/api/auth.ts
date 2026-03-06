import api, { apiCall } from './index'
import type { ApiResponse, AuthResponse, User } from '../types'

export const authApi = {
  register: async (email: string, password: string): Promise<ApiResponse<{ message: string; email: string }>> => {
    return apiCall(api.post('/auth/register', { email, password }))
  },

  verifyEmail: async (email: string, code: string): Promise<ApiResponse<{ message: string }>> => {
    return apiCall(api.post('/auth/verify', { email, code }))
  },

  login: async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
    return apiCall(api.post('/auth/login', { email, password }))
  },

  resendVerification: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    return apiCall(api.post('/auth/resend', { email }))
  },
}

export const userApi = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    return apiCall(api.get('/user/profile'))
  },

  updateProfile: async (data: { username?: string; bio?: string }): Promise<ApiResponse<User>> => {
    return apiCall(api.put('/user/profile', data))
  },
}
