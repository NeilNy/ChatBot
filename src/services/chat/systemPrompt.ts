import { IS_OPENCODE } from '../api/provider.js'

/**
 * 内置系统提示词。
 *
 * OpenCode Go 部署需要额外约束两点：
 * - 工具调用时模型容易默认用英文推理，按用户提问语言限制思考语言；
 * - 短消息可能跳过思考，开启深度思考时显式要求先分析再回答。
 */
export const defaultSystemPrompt = (thinking: boolean): string => {
  const base = '该助手为DeepSeek，由深度求索公司创造。'
  if (!IS_OPENCODE) {
    return base
  }
  const language =
    '内部思考使用与用户提问相同的语言：用户用中文提问时，思考过程和最终回答都使用简体中文，不要用英文思考。'
  return thinking
    ? `${base}${language}即使问题很简单，也必须先在思考区写出至少 20 个字的分析并列出判断依据，再回答，不能跳过思考。`
    : `${base}${language}`
}
