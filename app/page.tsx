"use client";

import { useState } from "react";
import { AppHeader, type Tab } from "@/components/AppHeader";
import { BatchInspection } from "@/components/BatchInspection";
import { CustomRulesModal } from "@/components/CustomRulesModal";
import { ModelSettingsModal } from "@/components/ModelSettingsModal";
import { SingleInspection } from "@/components/SingleInspection";
import type { CustomRule, ModelConfig } from "@/lib/types";

const CUSTOM_RULES_STORAGE_KEY = "finguard.customRules.v1";

function loadStoredCustomRules(): CustomRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_RULES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomRule[]) : [];
  } catch {
    // 本地存储不可用时忽略，不影响核心质检功能。
    return [];
  }
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("single");
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [isModelModalOpen, setModelModalOpen] = useState(false);
  const [isRulesModalOpen, setRulesModalOpen] = useState(false);
  // 自定义规则不含密钥，允许持久化到 localStorage；模型配置只保留在内存中。
  const [customRules, setCustomRules] = useState<CustomRule[]>(loadStoredCustomRules);

  function handleCustomRulesChange(rules: CustomRule[]) {
    setCustomRules(rules);
    try {
      window.localStorage.setItem(CUSTOM_RULES_STORAGE_KEY, JSON.stringify(rules));
    } catch {
      // 忽略持久化失败（例如隐私模式下 localStorage 被禁用）。
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader
        tab={tab}
        onTabChange={setTab}
        modelConfigured={modelConfig !== null}
        onOpenModelSettings={() => setModelModalOpen(true)}
        onOpenCustomRules={() => setRulesModalOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-6">
        {tab === "single" ? (
          <SingleInspection
            modelConfig={modelConfig}
            customRules={customRules}
            onRequireModelSetup={() => setModelModalOpen(true)}
          />
        ) : (
          <BatchInspection
            modelConfig={modelConfig}
            customRules={customRules}
            onRequireModelSetup={() => setModelModalOpen(true)}
          />
        )}
      </main>

      <ModelSettingsModal
        key={isModelModalOpen ? "model-settings-open" : "model-settings-closed"}
        open={isModelModalOpen}
        initialConfig={modelConfig}
        onClose={() => setModelModalOpen(false)}
        onSave={(config) => {
          setModelConfig(config);
          setModelModalOpen(false);
        }}
      />

      <CustomRulesModal
        open={isRulesModalOpen}
        rules={customRules}
        onChange={handleCustomRulesChange}
        onClose={() => setRulesModalOpen(false)}
      />
    </div>
  );
}
