import { request } from './client.js'
import { API_PROVIDER } from './provider.js'

export type Sts2Character = {
  character?: string
  display_name?: { en?: string; zh?: string }
  runs?: number
  wins?: number
  win_rate?: number
  avg_floor?: number
  avg_ascension?: number
  max_ascension_victory?: number
}

export type Sts2Run = {
  run_id?: number
  character?: string
  display_name?: { en?: string; zh?: string }
  ascension?: number
  is_victory?: boolean
  abandoned?: boolean
  death_cause?: string
  floor_reached?: number
  duration_sec?: number
  game_version?: string
  created_at?: string
}

export type Sts2Profile = {
  player_name?: string
  summary?: {
    total_runs?: number
    victories?: number
    defeats?: number
    abandoned?: number
    win_rate?: number
    avg_floor?: number
    avg_ascension?: number
    avg_duration_sec?: number
    max_ascension_victory?: number
    first_run?: string
    last_run?: string
    days_active?: number
  }
  characters?: Sts2Character[]
  percentiles?: {
    win_rate?: number
    avg_floor?: number
    speed?: number
    total_players?: number
    avg_dpt?: number
    avg_block?: number
  }
  records?: {
    fastest_win_sec?: number
    fastest_win_run_id?: number
    max_hit?: number
    max_hit_run_id?: number
    best_dpt?: number
    best_dpt_run_id?: number
    highest_ascension_victory?: number
  }
  recent_runs?: Sts2Run[]
  radar?: {
    player?: Record<string, number>
    community?: Record<string, number>
  }
  growth?: {
    month?: string
    runs?: number
    wins?: number
    win_rate?: number
    avg_floor?: number
    avg_ascension?: number
  }[]
}

export type Sts2Result = {
  ok: boolean
  text: string
  data?: Sts2Profile
}

/** 调用本地 /sts2 代理执行白名单命令（sts2-analytics 脚本） */
export const querySts2 = async (
  command: string,
  args: string[],
  signal?: AbortSignal
): Promise<Sts2Result> => {
  const response = await request(`${API_PROVIDER.origin}/sts2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, args }),
    signal,
  })
  const body = (await response.json()) as {
    ok?: unknown
    text?: unknown
    data?: unknown
  }
  return {
    ok: body.ok === true,
    text: typeof body.text === 'string' ? body.text : '',
    data:
      typeof body.data === 'object' && body.data !== null
        ? (body.data as Sts2Profile)
        : undefined,
  }
}
