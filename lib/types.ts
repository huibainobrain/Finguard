// 核心领域类型定义。所有模块（规则层、Prompt、API、UI）共用这里的类型。

export type Role = "sales" | "customer";

export interface DialogueTurn {
  turnId: number;
  role: Role;
  text: string;
}

export type RiskStatus = "pass" | "warning" | "high";

export type OverallRisk = "low" | "medium" | "high";

export interface Evidence {
  turnId: number;
  role: "sales";
  quote: string;
}

export type DimensionId =
  | "return_promise"
  | "risk_disclosure"
  | "transaction_safety"
  | "suitability"
  | "communication";

export interface DimensionDefinition {
  id: DimensionId;
  name: string;
  description: string;
}

// 固定五维定义，顺序即产品要求的展示顺序。全项目唯一真源。
export const DIMENSION_DEFINITIONS: DimensionDefinition[] = [
  {
    id: "return_promise",
    name: "收益与本金承诺",
    description:
      "保本、保收益、确定收益率、确定涨跌、“稳赚”、“不会亏”、变相弱化本金亏损可能。",
  },
  {
    id: "risk_disclosure",
    name: "宣传与风险揭示",
    description:
      "夸大宣传、只强调收益、隐瞒风险、淡化风险、将历史业绩作为未来确定结果、明显不充分风险揭示。",
  },
  {
    id: "transaction_safety",
    name: "交易诱导与账户安全",
    description:
      "强行催促交易、代客操作、替客户下单、索要交易密码、索要登录密码、索要验证码、其他明显账户安全风险。",
  },
  {
    id: "suitability",
    name: "客户适当性",
    description:
      "默认应为 pass。客户单纯表达风险偏好/承受能力/投资经验本身不构成触发条件，销售如据此先安排风险测评或了解情况应视为正常处理；销售单纯说\"你可以买\"\"建议购买\"\"你放心买\"等泛泛推荐/鼓励购买用语，若未关联客户本人具体情况声称匹配，也不构成触发条件（涉及保本保收益的部分交由收益与本金承诺维度评价）。只有以下情况之一才判定为风险：①销售明确将产品与客户本人具体情况相联系、声称匹配（如\"这个产品很适合你\"）且信息不足以支撑该判断——warning，说明缺失信息；②客户已表达风险偏好，销售仍继续给出具体产品推荐——warning/high；③销售的具体推荐与客户已表达的风险承受能力明显冲突——warning/high。",
  },
  {
    id: "communication",
    name: "敏感信息与不当沟通",
    description:
      "不合理索取身份证、银行卡等敏感信息、阻挠投诉、威胁、贬损客户、明显不专业表达。",
  },
];

export const DIMENSION_ID_ORDER: DimensionId[] = DIMENSION_DEFINITIONS.map((d) => d.id);

export interface DimensionResult {
  dimensionId: DimensionId;
  dimensionName: string;

  aiStatus: RiskStatus;
  finalStatus: RiskStatus;

  reviewRequired: boolean;
  humanReviewed: boolean;

  reason: string;

  evidence: Evidence[];

  missingInformation: string[];

  suggestion: string;

  reviewNote?: string;
}

export type CustomRuleRiskLevel = "warning" | "high";

export interface CustomRule {
  id: string;
  name: string;
  description: string;
  riskLevel: CustomRuleRiskLevel;
}

export interface CustomRuleResult {
  ruleId: string;
  ruleName: string;

  matched: boolean;

  aiStatus: RiskStatus;
  finalStatus: RiskStatus;

  reviewRequired: boolean;
  humanReviewed: boolean;

  reason: string;

  evidence: Evidence[];

  suggestion: string;

  reviewNote?: string;
}

export interface InspectionReport {
  dialogue: DialogueTurn[];

  dimensions: DimensionResult[];

  customRuleResults: CustomRuleResult[];

  overallRisk: OverallRisk;

  analyzedAt: string;
}

export interface ModelConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

export interface RiskCandidate {
  turnId: number;
  role: Role;
  category: string;
  keyword: string;
  text: string;
}

// ---- 单条质检分析状态 ----

export type AnalysisState =
  | { status: "idle" }
  | { status: "unconfigured" }
  | { status: "analyzing" }
  | { status: "success"; report: InspectionReport }
  | { status: "error"; message: string };

// ---- 批量质检 ----

export interface BatchRow {
  id: string;
  dialogueText: string;
}

export type BatchItemStatus = "waiting" | "analyzing" | "done" | "failed";

export interface BatchItem {
  id: string;
  dialogueText: string;
  status: BatchItemStatus;
  report?: InspectionReport;
  error?: string;
}

// CSV 导出面向人工阅读，状态字段统一导出为中文标签字符串。
export interface BatchExportRow {
  id: string;
  overall_risk: string;
  return_promise: string;
  risk_disclosure: string;
  transaction_safety: string;
  suitability: string;
  communication: string;
  review_required: "是" | "否";
  high_risk_dimensions: string;
  analysis_status: string;
  custom_rule_hits: string;
}

export const RISK_STATUS_LABEL: Record<RiskStatus, string> = {
  pass: "通过",
  warning: "提醒",
  high: "高风险",
};

export const OVERALL_RISK_LABEL: Record<OverallRisk, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
};

export const BATCH_STATUS_LABEL: Record<BatchItemStatus, string> = {
  waiting: "等待中",
  analyzing: "分析中",
  done: "已完成",
  failed: "失败",
};
