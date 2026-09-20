import { z } from "zod";
import { DIMENSION_ID_ORDER, type DimensionId } from "./types";

// ---------------------------------------------------------------------------
// 客户端请求 Schema
// ---------------------------------------------------------------------------

export const ModelConfigSchema = z.object({
  apiKey: z.string().min(1, "请填写 API Key"),
  baseUrl: z.string().min(1, "请填写 Base URL"),
  modelName: z.string().min(1, "请填写 Model Name"),
});

export const CustomRuleRiskLevelSchema = z.enum(["warning", "high"]);

export const CustomRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "请填写规则名称").max(60, "规则名称过长"),
  description: z.string().min(1, "请填写规则说明").max(300, "规则说明过长"),
  riskLevel: CustomRuleRiskLevelSchema,
});

export const AnalyzeRequestSchema = z.object({
  dialogue: z.string().min(1, "对话内容不能为空"),
  modelConfig: ModelConfigSchema,
  customRules: z.array(CustomRuleSchema).default([]),
});

export const ModelTestRequestSchema = ModelConfigSchema;

// ---------------------------------------------------------------------------
// 大模型输出 Schema（snake_case，来自 Prompt 中要求的 JSON 格式）
// ---------------------------------------------------------------------------

const RiskStatusOutputSchema = z.enum(["pass", "warning", "high"]);

// 部分模型可能把布尔值输出成字符串，这里做一次容错转换，但不改变语义严格性。
const BooleanLikeSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
  }
  return val;
}, z.boolean());

const EvidenceOutputSchema = z.object({
  turn_id: z.coerce.number(),
  // role 字段不作为可信依据，真正的角色校验以原始对话轮次为准（见 evidence-validator.ts）。
  role: z.string().optional(),
  quote: z.string(),
});

const DimensionOutputSchema = z.object({
  dimension_id: z.enum(DIMENSION_ID_ORDER as [DimensionId, ...DimensionId[]]),
  dimension_name: z.string().optional().default(""),
  status: RiskStatusOutputSchema,
  review_required: BooleanLikeSchema.default(false),
  reason: z.string().default(""),
  evidence: z.array(EvidenceOutputSchema).default([]),
  missing_information: z.array(z.string()).default([]),
  suggestion: z.string().default(""),
});

const CustomRuleOutputSchema = z.object({
  rule_id: z.string(),
  matched: BooleanLikeSchema.default(false),
  review_required: BooleanLikeSchema.default(false),
  reason: z.string().default(""),
  evidence: z.array(EvidenceOutputSchema).default([]),
  suggestion: z.string().default(""),
});

export const ModelOutputSchema = z.object({
  dimensions: z
    .array(DimensionOutputSchema)
    .superRefine((dims, ctx) => {
      const ids = dims.map((d) => d.dimension_id);
      const unique = new Set(ids);
      const missing = DIMENSION_ID_ORDER.filter((id) => !unique.has(id));
      if (missing.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: `缺少必须的质检维度：${missing.join(", ")}`,
        });
      }
      if (unique.size !== ids.length) {
        ctx.addIssue({
          code: "custom",
          message: "质检维度存在重复。",
        });
      }
    }),
  custom_rule_results: z.array(CustomRuleOutputSchema).default([]),
});

export type ModelOutput = z.infer<typeof ModelOutputSchema>;
export type ModelDimensionOutput = z.infer<typeof DimensionOutputSchema>;
export type ModelCustomRuleOutput = z.infer<typeof CustomRuleOutputSchema>;

// ---------------------------------------------------------------------------
// JSON 提取与解析
// ---------------------------------------------------------------------------

/**
 * 大模型有时会返回带 Markdown 代码块或前后解释文字的内容，这里做一次轻量清洗：
 * 去掉代码围栏、截取最外层 JSON object。不做复杂 NLP 解析。
 */
export function extractJsonBlock(raw: string): string {
  let text = raw.trim();

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

export type ModelOutputParseResult =
  | { success: true; data: ModelOutput }
  | { success: false; error: string };

export type CustomRuleCompletenessResult = { success: true } | { success: false; error: string };

/**
 * Zod 只能校验单条 custom_rule_results 记录的结构是否合法，无法校验“返回的 rule_id
 * 集合是否恰好等于用户传入的自定义规则集合”。这里作为 Schema 校验通过之后、生成报告
 * 之前的一道轻量完整性检查：不允许遗漏、不允许出现未知 rule_id、不允许重复。
 * 没有自定义规则时，expectedRuleIds 为空数组，此时 results 也必须为空。
 */
export function checkCustomRuleCompleteness(
  results: Pick<ModelCustomRuleOutput, "rule_id">[],
  expectedRuleIds: string[]
): CustomRuleCompletenessResult {
  const expected = new Set(expectedRuleIds);
  const seen = new Set<string>();
  const missing: string[] = [];
  const unknown: string[] = [];
  const duplicated: string[] = [];

  for (const r of results) {
    if (!expected.has(r.rule_id)) {
      unknown.push(r.rule_id);
      continue;
    }
    if (seen.has(r.rule_id)) {
      duplicated.push(r.rule_id);
      continue;
    }
    seen.add(r.rule_id);
  }
  for (const id of expectedRuleIds) {
    if (!seen.has(id)) missing.push(id);
  }

  if (missing.length === 0 && unknown.length === 0 && duplicated.length === 0) {
    return { success: true };
  }

  const parts: string[] = [];
  if (missing.length > 0) parts.push(`缺少 rule_id：${missing.join(", ")}`);
  if (unknown.length > 0) parts.push(`出现未知 rule_id：${unknown.join(", ")}`);
  if (duplicated.length > 0) parts.push(`rule_id 重复：${duplicated.join(", ")}`);

  return {
    success: false,
    error: `custom_rule_results 与传入的自定义规则不匹配：${parts.join("；")}。`,
  };
}

export function parseModelOutput(raw: string): ModelOutputParseResult {
  const cleaned = extractJsonBlock(raw);

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    return { success: false, error: "模型输出不是合法 JSON。" };
  }

  const result = ModelOutputSchema.safeParse(json);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return { success: false, error: message };
  }

  return { success: true, data: result.data };
}
