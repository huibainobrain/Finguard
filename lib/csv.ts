import Papa from "papaparse";
import {
  BATCH_STATUS_LABEL,
  DIMENSION_ID_ORDER,
  OVERALL_RISK_LABEL,
  RISK_STATUS_LABEL,
  type BatchExportRow,
  type BatchItem,
  type BatchRow,
  type DimensionId,
} from "./types";

export type ParseBatchCsvResult =
  | { success: true; rows: BatchRow[] }
  | { success: false; error: string };

const REQUIRED_COLUMNS = ["id", "dialogue"];

/**
 * 使用 PapaParse 解析批量质检 CSV，正确处理引号、逗号、
 * dialogue 字段内换行等情况，不自己写脆弱的 split(",") 解析器。
 */
export function parseBatchCsv(csvText: string): ParseBatchCsvResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const fields = result.meta.fields ?? [];
  const hasRequiredColumns = REQUIRED_COLUMNS.every((col) => fields.includes(col));
  if (!hasRequiredColumns) {
    return {
      success: false,
      error: "CSV 格式错误，需要包含 id 和 dialogue 两列。",
    };
  }

  const rows: BatchRow[] = [];
  for (const row of result.data) {
    const id = (row.id ?? "").trim();
    const dialogueText = (row.dialogue ?? "").trim();
    if (!id || !dialogueText) continue;
    rows.push({ id, dialogueText });
  }

  if (rows.length === 0) {
    return {
      success: false,
      error: "未解析到有效的对话数据，请检查 CSV 内容是否为空。",
    };
  }

  const seenIds = new Set<string>();
  const hasDuplicateId = rows.some((row) => {
    if (seenIds.has(row.id)) return true;
    seenIds.add(row.id);
    return false;
  });
  if (hasDuplicateId) {
    return {
      success: false,
      error: "CSV 中存在重复 id，请确保每条对话的 id 唯一。",
    };
  }

  return { success: true, rows };
}

function dimensionStatusOf(item: BatchItem, dimensionId: DimensionId): string {
  const dim = item.report?.dimensions.find((d) => d.dimensionId === dimensionId);
  return dim ? RISK_STATUS_LABEL[dim.finalStatus] : "";
}

function toExportRow(item: BatchItem): BatchExportRow {
  const report = item.report;
  const highRiskDimensions = report
    ? report.dimensions
        .filter((d) => d.finalStatus === "high")
        .map((d) => d.dimensionName)
        .join("；")
    : "";
  const reviewRequired = report
    ? report.dimensions.some((d) => d.reviewRequired && !d.humanReviewed) ||
      report.customRuleResults.some((r) => r.matched && r.reviewRequired && !r.humanReviewed)
    : false;
  const customRuleHits = report
    ? report.customRuleResults
        .filter((r) => r.matched)
        .map((r) => `${r.ruleName}(${RISK_STATUS_LABEL[r.finalStatus]})`)
        .join("；")
    : "";

  return {
    id: item.id,
    overall_risk: report ? OVERALL_RISK_LABEL[report.overallRisk] : "",
    return_promise: dimensionStatusOf(item, "return_promise"),
    risk_disclosure: dimensionStatusOf(item, "risk_disclosure"),
    transaction_safety: dimensionStatusOf(item, "transaction_safety"),
    suitability: dimensionStatusOf(item, "suitability"),
    communication: dimensionStatusOf(item, "communication"),
    review_required: reviewRequired ? "是" : "否",
    high_risk_dimensions: highRiskDimensions,
    analysis_status: BATCH_STATUS_LABEL[item.status],
    custom_rule_hits: customRuleHits,
  };
}

export function exportBatchResultsToCsv(items: BatchItem[]): string {
  const rows = items.map(toExportRow);
  return Papa.unparse(rows, { columns: EXPORT_COLUMNS });
}

const EXPORT_COLUMNS = [
  "id",
  "overall_risk",
  ...DIMENSION_ID_ORDER,
  "review_required",
  "high_risk_dimensions",
  "analysis_status",
  "custom_rule_hits",
];
