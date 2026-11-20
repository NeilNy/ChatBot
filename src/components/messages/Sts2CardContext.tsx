import { createContext, useContext, type ReactNode } from 'react'
import type { Sts2CardPart } from '../../services/chat/types.js'

type Sts2CardsValue = {
  cards: readonly Sts2CardPart[]
  /** 卡片动作要回到当前会话，作为一条新的用户消息继续对话。 */
  sessionId: string
}

const Sts2CardsContext = createContext<Sts2CardsValue>({ cards: [], sessionId: '' })

export const Sts2CardProvider = ({
  cards,
  sessionId,
  children,
}: {
  cards: readonly Sts2CardPart[]
  sessionId: string
  children: ReactNode
}) => (
  <Sts2CardsContext.Provider value={{ cards, sessionId }}>
    {children}
  </Sts2CardsContext.Provider>
)

export const useSts2Cards = () => useContext(Sts2CardsContext)
