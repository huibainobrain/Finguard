import type { ModelConfig } from "./types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type ModelClientErrorCode =
  | "network"
  | "timeout"
  | "http"
  | "invalid_response";

export class ModelClientError extends Error {
  code: ModelClientErrorCode;
  status?: number;

  constructor(message: string, code: ModelClientErrorCode, status?: number) {
    super(message);
    this.name = "ModelClientError";
    this.code = code;
    this.status = status;
  }
}

/**
 * 统一处理用户填写的 Base URL：
 * - 去掉结尾多余的 "/"；
 * - 如果用户已经填了完整的 .../chat/completions，直接复用，避免拼接出
 *   ".../v1//chat/completions" 这类重复路径。
 */
export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl);
  if (/\/chat\/completions$/i.test(normalized)) {
    return normalized;
  }
  return `${normalized}/chat/completions`;
}

interface CallChatCompletionOptions {
  timeoutMs?: number;
  temperature?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * 调用 OpenAI Compatible 的 /chat/completions 接口。
 *
 * 安全约束：本函数及其调用方不得 console.log request body / headers /
 * config.apiKey，避免密钥进入日志。
 */
export async function callChatCompletion(
  config: ModelConfig,
  messages: ChatMessage[],
  options: CallChatCompletionOptions = {}
): Promise<string> {
  const url = buildChatCompletionsUrl(config.baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelName,
        messages,
        temperature: options.temperature ?? 0,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ModelClientError("模型请求超时，请重试。", "timeout");
    }
    throw new ModelClientError(
      "网络请求失败，请检查 Base URL 是否可访问。",
      "network"
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new ModelClientError(
      describeHttpError(response.status),
      "http",
      response.status
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ModelClientError("模型返回内容无法解析。", "invalid_response");
  }

  const content = extractMessageContent(data);
  if (content == null) {
    throw new ModelClientError(
      "模型返回内容为空或格式异常。",
      "invalid_response"
    );
  }

  return content;
}

function describeHttpError(status: number): string {
  if (status === 401 || status === 403) {
    return "鉴权失败，请检查 API Key 是否正确。";
  }
  if (status === 404) {
    return "请求地址不存在，请检查 Base URL 或 Model Name。";
  }
  if (status === 429) {
    return "请求过于频繁或额度不足，请稍后再试。";
  }
  if (status >= 500) {
    return "模型服务暂时不可用，请稍后再试。";
  }
  return "连接失败，请检查 Base URL、API Key 或 Model Name。";
}

function extractMessageContent(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const first = choices[0];
  if (typeof first !== "object" || first === null) return null;

  const message = (first as { message?: unknown }).message;
  if (typeof message !== "object" || message === null) return null;

  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : null;
}
