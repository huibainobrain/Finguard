import { NextResponse } from "next/server";
import { ModelTestRequestSchema } from "@/lib/schemas";
import { callChatCompletion, ModelClientError } from "@/lib/model-client";

export const runtime = "nodejs";

// 注意：本文件严禁 console.log request body / apiKey，避免密钥进入日志。
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "请求格式错误。" },
      { status: 400 }
    );
  }

  const parsed = ModelTestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "请完整填写 API Key、Base URL 和 Model Name。" },
      { status: 400 }
    );
  }

  try {
    const content = await callChatCompletion(
      parsed.data,
      [
        {
          role: "system",
          content: "You are a connectivity test assistant. Follow the user instruction exactly.",
        },
        { role: "user", content: "Respond exactly with OK." },
      ],
      { timeoutMs: 20_000, temperature: 0 }
    );

    return NextResponse.json({
      success: true,
      message: "模型连接成功",
      reply: content.trim().slice(0, 50),
    });
  } catch (err) {
    const message =
      err instanceof ModelClientError
        ? err.message
        : "连接失败，请检查 Base URL、API Key 或 Model Name。";
    return NextResponse.json({ success: false, error: message });
  }
}
