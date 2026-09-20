import { describe, expect, it } from "vitest";
import {
  applyHighRiskEvidenceGuard,
  applyManualReview,
  applyReviewRequirementRules,
  applyWarningEvidenceGuard,
  computeOverallRisk,
} from "../lib/risk-aggregator";
import type { RiskStatus } from "../lib/types";

function dim(finalStatus: RiskStatus) {
  return { finalStatus };
}

describe("computeOverallRisk", () => {
  it("returns high when any dimension is high", () => {
    expect(computeOverallRisk([dim("pass"), dim("high"), dim("warning")])).toBe("high");
  });

  it("returns medium when there is a warning but no high", () => {
    expect(computeOverallRisk([dim("pass"), dim("warning")])).toBe("medium");
  });

  it("returns low when every dimension passes", () => {
    expect(computeOverallRisk([dim("pass"), dim("pass")])).toBe("low");
  });

  it("recomputes correctly after a manual override changes a dimension's finalStatus", () => {
    const beforeOverride = [dim("high"), dim("pass")];
    expect(computeOverallRisk(beforeOverride)).toBe("high");

    // 模拟人工把 high 改成 pass 后重新聚合
    const afterOverride = [dim("pass"), dim("pass")];
    expect(computeOverallRisk(afterOverride)).toBe("low");
  });

  it("counts a matched custom rule result toward overall risk", () => {
    const dimensions = [dim("pass"), dim("pass")];
    const customRuleResults = [{ matched: true, finalStatus: "high" as const }];
    expect(computeOverallRisk(dimensions, customRuleResults)).toBe("high");
  });

  it("ignores unmatched custom rule results", () => {
    const dimensions = [dim("pass")];
    const customRuleResults = [{ matched: false, finalStatus: "high" as const }];
    expect(computeOverallRisk(dimensions, customRuleResults)).toBe("low");
  });
});

describe("applyHighRiskEvidenceGuard", () => {
  it("downgrades high risk with zero valid evidence to warning + reviewRequired", () => {
    const result = applyHighRiskEvidenceGuard(
      { status: "high", reviewRequired: false, reason: "销售弱化了亏损风险。" },
      0
    );
    expect(result.status).toBe("warning");
    expect(result.reviewRequired).toBe(true);
    expect(result.reason).toContain("需要人工复核");
  });

  it("keeps high risk untouched when at least one valid evidence exists", () => {
    const result = applyHighRiskEvidenceGuard(
      { status: "high", reviewRequired: false, reason: "销售弱化了亏损风险。" },
      1
    );
    expect(result.status).toBe("high");
    expect(result.reviewRequired).toBe(false);
  });

  it("leaves pass/warning statuses unaffected regardless of evidence count", () => {
    const result = applyHighRiskEvidenceGuard(
      { status: "warning", reviewRequired: true, reason: "信息不足。" },
      0
    );
    expect(result.status).toBe("warning");
    expect(result.reviewRequired).toBe(true);
  });
});

describe("applyWarningEvidenceGuard", () => {
  it("forces reviewRequired when warning has missing information but no evidence (情况 A)", () => {
    const result = applyWarningEvidenceGuard(
      {
        status: "warning",
        reviewRequired: false,
        reason: "销售对产品适合客户做出了判断，但缺少客户风险等级信息。",
      },
      0,
      true
    );
    expect(result.status).toBe("warning");
    expect(result.reviewRequired).toBe(true);
    // 信息不足型不强行追加"未提供可验证证据"的措辞，理由保持模型原始说明。
    expect(result.reason).not.toContain("模型未提供可验证的销售原文证据");
  });

  it("appends the no-evidence note when warning has neither evidence nor missing information (情况 B)", () => {
    const result = applyWarningEvidenceGuard(
      { status: "warning", reviewRequired: false, reason: "宣传用语略显夸张。" },
      0,
      false
    );
    expect(result.status).toBe("warning");
    expect(result.reviewRequired).toBe(true);
    expect(result.reason).toContain("模型未提供可验证的销售原文证据，需要人工复核。");
  });

  it("leaves a warning untouched when valid evidence already exists", () => {
    const result = applyWarningEvidenceGuard(
      { status: "warning", reviewRequired: false, reason: "宣传用语略显夸张。" },
      1,
      false
    );
    expect(result).toEqual({ status: "warning", reviewRequired: false, reason: "宣传用语略显夸张。" });
  });

  it("does not touch pass or high statuses", () => {
    const pass = applyWarningEvidenceGuard({ status: "pass", reviewRequired: false, reason: "" }, 0, false);
    expect(pass.status).toBe("pass");

    const high = applyWarningEvidenceGuard(
      { status: "high", reviewRequired: false, reason: "明确违规。" },
      0,
      false
    );
    expect(high.status).toBe("high");
    expect(high.reviewRequired).toBe(false);
  });
});

describe("applyReviewRequirementRules", () => {
  it("returns false for high with valid evidence and no missing information (真实模型不稳定输出的场景)", () => {
    expect(applyReviewRequirementRules("high", 1, false)).toBe(false);
    expect(applyReviewRequirementRules("high", 2, false)).toBe(false);
  });

  it("returns true whenever missing information exists, regardless of status or evidence", () => {
    expect(applyReviewRequirementRules("warning", 1, true)).toBe(true);
    expect(applyReviewRequirementRules("warning", 0, true)).toBe(true);
    expect(applyReviewRequirementRules("high", 1, true)).toBe(true);
  });

  it("returns true for warning with no evidence and no missing information", () => {
    expect(applyReviewRequirementRules("warning", 0, false)).toBe(true);
  });

  it("returns false for pass regardless of evidence or missing information", () => {
    expect(applyReviewRequirementRules("pass", 0, false)).toBe(false);
    expect(applyReviewRequirementRules("pass", 0, true)).toBe(false);
  });

  it("returns true for high with zero valid evidence (一致于 High Risk Evidence Guard 的降级场景)", () => {
    expect(applyReviewRequirementRules("high", 0, false)).toBe(true);
  });
});

describe("applyManualReview", () => {
  it("marks humanReviewed = true and updates finalStatus / reviewNote without touching aiStatus or reviewRequired", () => {
    const dimension = {
      aiStatus: "warning" as RiskStatus,
      finalStatus: "warning" as RiskStatus,
      reviewRequired: true,
      humanReviewed: false,
      reviewNote: undefined as string | undefined,
    };

    const result = applyManualReview(dimension, "pass", "已确认客户已完成相关风险测评。");

    expect(result.finalStatus).toBe("pass");
    expect(result.reviewNote).toBe("已确认客户已完成相关风险测评。");
    expect(result.humanReviewed).toBe(true);
    // AI 原始结论与 AI 是否建议复核的判断必须原样保留，不能被人工操作覆盖。
    expect(result.aiStatus).toBe("warning");
    expect(result.reviewRequired).toBe(true);
  });

  it("clears the review note when an empty string is saved", () => {
    const dimension = {
      finalStatus: "warning" as RiskStatus,
      humanReviewed: false,
      reviewNote: "旧备注",
    };
    const result = applyManualReview(dimension, "warning", "");
    expect(result.reviewNote).toBeUndefined();
    expect(result.humanReviewed).toBe(true);
  });

  it("overall risk still recomputes from finalStatus after a manual review, independent of humanReviewed", () => {
    const dimensions = [
      applyManualReview(
        { finalStatus: "high" as RiskStatus, humanReviewed: false },
        "pass",
        "误报，已复核。"
      ),
      { finalStatus: "pass" as RiskStatus, humanReviewed: false },
    ];
    expect(computeOverallRisk(dimensions)).toBe("low");
  });
});
