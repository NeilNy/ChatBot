import { memo, useMemo } from 'react'
import type { Source } from '../../services/chat/view.js'
import type { Sts2CardPart } from '../../services/chat/types.js'
import { toMdAst } from '../../services/markdown/parse.js'
import { useScrollToBottom } from '../messages/scrollContext.js'
import { MarkdownAstRenderer } from './MarkdownAstRenderer.js'
import { useThrottleMarkdownRender } from './useThrottleMarkdownRender.js'
import './markdown.css'
import './highlight.css'

/**
 * 渲染链路：节流 → 解析 AST → 渲染。
 * 传入 sources 时把正文里的 [citation:N] 渲染为角标。
 */
export const Markdown = memo(function Markdown({
  content,
  loading,
  cacheKey,
  className,
  disableLink,
  sources,
  cards = [],
  sessionId = '',
}: {
  content: string
  loading: boolean
  cacheKey: string
  className?: string
  disableLink: boolean
  sources?: Source[]
  cards?: readonly Sts2CardPart[]
  sessionId?: string
}) {
  const scrollToBottom = useScrollToBottom()
  const throttledMarkdown = useThrottleMarkdownRender(content, loading)
  const ast = useMemo(() => {
    if (!throttledMarkdown) {
      return null
    }
    // 模型用 [[sts2-card:<id>]] 决定是否展示卡片；转成块级 fence 交给渲染器查表
    const content = throttledMarkdown.replace(
      /\[\[sts2-card:([^\]\s]+)\]\]/g,
      (_, id: string) => `\n\n\`\`\`sts2-card\n${id}\n\`\`\`\n\n`
    )
    return toMdAst(content, { sources, disableLink })
  }, [throttledMarkdown, sources, disableLink])
  return ast ? (
    <MarkdownAstRenderer
      key={cacheKey}
      className={className}
      ast={ast}
      loading={loading}
      cards={cards}
      sessionId={sessionId}
      onUpdate={scrollToBottom}
    />
  ) : null
})
