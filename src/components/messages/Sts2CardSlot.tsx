import { useSts2Cards } from './Sts2CardContext.js'
import { Sts2CardView } from './Sts2CardView.js'

/** 模型在正文里输出的 [[sts2-card:<id>]] 会变成这个槽位；是否展示由模型决定 */
export const Sts2CardSlot = ({ id }: { id: string }) => {
  const cards = useSts2Cards()
  const card = cards.find((item) => item.id === id)
  return card ? (
    <Sts2CardView template={card.template} level={card.level} data={card.data} />
  ) : null
}
