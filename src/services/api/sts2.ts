import { request } from './client.js'
import { API_PROVIDER } from './provider.js'

export type Sts2Result = {
  ok: boolean
  text: string
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
  const body = (await response.json()) as { ok?: unknown; text?: unknown }
  return {
    ok: body.ok === true,
    text: typeof body.text === 'string' ? body.text : '',
  }
}
