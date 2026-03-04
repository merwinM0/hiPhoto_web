import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { authApi, userApi } from './auth'
import { photoApi, tagApi } from './photo'
import { roomApi } from './room'
import { scoreApi } from './score'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：添加 token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
export { authApi, userApi, photoApi, tagApi, roomApi, scoreApi }
