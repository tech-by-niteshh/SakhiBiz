import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AiProvider,
  ManagedApiKey,
  ProviderConfig,
  KeyStatus,
  ErrorCategory,
} from './types';
import {
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
  computeKeyFingerprint,
} from './crypto';
import { AiKeyModel, AiProviderConfigModel } from '../models/AiKeyStore';
import { isMongoConfigured, connectMongo } from '../db';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'ai-keys.enc.json');

const DEFAULT_CONFIGS: Record<AiProvider, ProviderConfig> = {
  groq: {
    provider: 'groq',
    preferredModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    supportedModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
    maxRequestsPerMinute: 60,
    maxDailyRequests: 10000,
    retryBudget: 3,
    timeoutMs: 8000,
  },
  gemini: {
    provider: 'gemini',
    preferredModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    supportedModels: [
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemma-4-26b-a4b-it',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ],
    maxRequestsPerMinute: 60,
    maxDailyRequests: 5000,
    retryBudget: 3,
    timeoutMs: 8000,
  },
};

// In-memory cache for ultra-fast access and serverless runtime safety
let inMemoryKeys: ManagedApiKey[] = [];
let inMemoryConfigs: Record<AiProvider, ProviderConfig> = { ...DEFAULT_CONFIGS };
let isInitialized = false;

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    // Ignore in read-only environments
  }
}

function loadFromLocalFile(): ManagedApiKey[] {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.keys)) {
        return parsed.keys;
      }
    }
  } catch (err) {
    console.warn('[AI KeyStore] Could not read local file store:', err);
  }
  return [];
}

function saveToLocalFile(keys: ManagedApiKey[]) {
  try {
    ensureDataDir();
    const data = {
      updatedAt: new Date().toISOString(),
      keys,
      configs: inMemoryConfigs,
    };
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // Safe ignore if filesystem is read-only (e.g. strict Vercel lambda)
  }
}

/**
 * Bootstrap API keys provided via environment variables (e.g. GROQ_API_KEYS, GEMINI_API_KEYS).
 * Accepts comma or newline separated values.
 */
function bootstrapFromEnvironment(): ManagedApiKey[] {
  const bootstrapped: ManagedApiKey[] = [];

  const envGroq = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY;
  if (envGroq && envGroq.trim().length > 0) {
    const groqKeys = envGroq
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5 && !k.includes('placeholder'));

    groqKeys.forEach((key) => {
      const fp = computeKeyFingerprint(key);
      bootstrapped.push({
        id: `key-groq-${fp.slice(0, 8)}`,
        provider: 'groq',
        maskedKey: maskApiKey(key),
        encryptedKey: encryptApiKey(key),
        keyFingerprint: fp,
        status: 'ACTIVE',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        failureCount: 0,
        successCount: 0,
      });
    });
  }

  const envGemini = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
  if (envGemini && envGemini.trim().length > 0 && envGemini !== 'MY_GEMINI_API_KEY') {
    const geminiKeys = envGemini
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5 && !k.includes('placeholder'));

    geminiKeys.forEach((key) => {
      const fp = computeKeyFingerprint(key);
      bootstrapped.push({
        id: `key-gemini-${fp.slice(0, 8)}`,
        provider: 'gemini',
        maskedKey: maskApiKey(key),
        encryptedKey: encryptApiKey(key),
        keyFingerprint: fp,
        status: 'ACTIVE',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        failureCount: 0,
        successCount: 0,
      });
    });
  }

  return bootstrapped;
}

export const AiKeyStore = {
  async init(): Promise<void> {
    if (isInitialized) return;

    // 1. Start with local or in-memory
    const localKeys = loadFromLocalFile();
    inMemoryKeys = [...localKeys];

    // 2. Load from MongoDB if available
    if (isMongoConfigured()) {
      try {
        await connectMongo();
        const dbKeys = await AiKeyModel.find().lean();
        if (dbKeys.length > 0) {
          inMemoryKeys = dbKeys.map((doc: any) => ({
            id: doc.keyId,
            provider: doc.provider as AiProvider,
            maskedKey: doc.maskedKey,
            encryptedKey: doc.encryptedKey,
            keyFingerprint: doc.keyFingerprint,
            status: doc.status as KeyStatus,
            enabled: doc.enabled,
            projectId: doc.projectId,
            orgId: doc.orgId,
            createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: doc.updatedAt?.toISOString() || new Date().toISOString(),
            lastUsedAt: doc.lastUsedAt?.toISOString(),
            lastSuccessAt: doc.lastSuccessAt?.toISOString(),
            lastCheckedAt: doc.lastCheckedAt?.toISOString(),
            lastErrorCategory: doc.lastErrorCategory as ErrorCategory,
            lastErrorMessage: doc.lastErrorMessage,
            cooldownUntil: doc.cooldownUntil ? new Date(doc.cooldownUntil).getTime() : undefined,
            failureCount: doc.failureCount || 0,
            successCount: doc.successCount || 0,
          }));
        }

        // Load configs from MongoDB
        const dbConfigs = await AiProviderConfigModel.find().lean();
        dbConfigs.forEach((cfg: any) => {
          const p = cfg.provider as AiProvider;
          if (DEFAULT_CONFIGS[p]) {
            inMemoryConfigs[p] = {
              ...DEFAULT_CONFIGS[p],
              preferredModel: cfg.preferredModel || DEFAULT_CONFIGS[p].preferredModel,
              maxRequestsPerMinute: cfg.maxRequestsPerMinute || DEFAULT_CONFIGS[p].maxRequestsPerMinute,
              maxDailyRequests: cfg.maxDailyRequests || DEFAULT_CONFIGS[p].maxDailyRequests,
              retryBudget: cfg.retryBudget || DEFAULT_CONFIGS[p].retryBudget,
              timeoutMs: cfg.timeoutMs || DEFAULT_CONFIGS[p].timeoutMs,
            };
          }
        });
      } catch (err) {
        console.warn('[AI KeyStore] Mongo load error, falling back to local store:', err);
      }
    }

    // 3. Merge bootstrap environment keys without overwriting existing entries
    const envKeys = bootstrapFromEnvironment();
    envKeys.forEach((ek) => {
      const exists = inMemoryKeys.some(
        (k) => k.provider === ek.provider && k.keyFingerprint === ek.keyFingerprint
      );
      if (!exists) {
        inMemoryKeys.push(ek);
      }
    });

    saveToLocalFile(inMemoryKeys);
    isInitialized = true;
  },

  async getAllKeys(): Promise<ManagedApiKey[]> {
    await this.init();
    return [...inMemoryKeys];
  },

  async getKeysByProvider(provider: AiProvider): Promise<ManagedApiKey[]> {
    await this.init();
    return inMemoryKeys.filter((k) => k.provider === provider);
  },

  async getEligibleKeys(provider: AiProvider): Promise<ManagedApiKey[]> {
    await this.init();
    const now = Date.now();
    return inMemoryKeys.filter((k) => {
      if (k.provider !== provider) return false;
      if (!k.enabled) return false;
      if (k.status === 'FAILED') return false;
      if (k.status === 'DISABLED') return false;
      if (k.cooldownUntil && k.cooldownUntil > now) return false;
      return true;
    });
  },

  async getKeyById(keyId: string): Promise<ManagedApiKey | null> {
    await this.init();
    return inMemoryKeys.find((k) => k.id === keyId) || null;
  },

  async addKeys(
    provider: AiProvider,
    rawInput: string,
    metadata?: { projectId?: string; orgId?: string }
  ): Promise<{ added: number; skipped: number; keys: ManagedApiKey[] }> {
    await this.init();

    if (!rawInput || typeof rawInput !== 'string') {
      return { added: 0, skipped: 0, keys: [] };
    }

    // Split by newlines or commas
    const keyStrings = rawInput
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);

    let addedCount = 0;
    let skippedCount = 0;
    const addedKeys: ManagedApiKey[] = [];

    for (const rawKey of keyStrings) {
      const fingerprint = computeKeyFingerprint(rawKey);

      // Check if duplicate already exists
      const existing = inMemoryKeys.find(
        (k) => k.provider === provider && k.keyFingerprint === fingerprint
      );
      if (existing) {
        skippedCount++;
        continue;
      }

      const newKey: ManagedApiKey = {
        id: `key-${provider}-${crypto.randomBytes(4).toString('hex')}`,
        provider,
        maskedKey: maskApiKey(rawKey),
        encryptedKey: encryptApiKey(rawKey),
        keyFingerprint: fingerprint,
        status: 'ACTIVE',
        enabled: true,
        projectId: metadata?.projectId?.trim() || undefined,
        orgId: metadata?.orgId?.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        failureCount: 0,
        successCount: 0,
      };

      inMemoryKeys.push(newKey);
      addedKeys.push(newKey);
      addedCount++;

      // Persist to MongoDB if active
      if (isMongoConfigured()) {
        try {
          await connectMongo();
          await AiKeyModel.create({
            keyId: newKey.id,
            provider: newKey.provider,
            maskedKey: newKey.maskedKey,
            encryptedKey: newKey.encryptedKey,
            keyFingerprint: newKey.keyFingerprint,
            status: newKey.status,
            enabled: newKey.enabled,
            projectId: newKey.projectId,
            orgId: newKey.orgId,
          });
        } catch (err) {
          console.warn('[AI KeyStore] Could not persist new key to MongoDB:', err);
        }
      }
    }

    saveToLocalFile(inMemoryKeys);
    return { added: addedCount, skipped: skippedCount, keys: addedKeys };
  },

  async updateKeyStatus(
    keyId: string,
    updates: Partial<{
      status: KeyStatus;
      enabled: boolean;
      cooldownUntil: number | undefined;
      lastUsedAt: string;
      lastSuccessAt: string;
      lastCheckedAt: string;
      lastErrorCategory: ErrorCategory;
      lastErrorMessage: string;
      failureCount: number;
      successCount: number;
      projectId: string;
      orgId: string;
    }>
  ): Promise<ManagedApiKey | null> {
    await this.init();
    const index = inMemoryKeys.findIndex((k) => k.id === keyId);
    if (index === -1) return null;

    const existing = inMemoryKeys[index];
    const updated: ManagedApiKey = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    inMemoryKeys[index] = updated;
    saveToLocalFile(inMemoryKeys);

    if (isMongoConfigured()) {
      try {
        await connectMongo();
        await AiKeyModel.updateOne(
          { keyId },
          {
            $set: {
              ...(updates.status !== undefined && { status: updates.status }),
              ...(updates.enabled !== undefined && { enabled: updates.enabled }),
              ...(updates.cooldownUntil !== undefined && {
                cooldownUntil: updates.cooldownUntil ? new Date(updates.cooldownUntil) : null,
              }),
              ...(updates.lastUsedAt && { lastUsedAt: new Date(updates.lastUsedAt) }),
              ...(updates.lastSuccessAt && { lastSuccessAt: new Date(updates.lastSuccessAt) }),
              ...(updates.lastCheckedAt && { lastCheckedAt: new Date(updates.lastCheckedAt) }),
              ...(updates.lastErrorCategory && { lastErrorCategory: updates.lastErrorCategory }),
              ...(updates.lastErrorMessage !== undefined && {
                lastErrorMessage: updates.lastErrorMessage,
              }),
              ...(updates.failureCount !== undefined && { failureCount: updates.failureCount }),
              ...(updates.successCount !== undefined && { successCount: updates.successCount }),
              ...(updates.projectId !== undefined && { projectId: updates.projectId }),
              ...(updates.orgId !== undefined && { orgId: updates.orgId }),
            },
          }
        );
      } catch (err) {
        // Safe log
      }
    }

    return updated;
  },

  async deleteKey(keyId: string): Promise<boolean> {
    await this.init();
    const index = inMemoryKeys.findIndex((k) => k.id === keyId);
    if (index === -1) return false;

    inMemoryKeys.splice(index, 1);
    saveToLocalFile(inMemoryKeys);

    if (isMongoConfigured()) {
      try {
        await connectMongo();
        await AiKeyModel.deleteOne({ keyId });
      } catch (err) {
        // Safe log
      }
    }

    return true;
  },

  async getProviderConfig(provider: AiProvider): Promise<ProviderConfig> {
    await this.init();
    return inMemoryConfigs[provider] || DEFAULT_CONFIGS[provider];
  },

  async updateProviderConfig(
    provider: AiProvider,
    updates: Partial<ProviderConfig>
  ): Promise<ProviderConfig> {
    await this.init();
    const current = inMemoryConfigs[provider] || DEFAULT_CONFIGS[provider];
    const updated: ProviderConfig = {
      ...current,
      ...updates,
      provider,
    };

    inMemoryConfigs[provider] = updated;
    saveToLocalFile(inMemoryKeys);

    if (isMongoConfigured()) {
      try {
        await connectMongo();
        await AiProviderConfigModel.findOneAndUpdate(
          { provider },
          {
            $set: {
              preferredModel: updated.preferredModel,
              maxRequestsPerMinute: updated.maxRequestsPerMinute,
              maxDailyRequests: updated.maxDailyRequests,
              retryBudget: updated.retryBudget,
              timeoutMs: updated.timeoutMs,
            },
          },
          { upsert: true }
        );
      } catch (err) {
        // Safe log
      }
    }

    return updated;
  },

  decryptKey(key: ManagedApiKey): string {
    return decryptApiKey(key.encryptedKey);
  },
};
