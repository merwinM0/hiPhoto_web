// 用户相关类型
export interface User {
  id: string
  email: string
  username: string | null
  bio: string | null
  is_verified: boolean
}

// 房间相关类型
export interface Room {
  id: string
  owner_id: string
  invite_code: string
  name: string
  description: string | null
  upload_limit: number
  scoring_criteria: ScoringCriteria | null
  is_public: boolean
  created_at: string
  member_count: number
  photo_count: number
}

export interface ScoringCriteria {
  criteria: Criterion[]
}

export interface Criterion {
  name: string
  max_score: number
  description: string | null
}

export interface RoomMember {
  user_id: string
  username: string | null
  role: string
  status: string
  photo_count: number
}

// 图片相关类型
export interface Photo {
  id: string
  room_id: string
  uploader_id: string
  uploader_name: string | null
  thumbnail_base64: string
  width: number
  height: number
  created_at: string
  tags: Tag[]
}

export interface PhotoDetail {
  id: string
  room_id: string
  uploader_id: string
  uploader_name: string | null
  image_base64: string
  width: number
  height: number
  created_at: string
  tags: Tag[]
  scores: Score[]
}

// 标签相关类型
export interface Tag {
  id: string
  photo_id: string
  creator_id: string
  creator_name: string | null
  x: number
  y: number
  content: string
  created_at: string
}

// 评分相关类型
export interface Score {
  id: string
  photo_id: string
  voter_id: string
  voter_name: string | null
  criteria_type: string
  score: number
  round_number: number
  created_at: string
}

export interface ScoreBoardEntry {
  photo_id: string
  uploader_name: string | null
  total_score: number
  criteria_scores: Record<string, number>
}

export interface ScoreRound {
  round_number: number
  status: string
  scoreboard: ScoreBoardEntry[]
}

// API 响应类型
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface AuthResponse {
  token: string
  user_id: string
  email: string
  message: string
}
