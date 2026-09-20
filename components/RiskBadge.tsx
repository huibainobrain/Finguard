import { OVERALL_RISK_LABEL, RISK_STATUS_LABEL, type OverallRisk, type RiskStatus } from "@/lib/types";

type Tone = "pass" | "warning" | "high";

const TONE_CLASSES: Record<Tone, string> = {
  pass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-rose-50 text-rose-700 border-rose-200",
};

function badgeClass(tone: Tone, size: "sm" | "md"): string {
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  return `inline-flex items-center rounded-full border font-medium ${sizeClass} ${TONE_CLASSES[tone]}`;
}

export function RiskBadge({ status, size = "md" }: { status: RiskStatus; size?: "sm" | "md" }) {
  return <span className={badgeClass(status, size)}>{RISK_STATUS_LABEL[status]}</span>;
}

export function OverallRiskBadge({
  overall,
  size = "md",
}: {
  overall: OverallRisk;
  size?: "sm" | "md";
}) {
  const tone: Tone = overall === "high" ? "high" : overall === "medium" ? "warning" : "pass";
  return <span className={badgeClass(tone, size)}>{OVERALL_RISK_LABEL[overall]}</span>;
}

/**
 * 人工复核状态标签：
 * - humanReviewed = true → “已人工复核”（不再显示“需要人工复核”，避免两个状态同时出现冲突）；
 * - 否则如果 AI 建议复核（reviewRequired）→ “需要人工复核”；
 * - 都不满足时不展示任何标签。
 */
export function ReviewStatusTag({
  reviewRequired,
  humanReviewed,
}: {
  reviewRequired: boolean;
  humanReviewed: boolean;
}) {
  if (humanReviewed) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        已人工复核
      </span>
    );
  }
  if (reviewRequired) {
    return (
      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
        需要人工复核
      </span>
    );
  }
  return null;
}
