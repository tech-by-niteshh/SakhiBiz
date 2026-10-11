import { ErrorCategory } from './types';
import { ProviderApiError } from './groqProvider';

export async function callGeminiGenerate(
  apiKey: string,
  model: string,
  prompt: string,
  options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  }
): Promise<{ text: string; latencyMs: number }> {
  const timeoutMs = options?.timeoutMs || 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const bodyPayload: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.4,
        maxOutputTokens: options?.maxTokens ?? 1024,
      },
    };

    if (options?.systemPrompt) {
      bodyPayload.systemInstruction = {
        parts: [{ text: options.systemPrompt }],
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
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
        `Gemini API responded with status ${status}: ${res.statusText}`;

      // 429 Quota or Rate Limit
      if (status === 429 || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        let retryAfterMs = 30000;
        const retryHeader = res.headers.get('retry-after');
        if (retryHeader) {
          const parsed = parseFloat(retryHeader);
          if (!isNaN(parsed) && parsed > 0) retryAfterMs = Math.ceil(parsed * 1000);
        }
        throw new ProviderApiError(errorMsg, 'RATE_LIMIT', 429, retryAfterMs);
      }

      // 400/401/403 with API_KEY_INVALID or permission denied
      const lowerMsg = errorMsg.toLowerCase();
      if (
        status === 401 ||
        status === 403 ||
        (status === 400 && (
          lowerMsg.includes('api_key_invalid') ||
          lowerMsg.includes('api key not valid') ||
          lowerMsg.includes('api key expired') ||
          lowerMsg.includes('invalid api key') ||
          lowerMsg.includes('permission_denied')
        ))
      ) {
        throw new ProviderApiError(errorMsg, 'AUTH_FAILURE', status);
      }

      // 404 Model Not Found
      if (status === 404 || errorMsg.includes('models/')) {
        throw new ProviderApiError(errorMsg, 'MODEL_NOT_FOUND', status);
      }

      // 5xx Server Errors
      if (status >= 500) {
        throw new ProviderApiError(errorMsg, 'TRANSIENT_SERVER_ERROR', status);
      }

      // Bad Request (invalid prompt or safety block)
      if (status === 400) {
        throw new ProviderApiError(errorMsg, 'INVALID_REQUEST', 400);
      }

      throw new ProviderApiError(errorMsg, 'UNKNOWN', status);
    }

    const data: any = await res.json();
    const candidateText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return {
      text: candidateText,
      latencyMs,
    };
  } catch (err: any) {
    if (err instanceof ProviderApiError) {
      throw err;
    }

    if (err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('aborted')) {
      throw new ProviderApiError(`Gemini API request timed out after ${timeoutMs}ms`, 'TIMEOUT', 408);
    }

    if (
      err.code === 'ECONNRESET' ||
      err.code === 'ENOTFOUND' ||
      err.code === 'ECONNREFUSED' ||
      err.message?.includes('fetch failed')
    ) {
      throw new ProviderApiError(`Network error communicating with Gemini: ${err.message}`, 'NETWORK_ERROR');
    }

    throw new ProviderApiError(err.message || 'Unknown error calling Gemini', 'UNKNOWN');
  } finally {
    clearTimeout(timeoutId);
  }
}
