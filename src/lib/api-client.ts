// クライアント用APIヘルパー: タイムアウト付きPOST + 安全なJSON解釈 + 429の日本語化。
// 全フックは生fetchではなく本モジュールを使うこと（ぶら下がりローディング防止）。
"use client";

import { copy } from "@/lib/copy";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type ApiPostOptions = {
  /** ミリ秒。既定20秒。AI生成系は長めに指定する。 */
  timeoutMs?: number;
  /** 予期せぬ失敗時に表示する文言。 */
  errorMessage: string;
};

export async function apiPost<T>(path: string, body: unknown, options: ApiPostOptions): Promise<T> {
  const { timeoutMs = 20_000, errorMessage } = options;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new ApiError(copy.common.rateLimited, 429, "RATE_LIMITED");
      }
      const data = await response.json().catch((): unknown => null);
      const message =
        data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? (data.error as string)
          : errorMessage;
      throw new ApiError(message, response.status);
    }

    return (await response.json().catch(() => {
      throw new ApiError(errorMessage, 502);
    })) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(copy.common.timeout, 408, "TIMEOUT");
    }
    throw new ApiError(errorMessage, 0);
  } finally {
    window.clearTimeout(timer);
  }
}
