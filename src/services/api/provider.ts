/**
 * 构建期注入的 API 服务配置。
 *
 * DeepSeek 走原生 Anthropic 兼容接口（/anthropic/v1），OpenCode Go 走
 * https://opencode.ai/zen/go/v1，并要求每个请求携带 x-opencode-session 头。
 */
export type ApiVendor = 'deepseek' | 'opencode'

export const API_PROVIDER = __API_PROVIDER__

export const IS_OPENCODE = API_PROVIDER.vendor === 'opencode'

/** Anthropic 兼容接口的根地址，如 https://opencode.ai/zen/go/v1 */
export const API_BASE_URL = `${API_PROVIDER.origin}${API_PROVIDER.apiBasePath}`

/** 校验 API Key 的地址，如 https://opencode.ai/zen/go/v1/models */
export const VERIFY_URL = `${API_PROVIDER.origin}${API_PROVIDER.verifyPath}`

/** 默认聊天模型 */
export const DEFAULT_MODEL = API_PROVIDER.model

/** OpenCode Go 不支持 Files API 与 DeepSeek 服务端工具，界面相应隐藏入口 */
export const SUPPORTS_ATTACHMENTS = !IS_OPENCODE
export const SUPPORTS_SEARCH = !IS_OPENCODE
export const SUPPORTS_SPEECH = !IS_OPENCODE

/** 由反向代理注入密钥时，设置里不展示、也不允许修改 API Key */
export const SHOW_API_KEY_SETTINGS = !API_PROVIDER.proxyMode

const SESSION_STORAGE_KEY = 'chat-demo:opencode-session'
let memorySessionId = ''

const createSessionId = (): string => {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replaceAll('-', '')
      : Math.random().toString(16).slice(2).padEnd(32, '0').slice(0, 32)
  return `ses_${random}`
}

/**
 * OpenCode Go 要求 x-opencode-session：同一浏览器保持稳定，便于网关复用会话路由与缓存。
 * 非 OpenCode 环境返回空串，不会写入请求头。
 */
export const opencodeSessionId = (): string => {
  if (!IS_OPENCODE) {
    return ''
  }
  if (memorySessionId) {
    return memorySessionId
  }
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY)
    if (saved) {
      memorySessionId = saved
      return saved
    }
    const id = createSessionId()
    localStorage.setItem(SESSION_STORAGE_KEY, id)
    memorySessionId = id
    return id
  } catch {
    memorySessionId = createSessionId()
    return memorySessionId
  }
}
