/**
 * 会话 ID 与地址栏同步。
 *
 * 采用和 DeepSeek 官网一致的路径格式：/a/chat/s/<session-id>。
 * 静态托管下需要 nginx 把未知路径回退到 index.html，并使用绝对资源前缀。
 */

const SESSION_PATH = /^\/a\/chat\/s\/([^/]+)\/?$/

/** 从当前地址解析会话 ID；不是会话路径时返回 null */
export const sessionIdFromLocation = (): string | null => {
  const match = SESSION_PATH.exec(window.location.pathname)
  if (!match) {
    return null
  }
  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

/** 把当前会话写进地址栏；replace 用于初始化或纠正无效链接 */
export const writeSessionUrl = (id: string | null, replace = false): void => {
  const path = id === null ? '/' : `/a/chat/s/${encodeURIComponent(id)}`
  if (window.location.pathname === path) {
    return
  }
  const state = { sessionId: id }
  if (replace) {
    window.history.replaceState(state, '', path)
  } else {
    window.history.pushState(state, '', path)
  }
}
