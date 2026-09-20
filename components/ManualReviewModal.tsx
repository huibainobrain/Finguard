"use client";

import { useState } from "react";
import type { RiskStatus } from "@/lib/types";
import { Modal } from "./Modal";
import { RiskBadge } from "./RiskBadge";

const OPTIONS: { value: RiskStatus; label: string }[] = [
  { value: "pass", label: "通过" },
  { value: "warning", label: "提醒" },
  { value: "high", label: "高风险" },
];

export interface ManualReviewModalProps {
  open: boolean;
  targetName: string;
  aiStatus: RiskStatus;
  currentFinalStatus: RiskStatus;
  currentReviewNote?: string;
  onClose: () => void;
  onSave: (finalStatus: RiskStatus, reviewNote: string) => void;
}

export function ManualReviewModal({
  open,
  targetName,
  aiStatus,
  currentFinalStatus,
  currentReviewNote,
  onClose,
  onSave,
}: ManualReviewModalProps) {
  const [finalStatus, setFinalStatus] = useState<RiskStatus>(currentFinalStatus);
  const [note, setNote] = useState(currentReviewNote ?? "");

  return (
    <Modal open={open} title={`修改结论 · ${targetName}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">AI 原始结论</p>
          <div className="mt-1.5">
            <RiskBadge status={aiStatus} />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">人工最终结论</p>
          <div className="mt-2 flex gap-4">
            {OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm text-slate-700">
                <input
                  type="radio"
                  name="finalStatus"
                  value={opt.value}
                  checked={finalStatus === opt.value}
                  onChange={() => setFinalStatus(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400" htmlFor="review-note">
            复核备注
          </label>
          <textarea
            id="review-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            placeholder="例如：已确认客户已完成相关风险测评。"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onSave(finalStatus, note.trim())}
            className="rounded-md bg-slate-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            保存
          </button>
        </div>
      </div>
    </Modal>
  );
}
