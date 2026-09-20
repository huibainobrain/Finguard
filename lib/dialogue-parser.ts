import type { DialogueTurn, Role } from "./types";

export type ParseDialogueResult =
  | { success: true; turns: DialogueTurn[] }
  | { success: false; error: string };

export const NO_ROLE_RECOGNIZED_MESSAGE =
  "未识别到有效角色，请使用“销售：”“客户：”标记发言。";

export const EMPTY_INPUT_MESSAGE = "对话内容不能为空，请输入销售与客户的对话文本。";

export const NO_SALES_TURN_MESSAGE =
  "未检测到销售发言，无法进行销售合规质检。";

// 支持中文冒号“：”与英文冒号“:”，标签前后允许空白。
const ROLE_LINE_PATTERN = /^(销售|客户)\s*[:：]\s*(.*)$/;

/**
 * 将原始文本解析为带角色的对话轮次。
 * 没有角色标记的行，如果前面已存在合法角色，则视为上一轮的续行；
 * 否则忽略（例如开头的说明性文字）。
 */
export function parseDialogue(raw: string): ParseDialogueResult {
  if (!raw || !raw.trim()) {
    return { success: false, error: EMPTY_INPUT_MESSAGE };
  }

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const turns: DialogueTurn[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(ROLE_LINE_PATTERN);
    if (match) {
      const roleLabel = match[1];
      const text = match[2].trim();
      const role: Role = roleLabel === "销售" ? "sales" : "customer";
      turns.push({ turnId: turns.length + 1, role, text });
      continue;
    }

    if (turns.length > 0) {
      const lastTurn = turns[turns.length - 1];
      lastTurn.text = lastTurn.text ? `${lastTurn.text}\n${line}` : line;
    }
    // 在识别到第一个合法角色之前出现的无角色行直接忽略。
  }

  if (turns.length === 0) {
    return { success: false, error: NO_ROLE_RECOGNIZED_MESSAGE };
  }

  const hasSalesTurn = turns.some((t) => t.role === "sales");
  if (!hasSalesTurn) {
    return { success: false, error: NO_SALES_TURN_MESSAGE };
  }

  return { success: true, turns };
}
