import { ErrorCategory } from './types';

export class ProviderApiError extends Error {
  statusCode?: number;
  category: ErrorCategory;
  retryAfterMs?: number;

  constructor(message: string, category: ErrorCategory, statusCode?: number, retryAfterMs?: number) {
    super(message);
    this.name = 'ProviderApiError';
    this.category = category;
    this.statusCode = statusCode;
    this.retryAfterMs = retryAfterMs;
  }
}

export interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callGroqChat(
  apiKey: string,
  model: string,
  messages: GroqChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  }
): Promise<{ text: string; latencyMs: number; usage?: any }> {
  const timeoutMs = options?.timeoutMs || 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.5,
        max_tokens: options?.maxTokens ?? 1024,
      }),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      let errorBody: any = {};
      try {
        errorBody = await res.json();
      } catch {
        // Safe ignore
      }

      const status = res.status;
      const errorMsg =
        errorBody?.error?.message ||
        `Groq API responded with status ${status}: ${res.statusText}`;

      // 429 Rate Limit
      if (status === 429) {
        let retryAfterMs = 30000; // default 30s
        const retryHeader = res.headers.get('retry-after');
        if (retryHeader) {
          const parsedSeconds = parseFloat(retryHeader);
          if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
            retryAfterMs = Math.ceil(parsedSeconds * 1000);
          }
        }
        throw new ProviderApiError(errorMsg, 'RATE_LIMIT', status, retryAfterMs);
      }

      // 401 or 403 Auth
      const lowerMsg = errorMsg.toLowerCase();
      if (
        status === 401 ||
        status === 403 ||
        lowerMsg.includes('invalid api key') ||
        lowerMsg.includes('invalid_api_key')
      ) {
        throw new ProviderApiError(errorMsg, 'AUTH_FAILURE', status);
      }

      // 404 Model Not Found
      if (status === 404) {
        throw new ProviderApiError(errorMsg, 'MODEL_NOT_FOUND', status);
      }

      // 400 Bad Request
      if (status === 400) {
        throw new ProviderApiError(errorMsg, 'INVALID_REQUEST', status);
      }

      // 5xx Server Errors
      if (status >= 500) {
        throw new ProviderApiError(errorMsg, 'TRANSIENT_SERVER_ERROR', status);
      }

      throw new ProviderApiError(errorMsg, 'UNKNOWN', status);
    }

    const data: any = await res.json();
    const replyText = data?.choices?.[0]?.message?.content?.trim() || '';

    return {
      text: replyText,
      latencyMs,
      usage: data?.usage,
    };
  } catch (err: any) {
    if (err instanceof ProviderApiError) {
      throw err;
    }

    if (err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('aborted')) {
      throw new ProviderApiError(`Groq API request timed out after ${timeoutMs}ms`, 'TIMEOUT', 408);
    }

    if (
      err.code === 'ECONNRESET' ||
      err.code === 'ENOTFOUND' ||
      err.code === 'ECONNREFUSED' ||
      err.message?.includes('fetch failed')
    ) {
      throw new ProviderApiError(`Network error communicating with Groq: ${err.message}`, 'NETWORK_ERROR');
    }

    throw new ProviderApiError(err.message || 'Unknown error calling Groq', 'UNKNOWN');
  } finally {
    clearTimeout(timeoutId);
  }
}
