export interface ActionComment {
  id: string
  action_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  profile?: {
    id: string
    email: string | null
    name: string | null
    avatar_url?: string | null
  }
}

export interface TimelineComment {
  id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  action_id?: string
  vision_id?: string
  reality_id?: string
  profile?: {
    id: string
    email: string | null
    name: string | null
    avatar_url?: string | null
  }
}
