import type { DialogueTurn, RiskCandidate } from "./types";

/**
 * 简单规则扫描：只负责给大模型提供“需要重点关注”的提示，
 * 绝对不能直接作为违规结论（不能 命中关键词 → 直接判 high）。
 * 最终语义判断全部交给 LLM，并再经过 Evidence Grounding 校验。
 */
const KEYWORD_GROUPS: { category: string; keywords: string[] }[] = [
  {
    category: "收益相关",
    keywords: ["保证", "保本", "稳赚", "不会亏", "肯定涨", "至少赚"],
  },
  {
    category: "账户相关",
    keywords: [
      "验证码",
      "交易密码",
      "登录密码",
      "把密码发我",
      "帮你操作",
      "替你下单",
      "代你操作",
      "帮你下单",
    ],
  },
  {
    category: "诱导类",
    keywords: ["赶紧买", "今天必须", "马上下单"],
  },
];

export function scanRiskCandidates(turns: DialogueTurn[]): RiskCandidate[] {
  const candidates: RiskCandidate[] = [];

  for (const turn of turns) {
    for (const group of KEYWORD_GROUPS) {
      for (const keyword of group.keywords) {
        if (turn.text.includes(keyword)) {
          candidates.push({
            turnId: turn.turnId,
            role: turn.role,
            category: group.category,
            keyword,
            text: turn.text,
          });
        }
      }
    }
  }

  return candidates;
}
