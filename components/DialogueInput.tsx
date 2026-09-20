"use client";

import { useRef, useState, type ChangeEvent } from "react";

const EXAMPLES: { label: string; text: string }[] = [
  {
    label: "正常示例",
    text: "销售：这款产品历史表现比较稳定，但历史表现不代表未来收益。\n客户：能保证本金吗？\n销售：不能保证，投资存在本金亏损风险。",
  },
  {
    label: "明确违规",
    text: "销售：这款产品你可以放心买，保证本金，而且年化至少能做到8%。\n客户：真的不会亏吗？\n销售：放心，不会亏。",
  },
  {
    label: "Bad Case",
    text: "客户：这个产品能保证收益吗？\n销售：不能保证，任何投资都存在亏损风险。",
  },
];

export interface DialogueInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isAnalyzing: boolean;
  errorMessage?: string | null;
}

export function DialogueInput({
  value,
  onChange,
  onSubmit,
  isAnalyzing,
  errorMessage,
}: DialogueInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setUploadError("仅支持上传 .txt 文件。");
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      onChange(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => setUploadError("文件读取失败，请重试。");
    reader.readAsText(file, "utf-8");
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">对话输入</h2>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          上传 TXT
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          hidden
          onChange={handleFileSelect}
        />
      </div>

      <p className="-mt-2 text-xs text-slate-400">
        请使用“销售：”“客户：”标记发言角色，系统将结合角色和上下文进行合规判断。
      </p>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        placeholder={
          "销售：这款产品近期表现比较稳定。\n客户：能保证本金吗？\n销售：不能保证，投资存在本金亏损风险。"
        }
        className="w-full flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed focus:border-slate-400 focus:outline-none"
      />
      {uploadError && <p className="text-xs text-rose-500">{uploadError}</p>}

      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-400">内置示例</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => onChange(ex.text)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{errorMessage}</p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={isAnalyzing}
        className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAnalyzing ? "正在分析…" : "开始质检"}
      </button>
    </div>
  );
}
