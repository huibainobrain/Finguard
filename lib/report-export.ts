import {
  OVERALL_RISK_LABEL,
  RISK_STATUS_LABEL,
  type CustomRuleResult,
  type DimensionResult,
  type InspectionReport,
} from "./types";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatTimestampForFilename(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

export function buildReportFilename(
  prefix: string,
  extension: string,
  date: Date = new Date()
): string {
  return `${prefix}-${formatTimestampForFilename(date)}.${extension}`;
}

function renderDialogue(report: InspectionReport): string {
  return report.dialogue
    .map((t) => `${t.role === "sales" ? "销售" : "客户"}：${t.text}`)
    .join("\n");
}

function renderEvidence(result: Pick<DimensionResult, "evidence">): string {
  if (result.evidence.length === 0) return "（无）";
  return result.evidence
    .map((e) => `  - 第${e.turnId}轮 [销售]："${e.quote}"`)
    .join("\n");
}

function renderDimensionSection(d: DimensionResult): string {
  const lines = [
    `### ${d.dimensionName}`,
    "",
    `- AI 原始结论：${RISK_STATUS_LABEL[d.aiStatus]}`,
    `- 最终结论：${RISK_STATUS_LABEL[d.finalStatus]}`,
    `- AI 是否建议人工复核：${d.reviewRequired ? "是" : "否"}`,
    `- 是否已人工复核：${d.humanReviewed ? "是" : "否"}`,
    `- 判断理由：${d.reason || "（无）"}`,
    `- 原文证据：`,
    renderEvidence(d),
    `- 缺失信息：${
      d.missingInformation.length > 0 ? d.missingInformation.join("；") : "（无）"
    }`,
    `- 建议话术：${d.suggestion || "（无）"}`,
  ];
  if (d.reviewNote) {
    lines.push(`- 人工复核备注：${d.reviewNote}`);
  }
  return lines.join("\n");
}

function renderCustomRuleSection(r: CustomRuleResult): string {
  const lines = [
    `### 自定义规则：${r.ruleName}`,
    "",
    `- 是否命中：${r.matched ? "是" : "否"}`,
    `- AI 原始结论：${RISK_STATUS_LABEL[r.aiStatus]}`,
    `- 最终结论：${RISK_STATUS_LABEL[r.finalStatus]}`,
    `- AI 是否建议人工复核：${r.reviewRequired ? "是" : "否"}`,
    `- 是否已人工复核：${r.humanReviewed ? "是" : "否"}`,
    `- 判断理由：${r.reason || "（无）"}`,
    `- 原文证据：`,
    renderEvidence(r),
    `- 建议话术：${r.suggestion || "（无）"}`,
  ];
  if (r.reviewNote) {
    lines.push(`- 人工复核备注：${r.reviewNote}`);
  }
  return lines.join("\n");
}

export function buildMarkdownReport(report: InspectionReport): string {
  const sections = [
    "# FinGuard 金融销售对话质检报告",
    "",
    `**分析时间**：${report.analyzedAt}`,
    "",
    `**总体风险**：${OVERALL_RISK_LABEL[report.overallRisk]}`,
    "",
    "## 原始对话",
    "",
    "```text",
    renderDialogue(report),
    "```",
    "",
    "## 五维质检结果",
    "",
    ...report.dimensions.map((d) => renderDimensionSection(d) + "\n"),
  ];

  if (report.customRuleResults.length > 0) {
    sections.push("## 自定义规则结果", "");
    sections.push(
      ...report.customRuleResults.map((r) => renderCustomRuleSection(r) + "\n")
    );
  }

  sections.push(
    "---",
    "",
    "*本报告由 FinGuard AI 初审生成，不构成法律或投资意见，最终结论以人工复核为准。*"
  );

  return sections.join("\n");
}

export function buildJsonReport(report: InspectionReport): string {
  return JSON.stringify(report, null, 2);
}

// 浏览器端触发文件下载的小工具，仅供 "use client" 组件调用。
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
