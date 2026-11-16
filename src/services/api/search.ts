import { request } from './client.js'
import { SEARCH_URL } from './provider.js'

/** 搜索结果：只保留标题、链接、摘要与来源信息 */
export type SearchResult = {
  title: string
  url: string
  snippet: string
  site: string
  logo: string
  published: string
}

const isSearchResult = (value: unknown): value is SearchResult =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as SearchResult).title === 'string' &&
  typeof (value as SearchResult).url === 'string' &&
  typeof (value as SearchResult).snippet === 'string'

/** 调用同源 /search 代理；密钥由 nginx 转发到本机搜索服务，前端不持有 */
export const searchWeb = async (
  query: string,
  signal?: AbortSignal
): Promise<SearchResult[]> => {
  const response = await request(`${SEARCH_URL}?q=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  const body = (await response.json()) as { results?: unknown }
  if (!Array.isArray(body.results)) {
    return []
  }
  return body.results.filter(isSearchResult).map((item) => ({
    title: item.title,
    url: item.url,
    snippet: item.snippet,
    site: typeof item.site === 'string' ? item.site : '',
    logo: typeof item.logo === 'string' ? item.logo : '',
    published: typeof item.published === 'string' ? item.published : '',
  }))
}
