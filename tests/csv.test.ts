import { describe, expect, it } from "vitest";
import { parseBatchCsv } from "../lib/csv";

describe("parseBatchCsv", () => {
  it("parses a valid CSV with id and dialogue columns", () => {
    const csv = 'id,dialogue\n001,"销售：您好\n客户：能保证本金吗？"\n002,"销售：放心，不会亏。"';
    const result = parseBatchCsv(csv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].id).toBe("001");
      expect(result.rows[0].dialogueText).toContain("客户：能保证本金吗？");
    }
  });

  it("rejects a CSV missing the required columns", () => {
    const csv = "id,text\n001,你好";
    const result = parseBatchCsv(csv);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("需要包含 id 和 dialogue 两列");
    }
  });

  it("rejects a CSV that contains duplicate ids", () => {
    const csv = 'id,dialogue\n001,"销售：您好"\n001,"销售：放心，不会亏。"';
    const result = parseBatchCsv(csv);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("重复 id");
    }
  });

  it("accepts unique, non-consecutive ids", () => {
    const csv = 'id,dialogue\n001,"销售：您好"\n002,"销售：放心，不会亏。"\n003,"销售：不能保证。"';
    const result = parseBatchCsv(csv);
    expect(result.success).toBe(true);
  });
});
