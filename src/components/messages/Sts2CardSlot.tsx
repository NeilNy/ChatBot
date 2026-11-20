import { useSts2Cards } from './Sts2CardContext.js'
import { Sts2Surface } from './Sts2Surface.js'

/** 模型在正文里输出的 [[sts2-card:<id>]] 会变成这个 A2UI surface；是否展示由模型决定 */
export const Sts2CardSlot = ({ id }: { id: string }) => {
  const { cards, sessionId } = useSts2Cards()
  const card = cards.find((item) => item.id === id)
  return card ? <Sts2Surface card={card} sessionId={sessionId} /> : null
}
