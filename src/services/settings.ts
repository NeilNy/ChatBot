import { create } from 'zustand'
import type { TtsVoice } from './api/speech.js'
import {
  API_PROVIDER,
  isChatModelId,
  isThinkingEffort,
  modelRequiresThinking,
  type ChatModelId,
  type ThinkingEffort,
} from './api/provider.js'
import { normalizeLocation, type UserLocation } from './location.js'

export type Locale = 'zh-CN' | 'en-US'

/** 主题偏好；默认跟随系统 */
export type ThemePreference = 'light' | 'dark' | 'system'

/** 本机设置，存 localStorage：API Key、语言、主题、位置、朗读音色、模型、思考强度与开关、侧边栏收起状态 */
type Settings = {
  apiKey: string | null
  locale: Locale
  themePreference: ThemePreference
  location: UserLocation | null
  ttsVoice: TtsVoice
  chatModel: ChatModelId
  thinkingEffort: ThinkingEffort
  thinking: boolean
  search: boolean
  sts2: boolean
  systemPrompt: string | null
  siderCollapsed: boolean
}

const KEYS = {
  apiKey: 'chat-demo:api-key',
  locale: 'chat-demo:locale',
  location: 'chat-demo:location',
  themePreference: 'chat-demo:theme-preference',
  ttsVoice: 'chat-demo:tts-voice',
  chatModel: 'chat-demo:chat-model',
  thinkingEffort: 'chat-demo:thinking-effort',
  thinking: 'chat-demo:thinking',
  search: 'chat-demo:search',
  sts2: 'chat-demo:sts2',
  systemPrompt: 'chat-demo:system-prompt',
  siderCollapsed: 'chat-demo:sider-collapsed',
} as const

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // 存储不可用时只在内存中生效
  }
}

/** 位置选择模式跟随浏览器语言，与应用内选择的界面语言无关。 */
export const isChineseBrowser = (): boolean =>
  (typeof navigator === 'undefined' ? 'zh' : navigator.language).toLowerCase().startsWith('zh')

const initialLocale = (): Locale => {
  const saved = read(KEYS.locale)
  if (saved === 'zh-CN' || saved === 'en-US') {
    return saved
  }
  return isChineseBrowser() ? 'zh-CN' : 'en-US'
}

const initialLocation = (): UserLocation | null => {
  try {
    const location = normalizeLocation(JSON.parse(read(KEYS.location) ?? 'null'))
    if (!location) {
      return null
    }
    return isChineseBrowser()
      ? location.region === 'CN' && location.province
        ? location
        : null
      : { region: location.region }
  } catch {
    return null
  }
}

/** 未保存过时跟随系统 */
const initialThemePreference = (): ThemePreference => {
  const saved = read(KEYS.themePreference)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

/** 未保存过时使用服务端默认音色 stella（海星） */
const initialTtsVoice = (): TtsVoice => (read(KEYS.ttsVoice) === 'tide' ? 'tide' : 'stella')

/** 只接受网关上的两个模型，其余（含旧值）回到 DeepSeek V4.1 Flash */
const initialChatModel = (): ChatModelId => {
  const saved = read(KEYS.chatModel)
  return isChatModelId(saved) ? saved : 'deepseek-v4.1-flash'
}

/** 思考强度默认高。网关只有 low、high、max。 */
const initialThinkingEffort = (): ThinkingEffort => {
  const saved = read(KEYS.thinkingEffort)
  return isThinkingEffort(saved) ? saved : 'high'
}

/** 自定义系统提示词；空白内容视为未设置 */
const initialSystemPrompt = (): string | null => {
  const saved = read(KEYS.systemPrompt)
  return saved?.trim() ? saved : null
}

/** 代理模式由服务端注入密钥，前端只保留占位值，并清除历史遗留的真实 Key */
const initialApiKey = (): string | null => {
  if (API_PROVIDER.proxyMode) {
    write(KEYS.apiKey, null)
    return 'proxy'
  }
  return read(KEYS.apiKey)
}

const initialModel = initialChatModel()
const initialThinkingOn = modelRequiresThinking(initialModel) || read(KEYS.thinking) === 'true'
if (modelRequiresThinking(initialModel)) {
  write(KEYS.thinking, 'true')
}

export const useSettings = create<Settings>(() => ({
  apiKey: initialApiKey(),
  locale: initialLocale(),
  location: initialLocation(),
  themePreference: initialThemePreference(),
  ttsVoice: initialTtsVoice(),
  chatModel: initialModel,
  thinkingEffort: initialThinkingEffort(),
  thinking: initialThinkingOn,
  search: read(KEYS.search) === 'true',
  sts2: read(KEYS.sts2) === 'true',
  systemPrompt: initialSystemPrompt(),
  siderCollapsed: read(KEYS.siderCollapsed) === 'true',
}))

export const setLocale = (locale: Locale) => {
  write(KEYS.locale, locale)
  useSettings.setState({ locale })
}

export const setLocation = (value: UserLocation | null) => {
  const location = normalizeLocation(value)
  write(KEYS.location, location ? JSON.stringify(location) : null)
  useSettings.setState({ location })
}

export const setThemePreference = (themePreference: ThemePreference) => {
  write(KEYS.themePreference, themePreference)
  useSettings.setState({ themePreference })
}

export const setTtsVoice = (ttsVoice: TtsVoice) => {
  write(KEYS.ttsVoice, ttsVoice)
  useSettings.setState({ ttsVoice })
}

export const setApiKey = (apiKey: string | null) => {
  write(KEYS.apiKey, apiKey)
  useSettings.setState({ apiKey })
}

export const setChatModel = (chatModel: ChatModelId) => {
  write(KEYS.chatModel, chatModel)
  if (modelRequiresThinking(chatModel)) {
    write(KEYS.thinking, 'true')
    useSettings.setState({ chatModel, thinking: true })
    return
  }
  useSettings.setState({ chatModel })
}

export const setThinkingEffort = (thinkingEffort: ThinkingEffort) => {
  write(KEYS.thinkingEffort, thinkingEffort)
  useSettings.setState({ thinkingEffort })
}

export const setThinking = (thinking: boolean) => {
  if (!thinking && modelRequiresThinking(useSettings.getState().chatModel)) {
    return
  }
  write(KEYS.thinking, String(thinking))
  useSettings.setState({ thinking })
}

export const setSearch = (search: boolean) => {
  write(KEYS.search, String(search))
  useSettings.setState({ search })
}

export const setSts2 = (sts2: boolean) => {
  write(KEYS.sts2, String(sts2))
  useSettings.setState({ sts2 })
}

/** 空字符串表示恢复内置默认提示词 */
export const setSystemPrompt = (systemPrompt: string | null) => {
  const value = systemPrompt?.trim() ? systemPrompt : null
  write(KEYS.systemPrompt, value)
  useSettings.setState({ systemPrompt: value })
}

export const setSiderCollapsed = (siderCollapsed: boolean) => {
  write(KEYS.siderCollapsed, String(siderCollapsed))
  useSettings.setState({ siderCollapsed })
}
