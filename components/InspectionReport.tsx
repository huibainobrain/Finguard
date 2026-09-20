"use client";

import { useState } from "react";
import type { InspectionReport as ReportType, RiskStatus } from "@/lib/types";
import { DimensionCard } from "./DimensionCard";
import { ManualReviewModal } from "./ManualReviewModal";
import { OverallRiskBadge } from "./RiskBadge";

export interface InspectionReportProps {
  report: ReportType;
  onUpdateDimension: (dimensionId: string, finalStatus: RiskStatus, reviewNote: string) => void;
  onUpdateCustomRule: (ruleId: string, finalStatus: RiskStatus, reviewNote: string) => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
}

type ReviewTarget = {
  type: "dimension" | "custom";
  id: string;
  name: string;
  aiStatus: RiskStatus;
  finalStatus: RiskStatus;
  reviewNote?: string;
};

export function InspectionReport({
  report,
  onUpdateDimension,
  onUpdateCustomRule,
  onExportMarkdown,
  onExportJson,
}: InspectionReportProps) {
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">总体风险</p>
          <div className="mt-1">
            <OverallRiskBadge overall={report.overallRisk} />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onExportMarkdown}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            导出 Markdown
          </button>
          <button
            type="button"
            onClick={onExportJson}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            导出 JSON
          </button>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto pr-1">
        {report.dimensions.map((d) => (
          <DimensionCard
            key={d.dimensionId}
            title={d.dimensionName}
            aiStatus={d.aiStatus}
            finalStatus={d.finalStatus}
            reviewRequired={d.reviewRequired}
            humanReviewed={d.humanReviewed}
            reason={d.reason}
            evidence={d.evidence}
            missingInformation={d.missingInformation}
            suggestion={d.suggestion}
            reviewNote={d.reviewNote}
            onReviewClick={() =>
              setReviewTarget({
                type: "dimension",
                id: d.dimensionId,
                name: d.dimensionName,
                aiStatus: d.aiStatus,
                finalStatus: d.finalStatus,
                reviewNote: d.reviewNote,
              })
            }
          />
        ))}

        {report.customRuleResults.length > 0 && (
          <div className="pt-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              自定义规则命中
            </p>
            <div className="space-y-3">
              {report.customRuleResults.map((r) => (
                <DimensionCard
                  key={r.ruleId}
                  title={r.ruleName}
                  aiStatus={r.aiStatus}
                  finalStatus={r.finalStatus}
                  reviewRequired={r.reviewRequired}
                  humanReviewed={r.humanReviewed}
                  reason={r.reason}
                  evidence={r.evidence}
                  missingInformation={[]}
                  suggestion={r.suggestion}
                  reviewNote={r.reviewNote}
                  onReviewClick={() =>
                    setReviewTarget({
                      type: "custom",
                      id: r.ruleId,
                      name: r.ruleName,
                      aiStatus: r.aiStatus,
                      finalStatus: r.finalStatus,
                      reviewNote: r.reviewNote,
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <ManualReviewModal
        key={reviewTarget ? `${reviewTarget.type}:${reviewTarget.id}` : "review-closed"}
        open={reviewTarget !== null}
        targetName={reviewTarget?.name ?? ""}
        aiStatus={reviewTarget?.aiStatus ?? "pass"}
        currentFinalStatus={reviewTarget?.finalStatus ?? "pass"}
        currentReviewNote={reviewTarget?.reviewNote}
        onClose={() => setReviewTarget(null)}
        onSave={(finalStatus, note) => {
          if (!reviewTarget) return;
          if (reviewTarget.type === "dimension") {
            onUpdateDimension(reviewTarget.id, finalStatus, note);
          } else {
            onUpdateCustomRule(reviewTarget.id, finalStatus, note);
          }
          setReviewTarget(null);
        }}
      />
    </div>
  );
}
