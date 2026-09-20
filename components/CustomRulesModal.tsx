"use client";

import { useState } from "react";
import type { CustomRule, CustomRuleRiskLevel } from "@/lib/types";
import { Modal } from "./Modal";
import { RiskBadge } from "./RiskBadge";

export interface CustomRulesModalProps {
  open: boolean;
  rules: CustomRule[];
  onChange: (rules: CustomRule[]) => void;
  onClose: () => void;
}

function createRuleId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function CustomRulesModal({ open, rules, onChange, onClose }: CustomRulesModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [riskLevel, setRiskLevel] = useState<CustomRuleRiskLevel>("warning");

  function handleAdd() {
    if (!name.trim() || !description.trim()) return;
    const rule: CustomRule = {
      id: createRuleId(),
      name: name.trim(),
      description: description.trim(),
      riskLevel,
    };
    onChange([...rules, rule]);
    setName("");
    setDescription("");
    setRiskLevel("warning");
  }

  function handleDelete(id: string) {
    onChange(rules.filter((r) => r.id !== id));
  }

  return (
    <Modal open={open} title="自定义规则" onClose={onClose} widthClassName="max-w-xl">
      <div className="space-y-5">
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
          自定义规则会在分析时附加到大模型 Prompt 中，由模型结合对话上下文判断是否命中；命中结果同样会经过原文证据校验。规则保存在本地浏览器（localStorage），不包含任何密钥信息。
        </p>

        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">规则名称</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：禁止承诺回购"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">规则说明</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="例如：销售不得承诺公司未来一定回购该产品。"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              命中后的风险等级
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as CustomRuleRiskLevel)}
                className="rounded-md border border-slate-200 px-2 py-1 text-sm"
              >
                <option value="warning">提醒</option>
                <option value="high">高风险</option>
              </select>
            </label>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!name.trim() || !description.trim()}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              新增规则
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            当前规则（{rules.length}）
          </p>
          {rules.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
              尚未添加自定义规则。
            </p>
          )}
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{rule.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{rule.description}</p>
                </div>
                <RiskBadge status={rule.riskLevel} size="sm" />
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDelete(rule.id)}
                  className="text-xs font-medium text-rose-500 hover:underline"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
