import { useMemo } from 'react'
import { z } from 'zod'
import { createComponentImplementation, type ReactCatalogComponent } from '@a2ui/react'
import { Catalog } from '@a2ui/web_core'
import { CommonSchemas } from '@a2ui/web_core/v1_0'
import { useSettings } from '../settings.js'
import {
  Sts2CardView,
  type Sts2CardAction,
} from '../../components/messages/Sts2CardView.js'
import type {
  Sts2CardsData,
  Sts2OverviewData,
  Sts2Profile,
  Sts2RelicsData,
  Sts2RunData,
} from '../api/sts2.js'

/**
 * STS2 卡片目录。协议版本固定为 A2UI 1.0；catalogId 同时是前后端共享的目录标识。
 * 目录只暴露固定组件，模型不能输出 HTML/CSS，也不能创建目录之外的组件。
 */
export const STS2_CATALOG_ID = 'https://agent.cornhub.art/a2ui/catalogs/sts2/v1/catalog.json'

const ActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  labelEn: z.string().optional(),
  tone: z.enum(['primary', 'ghost']).optional(),
  action: CommonSchemas.Action,
})

const CardBase = {
  level: CommonSchemas.DynamicNumber,
  data: z.record(z.string(), z.unknown()),
  actions: z.array(ActionSchema).optional(),
}

type CardProps = {
  level: number
  data: Record<string, unknown>
  actions?: {
    id: string
    label: string
    labelEn?: string
    tone?: 'primary' | 'ghost'
    action: () => Promise<void>
  }[]
  setLevel?: (value: number) => void
}

const clampLevel = (value: number): 1 | 2 | 3 =>
  value >= 3 ? 3 : value >= 2 ? 2 : 1

const useActions = (
  actions: CardProps['actions']
): Sts2CardAction[] => {
  const locale = useSettings((state) => state.locale)
  return useMemo(
    () =>
      (actions ?? []).map((item) => ({
        id: item.id,
        label: locale === 'en-US' ? item.labelEn ?? item.label : item.label,
        tone: item.tone,
        onSelect: () => {
          void item.action()
        },
      })),
    [actions, locale]
  )
}

const useCard = (props: CardProps) => {
  const actions = useActions(props.actions)
  const level = clampLevel(props.level)
  return {
    level,
    actions,
    onLevelChange: props.setLevel
      ? (next: 1 | 2 | 3) => props.setLevel?.(next)
      : undefined,
  }
}

const ProfileCard = createComponentImplementation(
  {
    name: 'Sts2ProfileCard',
    schema: z.object(CardBase),
    description: '杀戮尖塔 2 玩家档案卡，展示胜率、纪录、角色与近期对局。',
  },
  ({ props }) => {
    const card = useCard(props as CardProps)
    return (
      <Sts2CardView
        template="profile"
        level={card.level}
        data={props.data as Sts2Profile}
        onLevelChange={card.onLevelChange}
        actions={card.actions}
      />
    )
  }
)

const CardsCard = createComponentImplementation(
  {
    name: 'Sts2CardsCard',
    schema: z.object(CardBase),
    description: '杀戮尖塔 2 卡牌排名卡，展示 Pick/Hold/WR/Delta 与卡牌详情。',
  },
  ({ props }) => {
    const card = useCard(props as CardProps)
    return (
      <Sts2CardView
        template="cards"
        level={card.level}
        data={props.data as Sts2CardsData}
        onLevelChange={card.onLevelChange}
        actions={card.actions}
      />
    )
  }
)

const RelicsCard = createComponentImplementation(
  {
    name: 'Sts2RelicsCard',
    schema: z.object(CardBase),
    description: '杀戮尖塔 2 遗物排名卡，展示持有率、Pick/WR 与遗物详情。',
  },
  ({ props }) => {
    const card = useCard(props as CardProps)
    return (
      <Sts2CardView
        template="relics"
        level={card.level}
        data={props.data as Sts2RelicsData}
        onLevelChange={card.onLevelChange}
        actions={card.actions}
      />
    )
  }
)

const RunCard = createComponentImplementation(
  {
    name: 'Sts2RunCard',
    schema: z.object(CardBase),
    description: '杀戮尖塔 2 单局详情卡，展示结果、死因、战斗记录与最终遗物。',
  },
  ({ props }) => {
    const card = useCard(props as CardProps)
    return (
      <Sts2CardView
        template="run"
        level={card.level}
        data={props.data as Sts2RunData}
        onLevelChange={card.onLevelChange}
        actions={card.actions}
      />
    )
  }
)

const OverviewCard = createComponentImplementation(
  {
    name: 'Sts2OverviewCard',
    schema: z.object(CardBase),
    description: '杀戮尖塔 2 环境总览卡，展示总局数、胜率、角色分布与常见死因。',
  },
  ({ props }) => {
    const card = useCard(props as CardProps)
    return (
      <Sts2CardView
        template="overview"
        level={card.level}
        data={props.data as Sts2OverviewData}
        onLevelChange={card.onLevelChange}
        actions={card.actions}
      />
    )
  }
)

export const STS2_COMPONENTS: ReactCatalogComponent[] = [
  ProfileCard,
  CardsCard,
  RelicsCard,
  RunCard,
  OverviewCard,
]

export const sts2Catalog = new Catalog<ReactCatalogComponent>(
  STS2_CATALOG_ID,
  '1.0',
  STS2_COMPONENTS,
  [],
  undefined,
  'Render Slay the Spire 2 analytics with the fixed Sts2*Card components. Never emit raw HTML or CSS.'
)
