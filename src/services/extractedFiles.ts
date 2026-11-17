/**
 * OpenCode Go 文档附件的提取结果缓存。
 *
 * 网关不支持 document 块，PDF/Word/PPT/Excel/文本会先在服务端提取成纯文本，
 * 这里按 serverId 缓存，避免每轮对话重复解析。
 */

export type ExtractedFile = {
  text: string
  truncated: boolean
}

const MAX_EXTRACTED_FILES = 12
const files = new Map<string, ExtractedFile>()

export const setExtractedFile = (serverId: string, file: ExtractedFile): void => {
  files.delete(serverId)
  files.set(serverId, file)
  if (files.size > MAX_EXTRACTED_FILES) {
    const oldest = files.keys().next().value
    if (oldest !== undefined) {
      files.delete(oldest)
    }
  }
}

export const getExtractedFile = (serverId: string): ExtractedFile | undefined =>
  files.get(serverId)
