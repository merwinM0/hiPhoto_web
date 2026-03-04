import api from './index'
import type { ApiResponse, ScoreRound, Score } from '../types'

export const scoreApi = {
  submitScore: async (data: { photo_id: string; criteria_type: string; score: number }): Promise<ApiResponse<Score>> => {
    const response = await api.post('/scores', data)
    return response.data
  },

  getScoreboard: async (roomId: string): Promise<ApiResponse<ScoreRound>> => {
    const response = await api.get(`/rooms/${roomId}/scoreboard`)
    return response.data
  },

  endRound: async (roomId: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.post(`/rooms/${roomId}/end-round`)
    return response.data
  },

  startNewRound: async (roomId: string): Promise<ApiResponse<{ message: string; round_number: number }>> => {
    const response = await api.post(`/rooms/${roomId}/new-round`)
    return response.data
  },
}
