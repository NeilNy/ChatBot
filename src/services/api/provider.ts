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

/**
 * OpenCode Go 部署固定使用的模型：DeepSeek V4.1 Flash 1017。
 * 网关的模型 id 为 deepseek-v4.1-flash，canonical id 为 deepseek/deepseek-v4.1-flash-1017。
 */
export const OPENCODE_ONLY_MODEL = 'deepseek-v4.1-flash'

/** 实际用于对话的模型：OpenCode 环境锁定，避免历史记录或构建参数切到其他模型 */
export const CHAT_MODEL = IS_OPENCODE ? OPENCODE_ONLY_MODEL : DEFAULT_MODEL

import type { ClientTool } from './types.js'

/** OpenCode Go 不支持 Files API 与 DeepSeek 服务端工具，附件/语音入口隐藏；搜索改走客户端工具循环 */
export const SUPPORTS_ATTACHMENTS = !IS_OPENCODE
export const SUPPORTS_SEARCH = true
export const SUPPORTS_SPEECH = !IS_OPENCODE

/** 由反向代理注入密钥时，设置里不展示、也不允许修改 API Key */
export const SHOW_API_KEY_SETTINGS = !API_PROVIDER.proxyMode

/** 同源搜索代理地址，开发环境由 rspack devServer 代理 */
export const SEARCH_URL = `${API_PROVIDER.origin}/search`

/** OpenCode Go 的联网搜索工具，由前端执行后把结果回传给模型 */
export const CLIENT_SEARCH_TOOL: ClientTool = {
  name: 'search_web',
  description:
    '联网搜索最新信息，适用于新闻、天气、价格、政策或任何可能近期变化的事实。' +
    '用用户提问的语言返回 1-100 字的搜索词。',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索词，1-100 个字符，只保留核心实体',
      },
    },
    required: ['query'],
  },
}

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
