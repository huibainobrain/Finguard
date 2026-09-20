import { NextResponse } from "next/server";
import { parseDialogue } from "@/lib/dialogue-parser";
import { validateEvidence } from "@/lib/evidence-validator";
import { callChatCompletion, ModelClientError, type ChatMessage } from "@/lib/model-client";
import {
  buildCustomRuleRepairPrompt,
  buildRepairPrompt,
  buildUserPrompt,
  SYSTEM_PROMPT,
} from "@/lib/prompts";
import { scanRiskCandidates } from "@/lib/risk-candidates";
import {
  applyHighRiskEvidenceGuard,
  applyReviewRequirementRules,
  applyWarningEvidenceGuard,
  computeOverallRisk,
} from "@/lib/risk-aggregator";
import {
  AnalyzeRequestSchema,
  checkCustomRuleCompleteness,
  parseModelOutput,
  type ModelDimensionOutput,
  type ModelOutput,
} from "@/lib/schemas";
import { DIMENSION_DEFINITIONS, type CustomRuleResult, type DimensionResult, type InspectionReport } from "@/lib/types";

// 模型输出必须同时满足：JSON/Schema 合法，且 custom_rule_results 恰好覆盖每一个
// 传入的自定义规则 id（不多不少不重复）。任一条件不满足都视为“model output invalid”，
// 复用同一套一次性修复重试机制，但根据失败原因选择更有针对性的修复提示。
type ValidatedOutput =
  | { success: true; data: ModelOutput }
  | { success: false; error: string; repairPrompt: string };

function validateModelOutput(raw: string, expectedRuleIds: string[]): ValidatedOutput {
  const parsed = parseModelOutput(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error, repairPrompt: buildRepairPrompt(raw, parsed.error) };
  }

  const completeness = checkCustomRuleCompleteness(parsed.data.custom_rule_results, expectedRuleIds);
  if (!completeness.success) {
    return {
      success: false,
      error: completeness.error,
      repairPrompt: buildCustomRuleRepairPrompt(raw, completeness.error, expectedRuleIds),
    };
  }

  return parsed;
}

export const runtime = "nodejs";

// 注意：本文件严禁 console.log request body / apiKey / 模型原始响应，避免密钥或敏感对话进入日志。

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误。" }, { status: 400 });
  }

  const parsedRequest = AnalyzeRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "请求参数不合法，请检查对话内容和模型配置。" },
      { status: 400 }
    );
  }

  const { dialogue, modelConfig, customRules } = parsedRequest.data;

  const parseResult = parseDialogue(dialogue);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error }, { status: 400 });
  }
  const turns = parseResult.turns;

  const candidates = scanRiskCandidates(turns);
  const userPrompt = buildUserPrompt(turns, candidates, customRules);

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  let rawContent: string;
  try {
    rawContent = await callChatCompletion(modelConfig, messages, {
      timeoutMs: 60_000,
      temperature: 0,
    });
  } catch (err) {
    const message =
      err instanceof ModelClientError ? err.message : "模型请求失败，请重试。";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const expectedRuleIds = customRules.map((c) => c.id);
  let validated = validateModelOutput(rawContent, expectedRuleIds);

  // 只允许一次修复重试，不做无限重试。JSON/Schema 不合法或自定义规则返回不完整
  // （遗漏/未知/重复 rule_id）都视为 model output invalid，走同一套重试机制。
  if (!validated.success) {
    try {
      const repairedContent = await callChatCompletion(
        modelConfig,
        [
          ...messages,
          { role: "assistant", content: rawContent },
          { role: "user", content: validated.repairPrompt },
        ],
        { timeoutMs: 60_000, temperature: 0 }
      );
      validated = validateModelOutput(repairedContent, expectedRuleIds);
    } catch {
      // 修复请求失败，走下面的统一失败分支。
    }
  }

  if (!validated.success) {
    return NextResponse.json(
      { error: "模型返回格式异常，请重试或更换模型。" },
      { status: 502 }
    );
  }

  const output = validated.data;

  const dimensions: DimensionResult[] = output.dimensions.map((d: ModelDimensionOutput) => {
    const definition = DIMENSION_DEFINITIONS.find((def) => def.id === d.dimension_id);
    const { valid } = validateEvidence(d.evidence, turns);
    const rawStatus = d.status;

    let guarded = applyHighRiskEvidenceGuard(
      { status: d.status, reviewRequired: d.review_required, reason: d.reason },
      valid.length
    );
    // 只对模型原始判定就是 warning 的结果做 Warning Evidence Guard；
    // 由 high 降级来的 warning 已经在上面处理过，避免重复追加提示文字。
    if (rawStatus === "warning") {
      guarded = applyWarningEvidenceGuard(guarded, valid.length, d.missing_information.length > 0);
    }

    const reviewRequired = applyReviewRequirementRules(
      guarded.status,
      valid.length,
      d.missing_information.length > 0
    );

    return {
      dimensionId: d.dimension_id,
      dimensionName: definition?.name ?? d.dimension_name,
      aiStatus: guarded.status,
      finalStatus: guarded.status,
      reviewRequired,
      humanReviewed: false,
      reason: guarded.reason,
      evidence: valid,
      missingInformation: d.missing_information,
      suggestion: d.suggestion,
    };
  });

  const customRuleResults: CustomRuleResult[] = output.custom_rule_results
    .map((r): CustomRuleResult | null => {
      const rule = customRules.find((c) => c.id === r.rule_id);
      if (!rule || !r.matched) return null;

      const { valid } = validateEvidence(r.evidence, turns);
      const rawStatus = rule.riskLevel;

      let guarded = applyHighRiskEvidenceGuard(
        { status: rawStatus, reviewRequired: r.review_required, reason: r.reason },
        valid.length
      );
      // 自定义规则没有 missingInformation 概念，无证据的 warning 一律按"行为风险型"处理。
      if (rawStatus === "warning") {
        guarded = applyWarningEvidenceGuard(guarded, valid.length, false);
      }

      const reviewRequired = applyReviewRequirementRules(guarded.status, valid.length, false);

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        matched: true,
        aiStatus: guarded.status,
        finalStatus: guarded.status,
        reviewRequired,
        humanReviewed: false,
        reason: guarded.reason,
        evidence: valid,
        suggestion: r.suggestion,
      };
    })
    .filter((r): r is CustomRuleResult => r !== null);

  const overallRisk = computeOverallRisk(dimensions, customRuleResults);

  const report: InspectionReport = {
    dialogue: turns,
    dimensions,
    customRuleResults,
    overallRisk,
    analyzedAt: new Date().toISOString(),
  };

  return NextResponse.json({ report });
}
