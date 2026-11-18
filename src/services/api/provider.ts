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

/** OpenCode Go 不支持 Files API，附件改走图片 base64 内联；文档/语音入口隐藏 */
export const SUPPORTS_ATTACHMENTS = true
export const SUPPORTS_DOCUMENTS = true
export const SUPPORTS_SEARCH = true
export const SUPPORTS_SPEECH = !IS_OPENCODE

/** 由反向代理注入密钥时，设置里不展示、也不允许修改 API Key */
export const SHOW_API_KEY_SETTINGS = !API_PROVIDER.proxyMode

/** 同源搜索代理地址，开发环境由 rspack devServer 代理 */
export const SEARCH_URL = `${API_PROVIDER.origin}/search`

/** 杀戮尖塔 2 数据查询工具：前端调用本地 /sts2，执行 sts2-analytics 白名单命令 */
export const CLIENT_STS2_TOOL: ClientTool = {
  name: 'sts2_query',
  description:
    '查询杀戮尖塔2（Slay the Spire 2）Skada Analytics 数据。' +
    'command=cards 查卡牌排名，command=relics 查遗物排名，command=overview 查总览，' +
    'command=versions 查可用版本。问某玩家战绩/档案时直接用 command=player-profile 并传 name，不要先 player-search。' +
    '角色用 IRONCLAD/SILENT/DEFECT/REGENT/NECROBINDER；' +
    '排序用 skada_score/win_rate_picked/win_rate_skipped/delta/pick_rate/hold_rate。' +
    '查询结果会自动在回答下方展示固定卡片；请用 2-3 句话总结，不要重复表格或生成 HTML。',
  input_schema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: [
          'overview',
          'cards',
          'card',
          'relics',
          'monsters',
          'curses',
          'upgrades',
          'encounters',
          'leaderboard',
          'player-search',
          'player-profile',
          'run',
          'versions',
        ],
        description: '要执行的查询命令',
      },
      character: {
        type: 'string',
        enum: ['IRONCLAD', 'SILENT', 'DEFECT', 'REGENT', 'NECROBINDER'],
        description: '角色过滤',
      },
      sort: {
        type: 'string',
        enum: [
          'skada_score',
          'win_rate_picked',
          'win_rate_skipped',
          'delta',
          'pick_rate',
          'hold_rate',
        ],
        description: '排序字段',
      },
      page_size: { type: 'integer', description: '每页条数，建议 5-20' },
      page: { type: 'integer', description: '页码，从 1 开始' },
      asc_min: { type: 'integer', description: '最低进阶等级' },
      asc_max: { type: 'integer', description: '最高进阶等级' },
      version: { type: 'string', description: '游戏版本，如 v0.113；不确定时先查 versions' },
      name: { type: 'string', description: '卡牌名或玩家名，用于 card / player-search / player-profile' },
      run_id: { type: 'integer', description: '对局 ID，用于 command=run' },
      type: {
        type: 'string',
        enum: ['normal', 'elite', 'boss', 'event', 'shop', 'rest'],
        description: 'encounters 的节点类型',
      },
      mode: {
        type: 'string',
        enum: ['STANDARD', 'CUSTOM'],
        description: '游戏模式',
      },
    },
    required: ['command'],
  },
}

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
