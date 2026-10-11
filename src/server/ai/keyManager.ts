import {
  AiProvider,
  ManagedApiKey,
  AiCompletionOptions,
  AiCompletionResult,
  AiMetrics,
  RequestMetricsEvent,
  ErrorCategory,
} from './types';
import { AiKeyStore } from './keyStore';
import { callGroqChat, GroqChatMessage, ProviderApiError } from './groqProvider';
import { callGeminiGenerate } from './geminiProvider';

class AiKeyManagerService {
  private rrPointers: Record<AiProvider, number> = { groq: 0, gemini: 0 };
  private metrics: AiMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    retriedRequests: 0,
    providers: {
      groq: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        retriedRequests: 0,
        activeKeysCount: 0,
        cooldownKeysCount: 0,
        failedKeysCount: 0,
        disabledKeysCount: 0,
        preferredModel: 'llama-3.3-70b-versatile',
      },
      gemini: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        retriedRequests: 0,
        activeKeysCount: 0,
        cooldownKeysCount: 0,
        failedKeysCount: 0,
        disabledKeysCount: 0,
        preferredModel: 'gemini-2.5-flash',
      },
    },
    recentEvents: [],
  };

  private recordMetricEvent(event: RequestMetricsEvent) {
    this.metrics.totalRequests++;
    if (event.success) {
      this.metrics.successfulRequests++;
      this.metrics.providers[event.provider].successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      this.metrics.providers[event.provider].failedRequests++;
    }
    if (event.retryCount > 0) {
      this.metrics.retriedRequests += event.retryCount;
      this.metrics.providers[event.provider].retriedRequests += event.retryCount;
    }

    this.metrics.recentEvents.unshift(event);
    if (this.metrics.recentEvents.length > 50) {
      this.metrics.recentEvents.pop();
    }
  }

  /**
   * Selects an eligible key for the provider using concurrency-safe round-robin.
   */
  private async selectEligibleKey(
    provider: AiProvider,
    excludedKeyIds: Set<string>
  ): Promise<ManagedApiKey | null> {
    const eligible = await AiKeyStore.getEligibleKeys(provider);
    const filtered = eligible.filter((k) => !excludedKeyIds.has(k.id));

    if (filtered.length === 0) {
      return null;
    }

    const currentPtr = this.rrPointers[provider] % filtered.length;
    const selected = filtered[currentPtr];
    this.rrPointers[provider] = (currentPtr + 1) % filtered.length;

    return selected;
  }

  /**
   * Applies cooldown to a key and all sibling keys sharing the same projectId or orgId.
   */
  private async applyCooldown(
    key: ManagedApiKey,
    cooldownMs: number,
    category: ErrorCategory,
    errorMsg: string
  ) {
    const cooldownUntil = Date.now() + cooldownMs;

    await AiKeyStore.updateKeyStatus(key.id, {
      status: 'TEMPORARILY_UNAVAILABLE',
      cooldownUntil,
      lastErrorCategory: category,
      lastErrorMessage: errorMsg.slice(0, 300),
      failureCount: key.failureCount + 1,
    });

    // If key shares a project or org ID, group the cooldown to prevent bypassing quotas
    if (key.projectId || key.orgId) {
      const allKeys = await AiKeyStore.getKeysByProvider(key.provider);
      for (const sibling of allKeys) {
        if (
          sibling.id !== key.id &&
          ((key.projectId && sibling.projectId === key.projectId) ||
            (key.orgId && sibling.orgId === key.orgId))
        ) {
          await AiKeyStore.updateKeyStatus(sibling.id, {
            status: 'TEMPORARILY_UNAVAILABLE',
            cooldownUntil,
            lastErrorCategory: category,
            lastErrorMessage: `Project/Org quota cooldown inherited from ${key.maskedKey}`,
          });
        }
      }
    }
  }

  /**
   * Executes a single attempt on Groq using the selected key.
   */
  private async executeGroqAttempt(
    key: ManagedApiKey,
    model: string,
    options: AiCompletionOptions,
    timeoutMs: number
  ): Promise<{ text: string; latencyMs: number }> {
    const decryptedKey = AiKeyStore.decryptKey(key);

    const messages: GroqChatMessage[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    if (options.history && options.history.length > 0) {
      options.history.forEach((h) => {
        messages.push({ role: h.role, content: h.text });
      });
    }

    messages.push({ role: 'user', content: options.userPrompt });

    return callGroqChat(decryptedKey, model, messages, {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      timeoutMs,
    });
  }

  /**
   * Executes a single attempt on Gemini using the selected key.
   */
  private async executeGeminiAttempt(
    key: ManagedApiKey,
    model: string,
    options: AiCompletionOptions,
    timeoutMs: number
  ): Promise<{ text: string; latencyMs: number }> {
    const decryptedKey = AiKeyStore.decryptKey(key);

    let fullPrompt = '';
    if (options.history && options.history.length > 0) {
      const historyStr = options.history
        .map((h) => `${h.role === 'user' ? 'Learner' : 'Sakhi'}: ${h.text}`)
        .join('\n');
      fullPrompt = `Previous Conversation:\n${historyStr}\n\nCurrent Question: ${options.userPrompt}`;
    } else {
      fullPrompt = options.userPrompt;
    }

    return callGeminiGenerate(decryptedKey, model, fullPrompt, {
      systemPrompt: options.systemPrompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      timeoutMs,
    });
  }

  /**
   * Attempts completion with a specific provider with round-robin failover across multiple keys.
   */
  private async tryProviderCompletion(
    provider: AiProvider,
    options: AiCompletionOptions
  ): Promise<AiCompletionResult> {
    const config = await AiKeyStore.getProviderConfig(provider);
    const retryBudget = config.retryBudget || 3;
    const model = config.preferredModel;
    const timeoutMs = config.timeoutMs || 8000;

    const triedKeyIds = new Set<string>();
    let attempts = 0;
    let lastError: any = null;

    while (attempts < retryBudget) {
      const key = await this.selectEligibleKey(provider, triedKeyIds);
      if (!key) {
        break; // No more eligible keys for this provider
      }

      triedKeyIds.add(key.id);
      attempts++;

      try {
        let result: { text: string; latencyMs: number };

        if (provider === 'groq') {
          result = await this.executeGroqAttempt(key, model, options, timeoutMs);
        } else {
          result = await this.executeGeminiAttempt(key, model, options, timeoutMs);
        }

        // On success: update key stats and record metric
        await AiKeyStore.updateKeyStatus(key.id, {
          status: 'ACTIVE',
          cooldownUntil: undefined,
          lastUsedAt: new Date().toISOString(),
          lastSuccessAt: new Date().toISOString(),
          successCount: key.successCount + 1,
          failureCount: 0,
        });

        this.recordMetricEvent({
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          provider,
          model,
          keyId: key.id,
          success: true,
          retryCount: attempts - 1,
          latencyMs: result.latencyMs,
        });

        return {
          text: result.text,
          provider,
          model,
          keyId: key.id,
          retries: attempts - 1,
          latencyMs: result.latencyMs,
        };
      } catch (err: any) {
        lastError = err;
        const category: ErrorCategory =
          err instanceof ProviderApiError ? err.category : 'UNKNOWN';

        this.recordMetricEvent({
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          provider,
          model,
          keyId: key.id,
          success: false,
          errorCategory: category,
          retryCount: attempts - 1,
          latencyMs: 0,
        });

        // 1. Authentication failure (401/403): mark key as FAILED (needs investigation)
        if (category === 'AUTH_FAILURE') {
          await AiKeyStore.updateKeyStatus(key.id, {
            status: 'FAILED',
            lastErrorCategory: category,
            lastErrorMessage: err.message.slice(0, 300),
            failureCount: key.failureCount + 1,
          });
          // Continue to next key if available
          continue;
        }

        // 2. Rate limit (429): respect Retry-After header and apply cooldown
        if (category === 'RATE_LIMIT') {
          const cooldownMs =
            err instanceof ProviderApiError && err.retryAfterMs
              ? err.retryAfterMs
              : 30000;
          await this.applyCooldown(key, cooldownMs, category, err.message);
          // Wait brief jittered backoff before trying next key
          const jitter = Math.random() * 200;
          await new Promise((r) => setTimeout(r, jitter));
          continue;
        }

        // 3. Transient 5xx / Timeout / Network error
        if (
          category === 'TRANSIENT_SERVER_ERROR' ||
          category === 'TIMEOUT' ||
          category === 'NETWORK_ERROR'
        ) {
          await this.applyCooldown(key, 8000, category, err.message);
          // Bounded exponential backoff with jitter
          const backoff = Math.min(1500, 200 * Math.pow(1.5, attempts)) + Math.random() * 100;
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }

        // 4. Permanent client errors (400 Invalid Request / 404 Model Not Found)
        if (category === 'INVALID_REQUEST' || category === 'MODEL_NOT_FOUND') {
          await AiKeyStore.updateKeyStatus(key.id, {
            lastErrorCategory: category,
            lastErrorMessage: err.message.slice(0, 300),
          });
          // Do not retry client error indefinitely
          throw err;
        }

        // Generic error: short backoff and try next key
        await this.applyCooldown(key, 5000, category, err.message);
      }
    }

    throw lastError || new Error(`All eligible keys for provider "${provider}" failed or are unavailable.`);
  }

  /**
   * Main completion router:
   * Tries primary provider; on failure, automatically fails over to secondary provider.
   */
  async generateCompletion(options: AiCompletionOptions): Promise<AiCompletionResult> {
    const primaryProvider: AiProvider = options.preferredProvider || 'groq';
    const secondaryProvider: AiProvider = primaryProvider === 'groq' ? 'gemini' : 'groq';
    const allowFallback = options.allowFallback !== false;

    // Check if primary provider has any configured keys
    const primaryKeys = await AiKeyStore.getKeysByProvider(primaryProvider);
    const secondaryKeys = await AiKeyStore.getKeysByProvider(secondaryProvider);

    let primaryFatalError: any = null;

    if (primaryKeys.length > 0) {
      try {
        return await this.tryProviderCompletion(primaryProvider, options);
      } catch (primaryErr: any) {
        // Guardrail: Never cascade to secondary provider on permanent client errors (400 INVALID_REQUEST)
        if (primaryErr instanceof ProviderApiError && primaryErr.category === 'INVALID_REQUEST') {
          throw primaryErr;
        }

        primaryFatalError = primaryErr;

        if (!allowFallback) {
          throw primaryErr;
        }

        console.warn(
          `[AI KeyManager] Primary provider "${primaryProvider}" exhausted or failed (${primaryErr.message}). Attempting failover to "${secondaryProvider}"...`
        );
      }
    }

    if (secondaryKeys.length > 0 && allowFallback) {
      try {
        return await this.tryProviderCompletion(secondaryProvider, options);
      } catch (secondaryErr: any) {
        console.warn(
          `[AI KeyManager] Secondary provider "${secondaryProvider}" also failed:`,
          secondaryErr.message
        );
      }
    }

    if (primaryFatalError && !allowFallback) {
      throw primaryFatalError;
    }

    throw new Error('All configured AI providers and keys are currently unavailable or exhausted.');
  }

  /**
   * Performs an isolated connectivity probe for a single key on admin request.
   * Does NOT expose API key or sensitive data.
   */
  async testKeyConnectivity(
    keyId: string
  ): Promise<{ success: boolean; latencyMs: number; message: string; modelUsed: string }> {
    const key = await AiKeyStore.getKeyById(keyId);
    if (!key) {
      return {
        success: false,
        latencyMs: 0,
        message: 'Key not found in store',
        modelUsed: 'unknown',
      };
    }

    const config = await AiKeyStore.getProviderConfig(key.provider);
    const model = config.preferredModel;
    const testPrompt = 'Respond with "OK" if online.';

    const startTime = Date.now();
    try {
      if (key.provider === 'groq') {
        const res = await this.executeGroqAttempt(
          key,
          model,
          { userPrompt: testPrompt, maxTokens: 10 },
          8000
        );
        await AiKeyStore.updateKeyStatus(key.id, {
          status: 'ACTIVE',
          cooldownUntil: undefined,
          lastCheckedAt: new Date().toISOString(),
          lastErrorMessage: undefined,
        });
        return {
          success: true,
          latencyMs: res.latencyMs,
          message: 'Connectivity test successful. Key is active.',
          modelUsed: model,
        };
      } else {
        const res = await this.executeGeminiAttempt(
          key,
          model,
          { userPrompt: testPrompt, maxTokens: 10 },
          8000
        );
        await AiKeyStore.updateKeyStatus(key.id, {
          status: 'ACTIVE',
          cooldownUntil: undefined,
          lastCheckedAt: new Date().toISOString(),
          lastErrorMessage: undefined,
        });
        return {
          success: true,
          latencyMs: res.latencyMs,
          message: 'Connectivity test successful. Key is active.',
          modelUsed: model,
        };
      }
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const category: ErrorCategory =
        err instanceof ProviderApiError ? err.category : 'UNKNOWN';

      await AiKeyStore.updateKeyStatus(key.id, {
        status: category === 'AUTH_FAILURE' ? 'FAILED' : 'TEMPORARILY_UNAVAILABLE',
        lastCheckedAt: new Date().toISOString(),
        lastErrorCategory: category,
        lastErrorMessage: err.message.slice(0, 300),
      });

      return {
        success: false,
        latencyMs,
        message: err.message || 'Connectivity test failed',
        modelUsed: model,
      };
    }
  }

  /**
   * Returns sanitized metrics and key summaries for the admin dashboard.
   */
  async getAdminMetrics(): Promise<AiMetrics> {
    const allKeys = await AiKeyStore.getAllKeys();
    const now = Date.now();

    const groqKeys = allKeys.filter((k) => k.provider === 'groq');
    const geminiKeys = allKeys.filter((k) => k.provider === 'gemini');

    const groqConfig = await AiKeyStore.getProviderConfig('groq');
    const geminiConfig = await AiKeyStore.getProviderConfig('gemini');

    this.metrics.providers.groq.activeKeysCount = groqKeys.filter(
      (k) => k.enabled && k.status === 'ACTIVE' && (!k.cooldownUntil || k.cooldownUntil <= now)
    ).length;
    this.metrics.providers.groq.cooldownKeysCount = groqKeys.filter(
      (k) => k.cooldownUntil && k.cooldownUntil > now
    ).length;
    this.metrics.providers.groq.failedKeysCount = groqKeys.filter(
      (k) => k.status === 'FAILED'
    ).length;
    this.metrics.providers.groq.disabledKeysCount = groqKeys.filter(
      (k) => !k.enabled || k.status === 'DISABLED'
    ).length;
    this.metrics.providers.groq.preferredModel = groqConfig.preferredModel;

    this.metrics.providers.gemini.activeKeysCount = geminiKeys.filter(
      (k) => k.enabled && k.status === 'ACTIVE' && (!k.cooldownUntil || k.cooldownUntil <= now)
    ).length;
    this.metrics.providers.gemini.cooldownKeysCount = geminiKeys.filter(
      (k) => k.cooldownUntil && k.cooldownUntil > now
    ).length;
    this.metrics.providers.gemini.failedKeysCount = geminiKeys.filter(
      (k) => k.status === 'FAILED'
    ).length;
    this.metrics.providers.gemini.disabledKeysCount = geminiKeys.filter(
      (k) => !k.enabled || k.status === 'DISABLED'
    ).length;
    this.metrics.providers.gemini.preferredModel = geminiConfig.preferredModel;

    return { ...this.metrics };
  }
}

export const AiKeyManager = new AiKeyManagerService();
export { geminiLiveSessionManager, GeminiLiveSessionManager } from './geminiLiveSession';
