import api, { apiCall } from './index'
import type { ApiResponse, ScoreRound, Score } from '../types'

export const scoreApi = {
  submitScore: async (data: { photo_id: string; criteria_type: string; score: number }): Promise<ApiResponse<Score>> => {
    return apiCall(api.post('/scores', data))
  },

  getUserScoresForPhoto: async (photoId: string): Promise<ApiResponse<Score[]>> => {
    return apiCall(api.get(`/photos/${photoId}/scores`))
  },

  getScoreboard: async (roomId: string): Promise<ApiResponse<ScoreRound>> => {
    return apiCall(api.get(`/rooms/${roomId}/scoreboard`))
  },

  endRound: async (roomId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiCall(api.post(`/rooms/${roomId}/end-round`))
  },

  startNewRound: async (roomId: string): Promise<ApiResponse<{ message: string; round_number: number }>> => {
    return apiCall(api.post(`/rooms/${roomId}/new-round`))
  },
}
