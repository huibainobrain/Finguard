import { describe, expect, it } from "vitest";
import { checkCustomRuleCompleteness } from "../lib/schemas";

describe("checkCustomRuleCompleteness", () => {
  it("passes when returned rule_ids exactly match the expected set", () => {
    const result = checkCustomRuleCompleteness(
      [{ rule_id: "custom_1" }, { rule_id: "custom_2" }],
      ["custom_1", "custom_2"]
    );
    expect(result.success).toBe(true);
  });

  it("passes when there are no custom rules and none are returned", () => {
    const result = checkCustomRuleCompleteness([], []);
    expect(result.success).toBe(true);
  });

  it("fails when a rule_id is missing from the returned results", () => {
    const result = checkCustomRuleCompleteness([{ rule_id: "custom_1" }], ["custom_1", "custom_2"]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("缺少 rule_id");
      expect(result.error).toContain("custom_2");
    }
  });

  it("fails when an unknown rule_id is returned", () => {
    const result = checkCustomRuleCompleteness(
      [{ rule_id: "custom_1" }, { rule_id: "custom_3" }],
      ["custom_1", "custom_2"]
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("未知 rule_id");
      expect(result.error).toContain("custom_3");
      // custom_2 缺失也应一并报告
      expect(result.error).toContain("缺少 rule_id");
    }
  });

  it("fails when a rule_id is duplicated", () => {
    const result = checkCustomRuleCompleteness(
      [{ rule_id: "custom_1" }, { rule_id: "custom_1" }],
      ["custom_1"]
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("rule_id 重复");
      expect(result.error).toContain("custom_1");
    }
  });
});
