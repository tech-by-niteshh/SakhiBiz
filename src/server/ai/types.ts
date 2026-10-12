export type AiProvider = 'groq' | 'gemini';

export type KeyStatus =
  | 'ACTIVE'
  | 'FAILED'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'DISABLED'
  | 'NEEDS_CONFIGURATION';

export type ErrorCategory =
  | 'RATE_LIMIT'
  | 'AUTH_FAILURE'
  | 'TRANSIENT_SERVER_ERROR'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'QUOTA_EXHAUSTED'
  | 'MODEL_NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'UNKNOWN';

export interface ManagedApiKey {
  id: string;
  provider: AiProvider;
  maskedKey: string;
  encryptedKey: string;
  keyFingerprint: string;
  status: KeyStatus;
  enabled: boolean;
  projectId?: string;
  orgId?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  lastSuccessAt?: string;
  lastCheckedAt?: string;
  lastErrorCategory?: ErrorCategory;
  lastErrorMessage?: string;
  cooldownUntil?: number;
  failureCount: number;
  successCount: number;
}

export interface ProviderConfig {
  provider: AiProvider;
  preferredModel: string;
  supportedModels: string[];
  maxRequestsPerMinute: number;
  maxDailyRequests: number;
  retryBudget: number;
  timeoutMs: number;
}

export interface RequestMetricsEvent {
  id: string;
  timestamp: string;
  provider: AiProvider;
  model: string;
  keyId: string;
  success: boolean;
  errorCategory?: ErrorCategory;
  retryCount: number;
  latencyMs: number;
}

export interface AiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retriedRequests: number;
  providers: Record<
    AiProvider,
    {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      retriedRequests: number;
      activeKeysCount: number;
      cooldownKeysCount: number;
      failedKeysCount: number;
      disabledKeysCount: number;
      preferredModel: string;
    }
  >;
  recentEvents: RequestMetricsEvent[];
}

export interface AiCompletionOptions {
  systemPrompt?: string;
  userPrompt: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: AiProvider;
  allowFallback?: boolean;
}

export interface AiCompletionResult {
  text: string;
  provider: AiProvider;
  model: string;
  keyId: string;
  retries: number;
  latencyMs: number;
}
