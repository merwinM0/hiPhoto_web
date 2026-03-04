import api from './index'
import type { ApiResponse, AuthResponse, User } from '../types'

export const authApi = {
  register: async (email: string, password: string): Promise<ApiResponse<{ message: string; email: string }>> => {
    const response = await api.post('/auth/register', { email, password })
    return response.data
  },

  verifyEmail: async (email: string, code: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.post('/auth/verify', { email, code })
    return response.data
  },

  login: async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  resendVerification: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.post('/auth/resend', { email })
    return response.data
  },
}

export const userApi = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await api.get('/user/profile')
    return response.data
  },

  updateProfile: async (data: { username?: string; bio?: string }): Promise<ApiResponse<User>> => {
    const response = await api.put('/user/profile', data)
    return response.data
  },
}
