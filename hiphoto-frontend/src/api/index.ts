import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { authApi, userApi } from './auth'
import { photoApi, tagApi } from './photo'
import { roomApi } from './room'
import { scoreApi } from './score'
import type { ApiResponse } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：添加 token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  console.log('API request interceptor - token:', token ? 'present' : 'missing', 'URL:', config.url)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log('Added Authorization header')
  }
  return config
})

// 响应拦截器：处理错误
api.interceptors.response.use(
  (response) => {
    console.log('API response success:', response.config.url, response.status)
    return response
  },
  (error) => {
    console.log('API response error:', error.config?.url, error.response?.status, error.message)
    const isAuthEndpoint = error.config?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && !isAuthEndpoint) {
      const errorMsg = error.response?.data?.error || ''
      const isTokenError = 
        errorMsg.includes('Invalid token') || 
        errorMsg.includes('Missing authorization header') ||
        errorMsg.includes('Invalid authorization header') ||
        errorMsg.includes('expired')
      if (isTokenError) {
        console.log('Token invalid, logging out')
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// 辅助函数：包装API响应
export async function apiCall<T>(promise: Promise<any>): Promise<ApiResponse<T>> {
  try {
    const response = await promise
    return {
      data: response.data
    }
  } catch (error: any) {
    if (error.response?.data?.error) {
      return {
        error: error.response.data.error
      }
    }
    return {
      error: error.message || '请求失败'
    }
  }
}

export default api
export { authApi, userApi, photoApi, tagApi, roomApi, scoreApi }
