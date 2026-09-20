import { describe, expect, it } from "vitest";
import { validateEvidence } from "../lib/evidence-validator";
import type { DialogueTurn } from "../lib/types";

const turns: DialogueTurn[] = [
  { turnId: 1, role: "customer", text: "你们保证收益吗？" },
  { turnId: 2, role: "sales", text: "不能保证，投资有风险。" },
];

describe("validateEvidence", () => {
  it("accepts evidence that is a real, verbatim sales quote", () => {
    const { valid, invalidCount } = validateEvidence(
      [{ turn_id: 2, role: "sales", quote: "不能保证，投资有风险。" }],
      turns
    );
    expect(valid).toEqual([{ turnId: 2, role: "sales", quote: "不能保证，投资有风险。" }]);
    expect(invalidCount).toBe(0);
  });

  it("rejects evidence pointing at a customer turn, even if the model labels it as sales", () => {
    const { valid, invalidCount } = validateEvidence(
      [{ turn_id: 1, role: "sales", quote: "你们保证收益吗？" }],
      turns
    );
    expect(valid).toHaveLength(0);
    expect(invalidCount).toBe(1);
  });

  it("rejects a quote that does not exist verbatim in the original turn", () => {
    const { valid, invalidCount } = validateEvidence(
      [{ turn_id: 2, role: "sales", quote: "保证收益" }],
      turns
    );
    expect(valid).toHaveLength(0);
    expect(invalidCount).toBe(1);
  });

  it("rejects a turn_id that does not exist in the dialogue", () => {
    const { valid, invalidCount } = validateEvidence(
      [{ turn_id: 99, role: "sales", quote: "不能保证" }],
      turns
    );
    expect(valid).toHaveLength(0);
    expect(invalidCount).toBe(1);
  });

  it("handles a mix of valid and invalid evidence independently", () => {
    const { valid, invalidCount } = validateEvidence(
      [
        { turn_id: 2, role: "sales", quote: "不能保证，投资有风险。" },
        { turn_id: 1, role: "sales", quote: "你们保证收益吗？" },
      ],
      turns
    );
    expect(valid).toHaveLength(1);
    expect(invalidCount).toBe(1);
  });

  it("returns no valid evidence for an empty or missing evidence list", () => {
    expect(validateEvidence([], turns)).toEqual({ valid: [], invalidCount: 0 });
    expect(validateEvidence(undefined, turns)).toEqual({ valid: [], invalidCount: 0 });
  });
});
