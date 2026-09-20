"use client";

import type { ReactNode } from "react";

export type Tab = "single" | "batch";

export interface AppHeaderProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  modelConfigured: boolean;
  onOpenModelSettings: () => void;
  onOpenCustomRules: () => void;
}

export function AppHeader({
  tab,
  onTabChange,
  modelConfigured,
  onOpenModelSettings,
  onOpenCustomRules,
}: AppHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <span className="text-base font-bold tracking-tight text-slate-800">
            FinGuard <span className="font-normal text-slate-400">| 金融销售对话合规质检</span>
          </span>
          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <TabButton active={tab === "single"} onClick={() => onTabChange("single")}>
              单条质检
            </TabButton>
            <TabButton active={tab === "batch"} onClick={() => onTabChange("batch")}>
              批量质检
            </TabButton>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCustomRules}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            自定义规则
          </button>
          <button
            type="button"
            onClick={onOpenModelSettings}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              modelConfigured
                ? "border-slate-300 text-slate-600 hover:bg-slate-50"
                : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            模型设置{!modelConfigured && " · 未配置"}
          </button>
        </div>
      </div>
    </header>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
