import type { ActionPayload } from '@a2ui/web_core'

const str = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : ''
const num = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

/**
 * A2UI action -> 一条真实用户消息。
 *
 * 当前聊天传输层只接受文本，所以在渲染器边界把标准 ActionPayload
 * 适配成自然语言请求；动作名和上下文仍然来自卡片，模型不能伪造。
 */
export const sts2ActionPrompt = (action: ActionPayload): string | null => {
  const ctx = action.context ?? {}
  switch (action.name) {
    case 'sts2.analyze_run': {
      const runId = num(ctx.run_id)
      if (runId === undefined) {
        return null
      }
      const player = str(ctx.player_name)
      const ascension = num(ctx.ascension)
      const floor = num(ctx.floor_reached)
      const result =
        ctx.is_victory === true ? '胜利' : ctx.abandoned === true ? '放弃' : '失败'
      const facts = [
        player ? `玩家 ${player}` : '',
        ascension !== undefined ? `A${ascension}` : '',
        result,
        floor !== undefined ? `${floor} 层` : '',
      ]
        .filter(Boolean)
        .join('，')
      return [
        `请分析对局 #${runId}${facts ? `（${facts}）` : ''}。`,
        '先调用 sts2_query 的 run 命令获取完整数据，然后说明：',
        '1. 这局的关键转折点；',
        '2. 胜利或失败的主要原因；',
        '3. 2-3 个可以改进的决策。',
        '不要重复卡片里已有的表格。',
      ].join('\n')
    }
    case 'sts2.open_run': {
      const runId = num(ctx.run_id)
      return runId === undefined
        ? null
        : `请查询并展示对局 #${runId} 的详细数据，重点看战斗记录、最终遗物和死因。`
    }
    case 'sts2.open_profile': {
      const name = str(ctx.name)
      return name ? `请查询玩家 ${name} 的杀戮尖塔 2 档案并展示。` : null
    }
    case 'sts2.analyze_profile': {
      const name = str(ctx.name)
      if (!name) {
        return null
      }
      return [
        `请分析玩家 ${name} 的杀戮尖塔 2 打法。`,
        '先调用 sts2_query 的 player-profile 命令，然后说明：',
        '1. 最强的 2-3 项能力；',
        '2. 最明显的短板；',
        '3. 角色偏好和近期趋势；',
        '4. 2-3 条具体提升建议。',
      ].join('\n')
    }
    case 'sts2.analyze_character': {
      const character = str(ctx.character) || '全部角色'
      const board = ctx.board === 'relics' ? '遗物' : '卡牌'
      return `请分析 ${character} 在当前版本的${board}环境：强势选择、陷阱选择，以及和社区平均水平的差距。先调用 sts2_query 获取最新排名。`
    }
    case 'sts2.analyze_meta': {
      return '请分析当前版本的环境总览：整体胜率、角色强弱、常见死因和高伤害遭遇，并指出 2-3 个最值得注意的趋势。先调用 sts2_query 的 overview 命令。'
    }
    default:
      return null
  }
}
