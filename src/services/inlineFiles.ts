/**
 * OpenCode Go 图片的内联缓存。
 *
 * 网关没有 Files API，图片以 base64 直接放进 Messages 请求；
 * 这里按 serverId 缓存编码结果，避免每轮对话重复读取 IndexedDB。
 */

export type InlineFile = {
  mediaType: string
  data: string
}

/** 只缓存最近使用的若干张，淘汰后可从 IndexedDB 重新编码 */
const MAX_INLINE_FILES = 24
const files = new Map<string, InlineFile>()

export const setInlineFile = (serverId: string, file: InlineFile): void => {
  files.delete(serverId)
  files.set(serverId, file)
  if (files.size > MAX_INLINE_FILES) {
    const oldest = files.keys().next().value
    if (oldest !== undefined) {
      files.delete(oldest)
    }
  }
}

export const getInlineFile = (serverId: string): InlineFile | undefined =>
  files.get(serverId)
