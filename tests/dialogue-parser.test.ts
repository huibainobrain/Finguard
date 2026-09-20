import { describe, expect, it } from "vitest";
import { parseDialogue } from "../lib/dialogue-parser";

describe("parseDialogue", () => {
  it("parses Chinese colon roles", () => {
    const result = parseDialogue("销售：你好\n客户：你好");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.turns).toEqual([
        { turnId: 1, role: "sales", text: "你好" },
        { turnId: 2, role: "customer", text: "你好" },
      ]);
    }
  });

  it("parses English colon roles", () => {
    const result = parseDialogue("销售:你好\n客户:你好");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.turns[0].role).toBe("sales");
      expect(result.turns[1].role).toBe("customer");
    }
  });

  it("preserves speaking order regardless of who starts the conversation", () => {
    const result = parseDialogue("客户：你好\n销售：您好，有什么可以帮您？");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.turns.map((t) => t.role)).toEqual(["customer", "sales"]);
    }
  });

  it("treats a line without a role marker as a continuation of the previous turn", () => {
    const result = parseDialogue("销售：第一行\n第二行\n客户：好的");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.turns).toHaveLength(2);
      expect(result.turns[0]).toEqual({ turnId: 1, role: "sales", text: "第一行\n第二行" });
    }
  });

  it("ignores leading text before any recognizable role", () => {
    const result = parseDialogue("以下是通话记录\n销售：您好");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.turns).toHaveLength(1);
      expect(result.turns[0].text).toBe("您好");
    }
  });

  it("rejects empty input", () => {
    const result = parseDialogue("   ");
    expect(result.success).toBe(false);
  });

  it("rejects input without any recognizable role and does not throw", () => {
    const result = parseDialogue("这是一段完全没有角色标记的文本。");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("未识别到有效角色");
    }
  });

  it("rejects a dialogue with only customer turns and no sales turn", () => {
    const result = parseDialogue("客户：这个产品能保证收益吗？");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("未检测到销售发言");
    }
  });

  it("allows a dialogue with only sales turns and no customer turn", () => {
    const result = parseDialogue("销售：这个产品保证收益，肯定不会亏。");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.turns).toEqual([{ turnId: 1, role: "sales", text: "这个产品保证收益，肯定不会亏。" }]);
    }
  });
});
