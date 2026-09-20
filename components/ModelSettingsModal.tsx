"use client";

import { useState, type ReactNode } from "react";
import type { ModelConfig } from "@/lib/types";
import { Modal } from "./Modal";

export interface ModelSettingsModalProps {
  open: boolean;
  initialConfig: ModelConfig | null;
  onClose: () => void;
  onSave: (config: ModelConfig) => void;
}

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const inputClass =
  "mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function ModelSettingsModal({
  open,
  initialConfig,
  onClose,
  onSave,
}: ModelSettingsModalProps) {
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey ?? "");
  const [baseUrl, setBaseUrl] = useState(initialConfig?.baseUrl ?? "");
  const [modelName, setModelName] = useState(initialConfig?.modelName ?? "");
  const [testState, setTestState] = useState<TestState>({ status: "idle" });

  const canSubmit = Boolean(apiKey.trim() && baseUrl.trim() && modelName.trim());

  async function handleTestConnection() {
    if (!canSubmit) {
      setTestState({
        status: "error",
        message: "请先完整填写 API Key、Base URL 和 Model Name。",
      });
      return;
    }
    setTestState({ status: "testing" });
    try {
      const res = await fetch("/api/model/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim(),
          modelName: modelName.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestState({ status: "success", message: data.message ?? "模型连接成功" });
      } else {
        setTestState({
          status: "error",
          message: data.error ?? "连接失败，请检查 Base URL、API Key 或 Model Name。",
        });
      }
    } catch {
      setTestState({ status: "error", message: "网络请求失败，请检查本地网络或 Base URL。" });
    }
  }

  function handleSave() {
    if (!canSubmit) return;
    onSave({ apiKey: apiKey.trim(), baseUrl: baseUrl.trim(), modelName: modelName.trim() });
  }

  return (
    <Modal open={open} title="模型设置" onClose={onClose}>
      <div className="space-y-4">
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
          模型配置仅保存在当前页面运行状态中，不会写入日志、Cookie、localStorage 或服务器文件；刷新页面后需要重新填写。分析请求会由本地服务端使用该配置调用一次模型接口，密钥不会被记录或转发到其他地方。
        </p>

        <Field label="API Key">
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className={inputClass}
          />
        </Field>

        <Field label="Base URL">
          <input
            type="text"
            autoComplete="off"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className={inputClass}
          />
        </Field>

        <Field label="Model Name">
          <input
            type="text"
            autoComplete="off"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="gpt-4o-mini"
            className={inputClass}
          />
        </Field>

        {testState.status === "success" && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {testState.message}
          </p>
        )}
        {testState.status === "error" && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {testState.message}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testState.status === "testing"}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {testState.status === "testing" ? "测试中…" : "测试连接"}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSubmit}
              className="rounded-md bg-slate-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
