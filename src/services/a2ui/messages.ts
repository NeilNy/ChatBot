import type { AgentToRendererMessage } from '@a2ui/web_core/v1_0'
import type {
  Sts2CardLevel,
  Sts2CardsData,
  Sts2OverviewData,
  Sts2Profile,
  Sts2RelicsData,
  Sts2RunData,
} from '../api/sts2.js'
import type { Sts2CardPart } from '../chat/types.js'
import { STS2_CATALOG_ID } from './constants.js'

type CardAction = {
  id: string
  label: string
  labelEn: string
  tone?: 'primary' | 'ghost'
  action: {
    event: {
      name: string
      context: Record<string, unknown>
    }
  }
}

const action = (
  id: string,
  label: string,
  labelEn: string,
  name: string,
  context: Record<string, unknown> = {},
  tone?: 'primary' | 'ghost'
): CardAction => ({
  id,
  label,
  labelEn,
  tone,
  action: { event: { name, context } },
})

const nameOf = (value?: { zh?: string; en?: string }) => value?.zh ?? value?.en

const templateComponent = {
  profile: 'Sts2ProfileCard',
  cards: 'Sts2CardsCard',
  relics: 'Sts2RelicsCard',
  run: 'Sts2RunCard',
  overview: 'Sts2OverviewCard',
} as const

const buildActions = (card: Sts2CardPart): CardAction[] => {
  if (card.template === 'run') {
    const data = card.data as Sts2RunData
    const run = data.run
    const runId = run?.run_id
    const player = run?.player_name ?? nameOf(run?.display_name)
    const actions: CardAction[] = []
    if (typeof runId === 'number') {
      actions.push(
        action(
          'analyze-run',
          '分析这局',
          'Analyze run',
          'sts2.analyze_run',
          {
            run_id: runId,
            player_name: player,
            ascension: run?.ascension,
            is_victory: run?.is_victory,
            abandoned: run?.abandoned,
            floor_reached: run?.floor_reached,
          },
          'primary'
        )
      )
    }
    if (player) {
      actions.push(
        action('open-profile', '玩家档案', 'Player profile', 'sts2.open_profile', {
          name: player,
        })
      )
    }
    return actions
  }

  if (card.template === 'profile') {
    const data = card.data as Sts2Profile
    const player = data.player_name
    const latest = data.recent_runs?.find((run) => typeof run.run_id === 'number')
    const actions: CardAction[] = []
    if (player) {
      actions.push(
        action(
          'analyze-profile',
          '分析我的打法',
          'Analyze my play',
          'sts2.analyze_profile',
          { name: player },
          'primary'
        )
      )
    }
    if (latest?.run_id) {
      actions.push(
        action('open-latest-run', '最近一局', 'Latest run', 'sts2.open_run', {
          run_id: latest.run_id,
          player_name: player,
        })
      )
    }
    return actions
  }

  if (card.template === 'cards' || card.template === 'relics') {
    const data = card.data as Sts2CardsData | Sts2RelicsData
    const character =
      nameOf(data.character_filter_name) ?? (card.template === 'cards' ? '全部角色' : '全部角色')
    return [
      action(
        'analyze-character',
        '分析这个角色',
        'Analyze character',
        'sts2.analyze_character',
        {
          character,
          board: card.template,
        },
        'primary'
      ),
    ]
  }

  const data = card.data as Sts2OverviewData
  return [
    action(
      'analyze-meta',
      '分析当前环境',
      'Analyze meta',
      'sts2.analyze_meta',
      {
        total_runs: data.total_runs,
        win_rate: data.win_rate,
      },
      'primary'
    ),
  ]
}

/**
 * 把工具返回的固定卡片编译成 A2UI 1.0 消息。
 *
 * 这是确定性的编译：模型只决定“显不显示卡片”，不直接生成组件树。
 * 卡片数据仍然来自 STS2 工具结果，因此不会出现模型编造数值的问题。
 */
export const buildSts2SurfaceMessages = (
  card: Sts2CardPart
): AgentToRendererMessage[] => {
  const components = [
    {
      id: 'root',
      component: templateComponent[card.template],
      level: { '@path': '/level' },
      data: card.data,
      actions: buildActions(card),
    },
  ]
  return [
    {
      version: '1.0',
      createSurface: {
        surfaceId: card.id,
        catalogId: STS2_CATALOG_ID,
        sendDataModel: true,
        components,
        dataModel: {
          level: card.level satisfies Sts2CardLevel,
        },
      },
    },
  ]
}
