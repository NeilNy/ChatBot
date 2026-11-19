import { createContext, useContext, type ReactNode } from 'react'
import type { Sts2CardPart } from '../../services/chat/types.js'

const Sts2CardsContext = createContext<readonly Sts2CardPart[]>([])

export const Sts2CardProvider = ({
  cards,
  children,
}: {
  cards: readonly Sts2CardPart[]
  children: ReactNode
}) => <Sts2CardsContext.Provider value={cards}>{children}</Sts2CardsContext.Provider>

export const useSts2Cards = () => useContext(Sts2CardsContext)
