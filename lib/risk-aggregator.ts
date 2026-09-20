import type {
  CustomRuleResult,
  DimensionResult,
  OverallRisk,
  RiskStatus,
} from "./types";

function worstStatus(statuses: RiskStatus[]): RiskStatus {
  if (statuses.includes("high")) return "high";
  if (statuses.includes("warning")) return "warning";
  return "pass";
}

/**
 * 总体风险不能交给模型自由生成，由程序根据各维度 finalStatus 确定性计算：
 * 存在任意 high → 高风险；无 high 但存在 warning → 中风险；全部 pass → 低风险。
 * 人工修改某个维度的 finalStatus 后重新调用本函数即可得到最新总体风险。
 */
export function computeOverallRisk(
  dimensions: Pick<DimensionResult, "finalStatus">[],
  customRuleResults: Pick<CustomRuleResult, "matched" | "finalStatus">[] = []
): OverallRisk {
  const statuses: RiskStatus[] = [
    ...dimensions.map((d) => d.finalStatus),
    ...customRuleResults.filter((r) => r.matched).map((r) => r.finalStatus),
  ];

  const worst = worstStatus(statuses);
  if (worst === "high") return "high";
  if (worst === "warning") return "medium";
  return "low";
}

export interface GuardableResult {
  status: RiskStatus;
  reviewRequired: boolean;
  reason: string;
}

export const NO_VALID_EVIDENCE_NOTE =
  "模型未提供可验证的销售原文证据，需要人工复核。";

function appendNote(reason: string, note: string): string {
  if (!reason) return note;
  if (reason.includes(note)) return reason;
  return `${reason}${reason.endsWith("。") ? "" : "。"}${note}`;
}

/**
 * High Risk Evidence Guard：
 * 如果模型判定 high，但经过 Evidence Grounding 后没有任何有效证据，
 * 强制降级为 warning + reviewRequired，避免“AI 编造证据”导致的误判。
 * Pass 不需要证据；Warning 允许没有证据（例如纯粹因信息不足触发）。
 */
export function applyHighRiskEvidenceGuard<T extends GuardableResult>(
  result: T,
  validEvidenceCount: number
): T {
  if (result.status === "high" && validEvidenceCount === 0) {
    return {
      ...result,
      status: "warning",
      reviewRequired: true,
      reason: appendNote(result.reason, NO_VALID_EVIDENCE_NOTE),
    };
  }
  return result;
}

/**
 * Warning Evidence Guard：
 * 只处理模型原始判定就是 warning 的结果（由 high 降级而来的 warning 已经在
 * applyHighRiskEvidenceGuard 中处理过，不应重复处理，调用方需要用“模型原始 status”
 * 来判断是否需要走这里，而不是用已经被上面那个 Guard 改写过的 status）。
 *
 * - 情况 A（信息不足型）：hasMissingInformation 为 true 时，允许没有证据，
 *   但必须确保 reviewRequired = true，交由人工确认缺失信息是否可以补齐。
 * - 情况 B（行为风险型）：hasMissingInformation 为 false 但也没有有效证据，
 *   说明这条 warning 缺少可解释依据，保守处理为 reviewRequired = true，
 *   并在 reason 中追加提示，避免无证据的 warning 被当成确定结论展示。
 */
export function applyWarningEvidenceGuard<T extends GuardableResult>(
  result: T,
  validEvidenceCount: number,
  hasMissingInformation: boolean
): T {
  if (result.status !== "warning" || validEvidenceCount > 0) {
    return result;
  }

  if (hasMissingInformation) {
    return { ...result, reviewRequired: true };
  }

  return {
    ...result,
    reviewRequired: true,
    reason: appendNote(result.reason, NO_VALID_EVIDENCE_NOTE),
  };
}

/**
 * reviewRequired 确定性归一化：真实模型在同类场景（例如同样是 High + 有效证据 +
 * 无缺失信息）下对 review_required 的自报值并不稳定，因此最终展示给前端的
 * reviewRequired 不再直接采信模型输出，而是在 High/Warning Evidence Guard 处理完
 * status 之后，仅根据「有效证据数量 + 是否存在缺失信息 + 最终 status」程序化推导：
 * - status 为 pass → false；
 * - 存在缺失信息 → true（交由人工确认信息能否补齐）；
 * - 无缺失信息但没有有效证据 → true（这一分支通常已被上面两个 Guard 处理过一次，
 *   这里再次覆盖只是确保结果始终一致，不依赖模型是否配合）；
 * - 无缺失信息且至少有一条有效证据 → false（结论已有可验证的销售原文支撑）。
 * 自定义规则没有 missingInformation 概念，调用时固定传 false 即可复用同一套规则。
 */
export function applyReviewRequirementRules(
  status: RiskStatus,
  validEvidenceCount: number,
  hasMissingInformation: boolean
): boolean {
  if (status === "pass") return false;
  if (hasMissingInformation) return true;
  return validEvidenceCount === 0;
}

export interface ManualReviewable {
  finalStatus: RiskStatus;
  reviewNote?: string;
  humanReviewed: boolean;
}

/**
 * 应用一次人工复核保存操作：更新最终结论与复核备注，并标记为“已人工复核”。
 * 不修改 aiStatus / reviewRequired —— AI 原始判断和其是否建议复核的结论必须保留，
 * 人工只是补充了处理结果，而不是覆盖 AI 的原始输出。
 */
export function applyManualReview<T extends ManualReviewable>(
  item: T,
  finalStatus: RiskStatus,
  reviewNote: string
): T {
  return {
    ...item,
    finalStatus,
    reviewNote: reviewNote || undefined,
    humanReviewed: true,
  };
}
