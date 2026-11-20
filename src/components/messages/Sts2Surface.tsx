import { useEffect, useRef, useState } from 'react'
import { A2uiSurface, type ReactCatalogComponent } from '@a2ui/react'
import {
  MessageProcessor,
  type ActionPayload,
  type SurfaceModel,
} from '@a2ui/web_core'
import { sts2ActionPrompt } from '../../services/a2ui/actions.js'
import { sts2Catalog } from '../../services/a2ui/catalog.js'
import { buildSts2SurfaceMessages } from '../../services/a2ui/messages.js'
import { sendPrompt } from '../../services/chat/store.js'
import type { Sts2CardPart } from '../../services/chat/types.js'
import styles from './Sts2Surface.module.css'

/**
 * 一张 STS2 卡片 = 一个 A2UI 1.0 surface。
 *
 * 工具结果先在客户端确定性编译成 createSurface 消息，再交给官方
 * A2UI React renderer；组件、数据绑定和动作都走协议，不再直接渲染
 * 业务 React 组件。卡片层级写入 dataModel 的 /level，切换层级是
 * 本地数据模型更新，不触发模型请求。
 */
export const Sts2Surface = ({
  card,
  sessionId,
}: {
  card: Sts2CardPart
  sessionId: string
}) => {
  const [surface, setSurface] = useState<SurfaceModel<ReactCatalogComponent> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cardRef = useRef(card)
  cardRef.current = card

  useEffect(() => {
    let active = true
    setSurface(null)
    setError(null)

    const processor = new MessageProcessor<ReactCatalogComponent>(
      [sts2Catalog],
      (action: ActionPayload) => {
        const prompt = sts2ActionPrompt(action)
        if (prompt) {
          // 卡片动作天然属于杀戮尖塔场景：即使用户随后关掉了开关，
          // 这次动作仍要声明 sts2_query，否则模型无法取到分析所需数据。
          sendPrompt(sessionId, prompt, { sts2: true })
        }
      },
      {
        reportErrorsOnly: true,
        errorHandler: (payload) => {
          if (active) {
            setError(payload.error.message)
          }
        },
      }
    )

    try {
      processor.processMessages(buildSts2SurfaceMessages(cardRef.current))
      const next = processor.model.getSurface(cardRef.current.id)
      if (!next) {
        throw new Error('A2UI surface 没有创建成功')
      }
      const subscription = next.onError.subscribe((payload) => {
        if (active) {
          setError(payload.message)
        }
      })
      if (active) {
        setSurface(next)
      }
      return () => {
        active = false
        subscription.unsubscribe()
        processor.dispose()
      }
    } catch (cause) {
      if (active) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
      return () => {
        active = false
        processor.dispose()
      }
    }
  }, [card.id, card.template, card.level, sessionId])

  if (error) {
    return <div className={styles.error}>卡片渲染失败：{error}</div>
  }

  return surface ? <A2uiSurface surface={surface} /> : null
}
