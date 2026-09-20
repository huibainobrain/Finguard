import type { DialogueTurn, Evidence } from "./types";

export interface RawEvidenceInput {
  turn_id: number;
  quote: string;
  role?: string;
}

export interface EvidenceValidationResult {
  valid: Evidence[];
  invalidCount: number;
}

/**
 * Evidence Grounding：本项目最重要的 Guardrail 之一。
 *
 * 校验规则（严格按产品方案，不做 fuzzy matching / 向量匹配 / 编辑距离）：
 * 1. turn_id 对应的对话轮次必须存在；
 * 2. 该轮次必须是“销售”发言——以对话原文的角色为准，
 *    不信任模型自报的 evidence.role 字段；
 * 3. 该轮次原文必须原样包含 quote（不得改写、不得编造）。
 *
 * 三者全部满足才算 Evidence Valid，否则整条证据被丢弃（计入 invalidCount，
 * 由上层根据 invalidCount 决定是否需要把 high 降级为 warning + 人工复核）。
 */
export function validateEvidence(
  evidenceList: RawEvidenceInput[] | undefined,
  turns: DialogueTurn[]
): EvidenceValidationResult {
  const turnMap = new Map<number, DialogueTurn>(turns.map((t) => [t.turnId, t]));

  const valid: Evidence[] = [];
  let invalidCount = 0;

  for (const ev of evidenceList ?? []) {
    const turn = turnMap.get(ev.turn_id);
    const quote = (ev.quote ?? "").trim();

    const isValid = Boolean(
      turn && turn.role === "sales" && quote.length > 0 && turn.text.includes(quote)
    );

    if (isValid && turn) {
      valid.push({ turnId: turn.turnId, role: "sales", quote });
    } else {
      invalidCount++;
    }
  }

  return { valid, invalidCount };
}
