"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { exportBatchResultsToCsv, parseBatchCsv } from "@/lib/csv";
import { buildJsonReport, buildMarkdownReport, downloadTextFile } from "@/lib/report-export";
import { applyManualReview, computeOverallRisk } from "@/lib/risk-aggregator";
import { BATCH_STATUS_LABEL } from "@/lib/types";
import type {
  BatchItem,
  BatchRow,
  CustomRule,
  InspectionReport as ReportType,
  ModelConfig,
} from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { InspectionReport } from "./InspectionReport";
import { Modal } from "./Modal";
import { OverallRiskBadge } from "./RiskBadge";

export interface BatchInspectionProps {
  modelConfig: ModelConfig | null;
  customRules: CustomRule[];
  onRequireModelSetup: () => void;
}

export function BatchInspection({
  modelConfig,
  customRules,
  onRequireModelSetup,
}: BatchInspectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<BatchRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [startBlockedMessage, setStartBlockedMessage] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const result = parseBatchCsv(text);
      if (!result.success) {
        setCsvError(result.error);
        setCsvRows([]);
        setItems([]);
        return;
      }
      setCsvError(null);
      setCsvRows(result.rows);
      setItems([]);
    };
    reader.onerror = () => setCsvError("文件读取失败，请重试。");
    reader.readAsText(file, "utf-8");
  }

  async function handleStart() {
    if (csvRows.length === 0 || isRunning) return;
    if (!modelConfig) {
      setStartBlockedMessage("尚未配置模型，请先完成模型设置。");
      onRequireModelSetup();
      return;
    }
    setStartBlockedMessage(null);

    const initialItems: BatchItem[] = csvRows.map((row) => ({
      id: row.id,
      dialogueText: row.dialogueText,
      status: "waiting",
    }));
    setItems(initialItems);
    setIsRunning(true);

    // 顺序执行：一条失败记录失败原因并继续下一条，不中止整个批次。
    for (const row of initialItems) {
      setItems((prev) =>
        prev.map((it) => (it.id === row.id ? { ...it, status: "analyzing" } : it))
      );

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dialogue: row.dialogueText, modelConfig, customRules }),
        });
        const data = await res.json();
        if (!res.ok || !data.report) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === row.id ? { ...it, status: "failed", error: data.error ?? "分析失败" } : it
            )
          );
          continue;
        }
        setItems((prev) =>
          prev.map((it) =>
            it.id === row.id ? { ...it, status: "done", report: data.report as ReportType } : it
          )
        );
      } catch {
        setItems((prev) =>
          prev.map((it) => (it.id === row.id ? { ...it, status: "failed", error: "网络请求失败" } : it))
        );
      }
    }

    setIsRunning(false);
  }

  function handleExportCsv() {
    if (items.length === 0) return;
    const csv = exportBatchResultsToCsv(items);
    downloadTextFile(`finguard-batch-${Date.now()}.csv`, csv, "text/csv");
  }

  const detailItem = items.find((it) => it.id === detailId) ?? null;

  function updateDetailReport(mutator: (report: ReportType) => ReportType) {
    if (!detailId) return;
    setItems((prev) =>
      prev.map((it) => (it.id === detailId && it.report ? { ...it, report: mutator(it.report) } : it))
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">上传批量对话 CSV</h2>
            <p className="mt-1 text-xs text-slate-400">
              固定格式：需要包含 id、dialogue 两列，dialogue 内可包含换行，使用标准 CSV 引号转义。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              选择文件
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={handleStart}
              disabled={csvRows.length === 0 || isRunning}
              className="rounded-md bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
            >
              {isRunning ? "分析中…" : "开始批量质检"}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={items.length === 0}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              导出 CSV
            </button>
          </div>
        </div>

        {csvError && (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{csvError}</p>
        )}
        {startBlockedMessage && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {startBlockedMessage}
          </p>
        )}

        {csvRows.length > 0 && items.length === 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-emerald-600">已识别 {csvRows.length} 条对话</p>
            <div className="space-y-0.5 rounded-md border border-slate-100 bg-slate-50 p-2 text-xs text-slate-500">
              {csvRows.slice(0, 3).map((row) => (
                <p key={row.id} className="truncate">
                  #{row.id}：{row.dialogueText.replace(/\n/g, " / ")}
                </p>
              ))}
              {csvRows.length > 3 && <p>……共 {csvRows.length} 条</p>}
            </div>
          </div>
        )}
      </section>

      <section className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {items.length === 0 ? (
          <EmptyState
            title="暂无批量结果"
            description="上传 CSV 并点击“开始批量质检”后，结果会展示在这里。"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">总体风险</th>
                  <th className="py-2 pr-4">状态</th>
                  <th className="py-2 pr-4">高风险维度</th>
                  <th className="py-2 pr-4">需人工复核</th>
                  <th className="py-2 pr-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const highRiskDims = item.report?.dimensions
                    .filter((d) => d.finalStatus === "high")
                    .map((d) => d.dimensionName)
                    .join("、");
                  const reviewRequired = item.report
                    ? item.report.dimensions.some((d) => d.reviewRequired && !d.humanReviewed) ||
                      item.report.customRuleResults.some(
                        (r) => r.matched && r.reviewRequired && !r.humanReviewed
                      )
                    : false;
                  return (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-medium text-slate-700">{item.id}</td>
                      <td className="py-2 pr-4">
                        {item.report ? (
                          <OverallRiskBadge overall={item.report.overallRisk} size="sm" />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2 pr-4 text-slate-500">
                        {BATCH_STATUS_LABEL[item.status]}
                        {item.status === "failed" && item.error && (
                          <span className="ml-1 text-xs text-rose-500">（{item.error}）</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-slate-500">{highRiskDims || "-"}</td>
                      <td className="py-2 pr-4 text-slate-500">
                        {item.report ? (reviewRequired ? "是" : "否") : "-"}
                      </td>
                      <td className="py-2 pr-4">
                        {item.report ? (
                          <button
                            type="button"
                            onClick={() => setDetailId(item.id)}
                            className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
                          >
                            查看
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={detailItem !== null}
        title={`质检详情 · ${detailItem?.id ?? ""}`}
        onClose={() => setDetailId(null)}
        widthClassName="max-w-3xl"
      >
        {detailItem?.report && (
          <InspectionReport
            report={detailItem.report}
            onUpdateDimension={(dimensionId, finalStatus, reviewNote) =>
              updateDetailReport((report) => {
                const dimensions = report.dimensions.map((d) =>
                  d.dimensionId === dimensionId ? applyManualReview(d, finalStatus, reviewNote) : d
                );
                return {
                  ...report,
                  dimensions,
                  overallRisk: computeOverallRisk(dimensions, report.customRuleResults),
                };
              })
            }
            onUpdateCustomRule={(ruleId, finalStatus, reviewNote) =>
              updateDetailReport((report) => {
                const customRuleResults = report.customRuleResults.map((r) =>
                  r.ruleId === ruleId ? applyManualReview(r, finalStatus, reviewNote) : r
                );
                return {
                  ...report,
                  customRuleResults,
                  overallRisk: computeOverallRisk(report.dimensions, customRuleResults),
                };
              })
            }
            onExportMarkdown={() => {
              if (detailItem.report) {
                downloadTextFile(
                  `finguard-report-${detailItem.id}.md`,
                  buildMarkdownReport(detailItem.report),
                  "text/markdown"
                );
              }
            }}
            onExportJson={() => {
              if (detailItem.report) {
                downloadTextFile(
                  `finguard-report-${detailItem.id}.json`,
                  buildJsonReport(detailItem.report),
                  "application/json"
                );
              }
            }}
          />
        )}
      </Modal>
    </div>
  );
}
