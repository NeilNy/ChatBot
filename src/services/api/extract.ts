import { request } from './client.js'
import { API_PROVIDER } from './provider.js'
import type { ExtractedFile } from '../extractedFiles.js'

/** 文档提取代理：POST /extract，multipart 上传，返回纯文本 */
export const extractFile = async (
  file: Blob,
  name: string,
  signal?: AbortSignal
): Promise<ExtractedFile> => {
  const form = new FormData()
  form.append('file', file, name)
  const response = await request(`${API_PROVIDER.origin}/extract`, {
    method: 'POST',
    body: form,
    signal,
  })
  const body = (await response.json()) as {
    text?: unknown
    truncated?: unknown
  }
  return {
    text: typeof body.text === 'string' ? body.text : '',
    truncated: body.truncated === true,
  }
}
