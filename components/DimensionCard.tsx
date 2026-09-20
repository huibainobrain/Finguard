import { RISK_STATUS_LABEL, type Evidence, type RiskStatus } from "@/lib/types";
import { RiskBadge, ReviewStatusTag } from "./RiskBadge";

export interface DimensionCardProps {
  title: string;
  aiStatus: RiskStatus;
  finalStatus: RiskStatus;
  reviewRequired: boolean;
  humanReviewed: boolean;
  reason: string;
  evidence: Evidence[];
  missingInformation: string[];
  suggestion: string;
  reviewNote?: string;
  onReviewClick: () => void;
}

export function DimensionCard({
  title,
  aiStatus,
  finalStatus,
  reviewRequired,
  humanReviewed,
  reason,
  evidence,
  missingInformation,
  suggestion,
  reviewNote,
  onReviewClick,
}: DimensionCardProps) {
  const wasOverridden = aiStatus !== finalStatus;
  const showDetails = finalStatus !== "pass" || reviewRequired || wasOverridden || humanReviewed;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <div className="flex items-center gap-2">
          <ReviewStatusTag reviewRequired={reviewRequired} humanReviewed={humanReviewed} />
          {wasOverridden && (
            <span className="text-xs text-slate-400 line-through">
              AI：{RISK_STATUS_LABEL[aiStatus]}
            </span>
          )}
          <RiskBadge status={finalStatus} />
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 space-y-3 text-sm text-slate-600">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">判断理由</p>
            <p className="mt-1 whitespace-pre-wrap">{reason || "（无）"}</p>
          </div>

          {evidence.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">原文证据</p>
              <ul className="mt-1 space-y-1.5">
                {evidence.map((e, idx) => (
                  <li key={`${e.turnId}-${idx}`} className="rounded bg-slate-50 px-3 py-1.5">
                    <span className="text-xs text-slate-400">第{e.turnId}轮 · 销售</span>
                    <p className="text-slate-700">&ldquo;{e.quote}&rdquo;</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missingInformation.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">缺失信息</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">
                {missingInformation.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {suggestion && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">建议话术</p>
              <p className="mt-1 rounded bg-emerald-50 px-3 py-1.5 text-emerald-800">{suggestion}</p>
            </div>
          )}

          {reviewNote && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">人工复核备注</p>
              <p className="mt-1 rounded bg-sky-50 px-3 py-1.5 text-sky-800">{reviewNote}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onReviewClick}
          className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
        >
          修改结论
        </button>
      </div>
    </div>
  );
}
