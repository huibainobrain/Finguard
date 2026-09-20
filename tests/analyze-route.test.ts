import { describe, expect, it } from "vitest";
import { POST } from "../app/api/analyze/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const dummyModelConfig = {
  apiKey: "test-key",
  // 指向一个不会被真正访问的地址：只要输入校验在调用模型之前就拒绝，
  // 这个地址永远不会被请求到。
  baseUrl: "http://localhost:1/v1",
  modelName: "test-model",
};

describe("POST /api/analyze — 输入校验必须在调用模型之前拦截", () => {
  it("rejects a dialogue with only customer turns and never calls the model", async () => {
    const response = await POST(
      makeRequest({
        dialogue: "客户：这个产品能保证收益吗？",
        modelConfig: dummyModelConfig,
        customRules: [],
      })
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("未检测到销售发言");
  });

  it("rejects empty dialogue input", async () => {
    const response = await POST(
      makeRequest({ dialogue: "", modelConfig: dummyModelConfig, customRules: [] })
    );
    expect(response.status).toBe(400);
  });

  it("rejects a request missing model configuration", async () => {
    const response = await POST(
      makeRequest({ dialogue: "销售：您好，请问有什么可以帮您？", customRules: [] })
    );
    expect(response.status).toBe(400);
  });
});
