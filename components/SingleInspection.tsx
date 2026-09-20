"use client";

import { useState } from "react";
import { parseDialogue } from "@/lib/dialogue-parser";
import { buildJsonReport, buildMarkdownReport, buildReportFilename, downloadTextFile } from "@/lib/report-export";
import { applyManualReview, computeOverallRisk } from "@/lib/risk-aggregator";
import type {
  AnalysisState,
  CustomRule,
  InspectionReport as ReportType,
  ModelConfig,
  RiskStatus,
} from "@/lib/types";
import { DialogueInput } from "./DialogueInput";
import { EmptyState } from "./EmptyState";
import { InspectionReport } from "./InspectionReport";

export interface SingleInspectionProps {
  modelConfig: ModelConfig | null;
  customRules: CustomRule[];
  onRequireModelSetup: () => void;
}

export function SingleInspection({
  modelConfig,
  customRules,
  onRequireModelSetup,
}: SingleInspectionProps) {
  const [dialogueText, setDialogueText] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [state, setState] = useState<AnalysisState>({ status: "idle" });

  function handleChangeText(text: string) {
    setDialogueText(text);
    if (inputError) setInputError(null);
  }

  async function handleSubmit() {
    // 先做客户端角色解析预校验，无法识别角色时直接阻止分析，不调用模型。
    const parseResult = parseDialogue(dialogueText);
    if (!parseResult.success) {
      setInputError(parseResult.error);
      return;
    }
    setInputError(null);

    if (!modelConfig) {
      setState({ status: "unconfigured" });
      onRequireModelSetup();
      return;
    }

    setState({ status: "analyzing" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dialogue: dialogueText, modelConfig, customRules }),
      });
      const data = await res.json();
      if (!res.ok || !data.report) {
        setState({ status: "error", message: data.error ?? "分析失败，请重试。" });
        return;
      }
      setState({ status: "success", report: data.report as ReportType });
    } catch {
      setState({ status: "error", message: "网络请求失败，请检查本地网络连接。" });
    }
  }

  function updateReport(mutator: (report: ReportType) => ReportType) {
    setState((prev) => {
      if (prev.status !== "success") return prev;
      return { status: "success", report: mutator(prev.report) };
    });
  }

  function handleUpdateDimension(dimensionId: string, finalStatus: RiskStatus, reviewNote: string) {
    updateReport((report) => {
      const dimensions = report.dimensions.map((d) =>
        d.dimensionId === dimensionId ? applyManualReview(d, finalStatus, reviewNote) : d
      );
      return {
        ...report,
        dimensions,
        overallRisk: computeOverallRisk(dimensions, report.customRuleResults),
      };
    });
  }

  function handleUpdateCustomRule(ruleId: string, finalStatus: RiskStatus, reviewNote: string) {
    updateReport((report) => {
      const customRuleResults = report.customRuleResults.map((r) =>
        r.ruleId === ruleId ? applyManualReview(r, finalStatus, reviewNote) : r
      );
      return {
        ...report,
        customRuleResults,
        overallRisk: computeOverallRisk(report.dimensions, customRuleResults),
      };
    });
  }

  function handleExportMarkdown() {
    if (state.status !== "success") return;
    downloadTextFile(
      buildReportFilename("finguard-report", "md"),
      buildMarkdownReport(state.report),
      "text/markdown"
    );
  }

  function handleExportJson() {
    if (state.status !== "success") return;
    downloadTextFile(
      buildReportFilename("finguard-report", "json"),
      buildJsonReport(state.report),
      "application/json"
    );
  }

  return (
    <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <DialogueInput
          value={dialogueText}
          onChange={handleChangeText}
          onSubmit={handleSubmit}
          isAnalyzing={state.status === "analyzing"}
          errorMessage={inputError}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {state.status === "idle" && (
          <EmptyState
            title="尚未开始质检"
            description="粘贴对话或选择内置示例后点击“开始质检”。"
          />
        )}
        {state.status === "unconfigured" && (
          <EmptyState
            title="尚未配置模型"
            description="请先完成模型设置，再开始质检。"
          />
        )}
        {state.status === "analyzing" && (
          <EmptyState title="正在分析销售对话…" description="正在调用模型进行五维合规质检，请稍候。" spinner />
        )}
        {state.status === "error" && (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm font-semibold text-rose-600">分析失败</p>
            <p className="max-w-sm text-xs text-slate-500">{state.message}</p>
            <p className="text-xs text-slate-400">
              可能原因：模型连接失败 / 请求超时 / 模型返回格式异常
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-md bg-slate-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              重新分析
            </button>
          </div>
        )}
        {state.status === "success" && (
          <InspectionReport
            report={state.report}
            onUpdateDimension={handleUpdateDimension}
            onUpdateCustomRule={handleUpdateCustomRule}
            onExportMarkdown={handleExportMarkdown}
            onExportJson={handleExportJson}
          />
        )}
      </section>
    </div>
  );
}
