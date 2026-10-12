var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server/db.ts
import mongoose2 from "mongoose";
function isMongoConfigured() {
  const uri = process.env.MONGODB_URI;
  return typeof uri === "string" && uri.trim().length > 0 && !uri.includes("placeholder") && !uri.includes("YOUR_MONGODB");
}
async function connectMongo() {
  if (!isMongoConfigured()) {
    return null;
  }
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI.trim();
    cached.promise = mongoose2.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5e3
    }).then((m) => {
      console.log("Connected to MongoDB Atlas successfully.");
      return m;
    }).catch((err) => {
      console.warn("MongoDB connection failed:", err.message);
      cached.promise = null;
      throw err;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
var cached;
var init_db = __esm({
  "src/server/db.ts"() {
    cached = global.mongooseCache || { conn: null, promise: null };
    if (!global.mongooseCache) {
      global.mongooseCache = cached;
    }
  }
});

// src/server/ai/crypto.ts
import crypto2 from "crypto";
function getDerivedKey() {
  const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || "sakhibiz-server-side-ai-key-store-internal-secret-2026";
  return crypto2.scryptSync(secret, MASTER_SALT, 32);
}
function encryptApiKey(plainKey) {
  if (!plainKey || typeof plainKey !== "string") {
    throw new Error("Invalid key string for encryption");
  }
  const key = getDerivedKey();
  const iv = crypto2.randomBytes(12);
  const cipher = crypto2.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainKey.trim(), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}
function decryptApiKey(encryptedPayload) {
  if (!encryptedPayload || typeof encryptedPayload !== "string") {
    throw new Error("Invalid encrypted payload");
  }
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted key format. Expected iv:tag:ciphertext");
  }
  const [ivHex, tagHex, cipherHex] = parts;
  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto2.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, "hex")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}
function maskApiKey(key) {
  if (!key || typeof key !== "string") return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
  const clean = key.trim();
  if (clean.length <= 8) {
    return `\u2022\u2022\u2022\u2022${clean.slice(-3)}`;
  }
  let prefix = "";
  if (clean.startsWith("gsk_")) {
    prefix = "gsk_";
  } else if (clean.startsWith("AIzaSy")) {
    prefix = "AIza";
  } else {
    prefix = clean.slice(0, 3);
  }
  const suffix = clean.slice(-4);
  return `${prefix}\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022...${suffix}`;
}
function computeKeyFingerprint(key) {
  return crypto2.createHash("sha256").update(key.trim()).digest("hex").slice(0, 16);
}
var MASTER_SALT;
var init_crypto = __esm({
  "src/server/ai/crypto.ts"() {
    MASTER_SALT = "sakhibiz-ai-key-salt-2026";
  }
});

// src/server/models/AiKeyStore.ts
import mongoose3, { Schema as Schema2 } from "mongoose";
var AiKeySchema, AiKeyModel, AiProviderConfigSchema, AiProviderConfigModel;
var init_AiKeyStore = __esm({
  "src/server/models/AiKeyStore.ts"() {
    AiKeySchema = new Schema2(
      {
        keyId: {
          type: String,
          required: true,
          unique: true,
          index: true
        },
        provider: {
          type: String,
          required: true,
          enum: ["groq", "gemini"],
          index: true
        },
        maskedKey: {
          type: String,
          required: true
        },
        encryptedKey: {
          type: String,
          required: true
        },
        keyFingerprint: {
          type: String,
          required: true,
          index: true
        },
        status: {
          type: String,
          required: true,
          enum: ["ACTIVE", "FAILED", "TEMPORARILY_UNAVAILABLE", "DISABLED", "NEEDS_CONFIGURATION"],
          default: "NEEDS_CONFIGURATION",
          index: true
        },
        enabled: {
          type: Boolean,
          default: true,
          index: true
        },
        projectId: { type: String, trim: true },
        orgId: { type: String, trim: true },
        lastUsedAt: { type: Date },
        lastSuccessAt: { type: Date },
        lastCheckedAt: { type: Date },
        lastErrorCategory: { type: String },
        lastErrorMessage: { type: String },
        cooldownUntil: { type: Date },
        failureCount: { type: Number, default: 0 },
        successCount: { type: Number, default: 0 }
      },
      {
        timestamps: true
      }
    );
    AiKeySchema.index({ provider: 1, keyFingerprint: 1 }, { unique: true });
    AiKeyModel = mongoose3.models.AiKey || mongoose3.model("AiKey", AiKeySchema);
    AiProviderConfigSchema = new Schema2(
      {
        provider: {
          type: String,
          required: true,
          unique: true,
          enum: ["groq", "gemini"]
        },
        preferredModel: {
          type: String,
          required: true
        },
        maxRequestsPerMinute: {
          type: Number,
          default: 60
        },
        maxDailyRequests: {
          type: Number,
          default: 5e3
        },
        retryBudget: {
          type: Number,
          default: 3
        },
        timeoutMs: {
          type: Number,
          default: 8e3
        }
      },
      {
        timestamps: true
      }
    );
    AiProviderConfigModel = mongoose3.models.AiProviderConfig || mongoose3.model("AiProviderConfig", AiProviderConfigSchema);
  }
});

// src/server/ai/keyStore.ts
import fs from "fs";
import path from "path";
import crypto3 from "crypto";
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
  }
}
function loadFromLocalFile() {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.keys)) {
        return parsed.keys;
      }
    }
  } catch (err) {
    console.warn("[AI KeyStore] Could not read local file store:", err);
  }
  return [];
}
function saveToLocalFile(keys) {
  try {
    ensureDataDir();
    const data = {
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      keys,
      configs: inMemoryConfigs
    };
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
  }
}
function bootstrapFromEnvironment() {
  const bootstrapped = [];
  const envGroq = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY;
  if (envGroq && envGroq.trim().length > 0) {
    const groqKeys = envGroq.split(/[\n,]+/).map((k) => k.trim()).filter((k) => k.length > 5 && !k.includes("placeholder"));
    groqKeys.forEach((key) => {
      const fp = computeKeyFingerprint(key);
      bootstrapped.push({
        id: `key-groq-${fp.slice(0, 8)}`,
        provider: "groq",
        maskedKey: maskApiKey(key),
        encryptedKey: encryptApiKey(key),
        keyFingerprint: fp,
        status: "ACTIVE",
        enabled: true,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        failureCount: 0,
        successCount: 0
      });
    });
  }
  const envGemini = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
  if (envGemini && envGemini.trim().length > 0 && envGemini !== "MY_GEMINI_API_KEY") {
    const geminiKeys = envGemini.split(/[\n,]+/).map((k) => k.trim()).filter((k) => k.length > 5 && !k.includes("placeholder"));
    geminiKeys.forEach((key) => {
      const fp = computeKeyFingerprint(key);
      bootstrapped.push({
        id: `key-gemini-${fp.slice(0, 8)}`,
        provider: "gemini",
        maskedKey: maskApiKey(key),
        encryptedKey: encryptApiKey(key),
        keyFingerprint: fp,
        status: "ACTIVE",
        enabled: true,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        failureCount: 0,
        successCount: 0
      });
    });
  }
  return bootstrapped;
}
var DATA_DIR, LOCAL_STORE_FILE, DEFAULT_CONFIGS, inMemoryKeys, inMemoryConfigs, isInitialized, AiKeyStore;
var init_keyStore = __esm({
  "src/server/ai/keyStore.ts"() {
    init_crypto();
    init_AiKeyStore();
    init_db();
    DATA_DIR = path.resolve(process.cwd(), "data");
    LOCAL_STORE_FILE = path.join(DATA_DIR, "ai-keys.enc.json");
    DEFAULT_CONFIGS = {
      groq: {
        provider: "groq",
        preferredModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        supportedModels: [
          "llama-3.3-70b-versatile",
          "llama-3.1-8b-instant",
          "qwen/qwen3.8-27b",
          "openai/gpt-oss-20b",
          "openai/gpt-oss-120b",
          "mixtral-8x7b-32768",
          "gemma2-9b-it"
        ],
        maxRequestsPerMinute: 60,
        maxDailyRequests: 1e4,
        retryBudget: 3,
        timeoutMs: 8e3
      },
      gemini: {
        provider: "gemini",
        preferredModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        supportedModels: [
          "gemini-3.5-flash-lite",
          "gemini-3.5-flash",
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemma-4-26b-a4b-it",
          "gemini-1.5-flash",
          "gemini-1.5-pro"
        ],
        maxRequestsPerMinute: 60,
        maxDailyRequests: 5e3,
        retryBudget: 3,
        timeoutMs: 8e3
      }
    };
    inMemoryKeys = [];
    inMemoryConfigs = { ...DEFAULT_CONFIGS };
    isInitialized = false;
    AiKeyStore = {
      async init() {
        if (isInitialized) return;
        const localKeys = loadFromLocalFile();
        inMemoryKeys = [...localKeys];
        if (isMongoConfigured()) {
          try {
            await connectMongo();
            const dbKeys = await AiKeyModel.find().lean();
            if (dbKeys.length > 0) {
              inMemoryKeys = dbKeys.map((doc) => ({
                id: doc.keyId,
                provider: doc.provider,
                maskedKey: doc.maskedKey,
                encryptedKey: doc.encryptedKey,
                keyFingerprint: doc.keyFingerprint,
                status: doc.status,
                enabled: doc.enabled,
                projectId: doc.projectId,
                orgId: doc.orgId,
                createdAt: doc.createdAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
                updatedAt: doc.updatedAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
                lastUsedAt: doc.lastUsedAt?.toISOString(),
                lastSuccessAt: doc.lastSuccessAt?.toISOString(),
                lastCheckedAt: doc.lastCheckedAt?.toISOString(),
                lastErrorCategory: doc.lastErrorCategory,
                lastErrorMessage: doc.lastErrorMessage,
                cooldownUntil: doc.cooldownUntil ? new Date(doc.cooldownUntil).getTime() : void 0,
                failureCount: doc.failureCount || 0,
                successCount: doc.successCount || 0
              }));
            }
            const dbConfigs = await AiProviderConfigModel.find().lean();
            dbConfigs.forEach((cfg) => {
              const p = cfg.provider;
              if (DEFAULT_CONFIGS[p]) {
                inMemoryConfigs[p] = {
                  ...DEFAULT_CONFIGS[p],
                  preferredModel: cfg.preferredModel || DEFAULT_CONFIGS[p].preferredModel,
                  maxRequestsPerMinute: cfg.maxRequestsPerMinute || DEFAULT_CONFIGS[p].maxRequestsPerMinute,
                  maxDailyRequests: cfg.maxDailyRequests || DEFAULT_CONFIGS[p].maxDailyRequests,
                  retryBudget: cfg.retryBudget || DEFAULT_CONFIGS[p].retryBudget,
                  timeoutMs: cfg.timeoutMs || DEFAULT_CONFIGS[p].timeoutMs
                };
              }
            });
          } catch (err) {
            console.warn("[AI KeyStore] Mongo load error, falling back to local store:", err);
          }
        }
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
      async getAllKeys() {
        await this.init();
        return [...inMemoryKeys];
      },
      async getKeysByProvider(provider) {
        await this.init();
        return inMemoryKeys.filter((k) => k.provider === provider);
      },
      async getEligibleKeys(provider) {
        await this.init();
        const now = Date.now();
        return inMemoryKeys.filter((k) => {
          if (k.provider !== provider) return false;
          if (!k.enabled) return false;
          if (k.status === "FAILED") return false;
          if (k.status === "DISABLED") return false;
          if (k.cooldownUntil && k.cooldownUntil > now) return false;
          return true;
        });
      },
      async getKeyById(keyId) {
        await this.init();
        return inMemoryKeys.find((k) => k.id === keyId) || null;
      },
      async addKeys(provider, rawInput, metadata) {
        await this.init();
        if (!rawInput || typeof rawInput !== "string") {
          return { added: 0, skipped: 0, keys: [] };
        }
        const keyStrings = rawInput.split(/[\n,]+/).map((k) => k.trim()).filter((k) => k.length > 5);
        let addedCount = 0;
        let skippedCount = 0;
        const addedKeys = [];
        for (const rawKey of keyStrings) {
          const fingerprint = computeKeyFingerprint(rawKey);
          const existing = inMemoryKeys.find(
            (k) => k.provider === provider && k.keyFingerprint === fingerprint
          );
          if (existing) {
            skippedCount++;
            continue;
          }
          const newKey = {
            id: `key-${provider}-${crypto3.randomBytes(4).toString("hex")}`,
            provider,
            maskedKey: maskApiKey(rawKey),
            encryptedKey: encryptApiKey(rawKey),
            keyFingerprint: fingerprint,
            status: "ACTIVE",
            enabled: true,
            projectId: metadata?.projectId?.trim() || void 0,
            orgId: metadata?.orgId?.trim() || void 0,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            failureCount: 0,
            successCount: 0
          };
          inMemoryKeys.push(newKey);
          addedKeys.push(newKey);
          addedCount++;
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
                orgId: newKey.orgId
              });
            } catch (err) {
              console.warn("[AI KeyStore] Could not persist new key to MongoDB:", err);
            }
          }
        }
        saveToLocalFile(inMemoryKeys);
        return { added: addedCount, skipped: skippedCount, keys: addedKeys };
      },
      async updateKeyStatus(keyId, updates) {
        await this.init();
        const index = inMemoryKeys.findIndex((k) => k.id === keyId);
        if (index === -1) return null;
        const existing = inMemoryKeys[index];
        const updated = {
          ...existing,
          ...updates,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
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
                  ...updates.status !== void 0 && { status: updates.status },
                  ...updates.enabled !== void 0 && { enabled: updates.enabled },
                  ...updates.cooldownUntil !== void 0 && {
                    cooldownUntil: updates.cooldownUntil ? new Date(updates.cooldownUntil) : null
                  },
                  ...updates.lastUsedAt && { lastUsedAt: new Date(updates.lastUsedAt) },
                  ...updates.lastSuccessAt && { lastSuccessAt: new Date(updates.lastSuccessAt) },
                  ...updates.lastCheckedAt && { lastCheckedAt: new Date(updates.lastCheckedAt) },
                  ...updates.lastErrorCategory && { lastErrorCategory: updates.lastErrorCategory },
                  ...updates.lastErrorMessage !== void 0 && {
                    lastErrorMessage: updates.lastErrorMessage
                  },
                  ...updates.failureCount !== void 0 && { failureCount: updates.failureCount },
                  ...updates.successCount !== void 0 && { successCount: updates.successCount },
                  ...updates.projectId !== void 0 && { projectId: updates.projectId },
                  ...updates.orgId !== void 0 && { orgId: updates.orgId }
                }
              }
            );
          } catch (err) {
          }
        }
        return updated;
      },
      async deleteKey(keyId) {
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
          }
        }
        return true;
      },
      async getProviderConfig(provider) {
        await this.init();
        return inMemoryConfigs[provider] || DEFAULT_CONFIGS[provider];
      },
      async updateProviderConfig(provider, updates) {
        await this.init();
        const current = inMemoryConfigs[provider] || DEFAULT_CONFIGS[provider];
        const updated = {
          ...current,
          ...updates,
          provider
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
                  timeoutMs: updated.timeoutMs
                }
              },
              { upsert: true }
            );
          } catch (err) {
          }
        }
        return updated;
      },
      decryptKey(key) {
        return decryptApiKey(key.encryptedKey);
      }
    };
  }
});

// src/server/ai/groqProvider.ts
async function callGroqChat(apiKey, model, messages, options) {
  const timeoutMs = options?.timeoutMs || 8e3;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.5,
        max_tokens: options?.maxTokens ?? 1024
      }),
      signal: controller.signal
    });
    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      let errorBody = {};
      try {
        errorBody = await res.json();
      } catch {
      }
      const status = res.status;
      const errorMsg = errorBody?.error?.message || `Groq API responded with status ${status}: ${res.statusText}`;
      if (status === 429) {
        let retryAfterMs = 3e4;
        const retryHeader = res.headers.get("retry-after");
        if (retryHeader) {
          const parsedSeconds = parseFloat(retryHeader);
          if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
            retryAfterMs = Math.ceil(parsedSeconds * 1e3);
          }
        }
        throw new ProviderApiError(errorMsg, "RATE_LIMIT", status, retryAfterMs);
      }
      const lowerMsg = errorMsg.toLowerCase();
      if (status === 401 || status === 403 || lowerMsg.includes("invalid api key") || lowerMsg.includes("invalid_api_key")) {
        throw new ProviderApiError(errorMsg, "AUTH_FAILURE", status);
      }
      if (status === 404) {
        throw new ProviderApiError(errorMsg, "MODEL_NOT_FOUND", status);
      }
      if (status === 400) {
        throw new ProviderApiError(errorMsg, "INVALID_REQUEST", status);
      }
      if (status >= 500) {
        throw new ProviderApiError(errorMsg, "TRANSIENT_SERVER_ERROR", status);
      }
      throw new ProviderApiError(errorMsg, "UNKNOWN", status);
    }
    const data = await res.json();
    const replyText = data?.choices?.[0]?.message?.content?.trim() || "";
    return {
      text: replyText,
      latencyMs,
      usage: data?.usage
    };
  } catch (err) {
    if (err instanceof ProviderApiError) {
      throw err;
    }
    if (err.name === "AbortError" || err.message?.includes("timeout") || err.message?.includes("aborted")) {
      throw new ProviderApiError(`Groq API request timed out after ${timeoutMs}ms`, "TIMEOUT", 408);
    }
    if (err.code === "ECONNRESET" || err.code === "ENOTFOUND" || err.code === "ECONNREFUSED" || err.message?.includes("fetch failed")) {
      throw new ProviderApiError(`Network error communicating with Groq: ${err.message}`, "NETWORK_ERROR");
    }
    throw new ProviderApiError(err.message || "Unknown error calling Groq", "UNKNOWN");
  } finally {
    clearTimeout(timeoutId);
  }
}
var ProviderApiError;
var init_groqProvider = __esm({
  "src/server/ai/groqProvider.ts"() {
    ProviderApiError = class extends Error {
      constructor(message, category, statusCode, retryAfterMs) {
        super(message);
        this.name = "ProviderApiError";
        this.category = category;
        this.statusCode = statusCode;
        this.retryAfterMs = retryAfterMs;
      }
    };
  }
});

// src/server/ai/geminiProvider.ts
async function callGeminiGenerate(apiKey, model, prompt, options) {
  const timeoutMs = options?.timeoutMs || 8e3;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const bodyPayload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.4,
        maxOutputTokens: options?.maxTokens ?? 1024
      }
    };
    if (options?.systemPrompt) {
      bodyPayload.systemInstruction = {
        parts: [{ text: options.systemPrompt }]
      };
    }
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal
    });
    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      let errorBody = {};
      try {
        errorBody = await res.json();
      } catch {
      }
      const status = res.status;
      const errorMsg = errorBody?.error?.message || `Gemini API responded with status ${status}: ${res.statusText}`;
      if (status === 429 || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        let retryAfterMs = 3e4;
        const retryHeader = res.headers.get("retry-after");
        if (retryHeader) {
          const parsed = parseFloat(retryHeader);
          if (!isNaN(parsed) && parsed > 0) retryAfterMs = Math.ceil(parsed * 1e3);
        }
        throw new ProviderApiError(errorMsg, "RATE_LIMIT", 429, retryAfterMs);
      }
      const lowerMsg = errorMsg.toLowerCase();
      if (status === 401 || status === 403 || status === 400 && (lowerMsg.includes("api_key_invalid") || lowerMsg.includes("api key not valid") || lowerMsg.includes("api key expired") || lowerMsg.includes("invalid api key") || lowerMsg.includes("permission_denied"))) {
        throw new ProviderApiError(errorMsg, "AUTH_FAILURE", status);
      }
      if (status === 404 || errorMsg.includes("models/")) {
        throw new ProviderApiError(errorMsg, "MODEL_NOT_FOUND", status);
      }
      if (status >= 500) {
        throw new ProviderApiError(errorMsg, "TRANSIENT_SERVER_ERROR", status);
      }
      if (status === 400) {
        throw new ProviderApiError(errorMsg, "INVALID_REQUEST", 400);
      }
      throw new ProviderApiError(errorMsg, "UNKNOWN", status);
    }
    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    return {
      text: candidateText,
      latencyMs
    };
  } catch (err) {
    if (err instanceof ProviderApiError) {
      throw err;
    }
    if (err.name === "AbortError" || err.message?.includes("timeout") || err.message?.includes("aborted")) {
      throw new ProviderApiError(`Gemini API request timed out after ${timeoutMs}ms`, "TIMEOUT", 408);
    }
    if (err.code === "ECONNRESET" || err.code === "ENOTFOUND" || err.code === "ECONNREFUSED" || err.message?.includes("fetch failed")) {
      throw new ProviderApiError(`Network error communicating with Gemini: ${err.message}`, "NETWORK_ERROR");
    }
    throw new ProviderApiError(err.message || "Unknown error calling Gemini", "UNKNOWN");
  } finally {
    clearTimeout(timeoutId);
  }
}
var init_geminiProvider = __esm({
  "src/server/ai/geminiProvider.ts"() {
    init_groqProvider();
  }
});

// src/server/ai/geminiLiveSession.ts
var GeminiLiveSessionManager, geminiLiveSessionManager;
var init_geminiLiveSession = __esm({
  "src/server/ai/geminiLiveSession.ts"() {
    init_keyStore();
    GeminiLiveSessionManager = class {
      constructor() {
        this.sessions = /* @__PURE__ */ new Map();
      }
      /**
       * Initializes a dedicated, stateful Live API session.
       * Allocates an eligible key for the lifetime of the session. Never rotates mid-stream.
       */
      async createSession(options) {
        const sessionId = options.sessionId || `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const eligibleKeys = await AiKeyStore.getEligibleKeys("gemini");
        if (eligibleKeys.length === 0) {
          const fallbackState = {
            sessionId,
            keyId: "none",
            targetLanguage: options.targetLanguage,
            status: "FALLBACK_TO_ORIGINAL_AUDIO",
            reconnectAttempts: 0,
            maxReconnectAttempts: 3,
            contextHistory: options.initialContext || [],
            fallbackAudioTrack: "hindi_original"
          };
          this.sessions.set(sessionId, fallbackState);
          return {
            sessionId,
            keyId: "none",
            maskedKey: "none",
            status: "FALLBACK_TO_ORIGINAL_AUDIO"
          };
        }
        const key = eligibleKeys[0];
        const sessionState = {
          sessionId,
          keyId: key.id,
          targetLanguage: options.targetLanguage,
          status: "CONNECTED",
          reconnectAttempts: 0,
          maxReconnectAttempts: 3,
          lastConnectedAt: (/* @__PURE__ */ new Date()).toISOString(),
          contextHistory: options.initialContext || [],
          fallbackAudioTrack: "hindi_original"
        };
        this.sessions.set(sessionId, sessionState);
        return {
          sessionId,
          keyId: key.id,
          maskedKey: key.maskedKey,
          status: "CONNECTED"
        };
      }
      /**
       * Executes session restoration and reconnect strategy when a Live stream drops.
       * Restores context history and seamlessly rebinds to an eligible key if current key failed.
       */
      async reconnectSession(sessionId, error) {
        const session = this.sessions.get(sessionId);
        if (!session) {
          throw new Error(`Live session ${sessionId} not found`);
        }
        session.reconnectAttempts++;
        session.status = "RECONNECTING";
        if (error && (error.category === "AUTH_FAILURE" || error.category === "RATE_LIMIT")) {
          const currentKey = await AiKeyStore.getKeyById(session.keyId);
          if (currentKey) {
            if (error.category === "AUTH_FAILURE") {
              await AiKeyStore.updateKeyStatus(currentKey.id, {
                status: "FAILED",
                lastErrorCategory: error.category,
                lastErrorMessage: error.message
              });
            } else {
              await AiKeyStore.updateKeyStatus(currentKey.id, {
                status: "TEMPORARILY_UNAVAILABLE",
                cooldownUntil: Date.now() + 3e4,
                lastErrorCategory: error.category,
                lastErrorMessage: error.message
              });
            }
          }
        }
        const eligibleKeys = await AiKeyStore.getEligibleKeys("gemini");
        const availableKey = eligibleKeys.find((k) => k.id !== session.keyId) || eligibleKeys[0];
        if (!availableKey || session.reconnectAttempts > session.maxReconnectAttempts) {
          session.status = "FALLBACK_TO_ORIGINAL_AUDIO";
          session.lastError = error?.message || "Reconnect limit reached";
          return {
            success: false,
            status: "FALLBACK_TO_ORIGINAL_AUDIO",
            audioTrack: "hindi_original"
          };
        }
        session.keyId = availableKey.id;
        session.status = "CONNECTED";
        session.lastConnectedAt = (/* @__PURE__ */ new Date()).toISOString();
        return {
          success: true,
          status: "CONNECTED",
          newKeyId: availableKey.id,
          audioTrack: "live_translated"
        };
      }
      /**
       * Adds conversation turn or audio segment transcript to context history
       * to ensure full restoration upon reconnect.
       */
      appendContext(sessionId, turn) {
        const session = this.sessions.get(sessionId);
        if (session) {
          session.contextHistory.push(turn);
          if (session.contextHistory.length > 20) {
            session.contextHistory.shift();
          }
        }
      }
      getSession(sessionId) {
        return this.sessions.get(sessionId);
      }
      terminateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
          session.status = "DISCONNECTED";
          this.sessions.delete(sessionId);
        }
      }
    };
    geminiLiveSessionManager = new GeminiLiveSessionManager();
  }
});

// src/server/ai/keyManager.ts
var keyManager_exports = {};
__export(keyManager_exports, {
  AiKeyManager: () => AiKeyManager,
  GeminiLiveSessionManager: () => GeminiLiveSessionManager,
  geminiLiveSessionManager: () => geminiLiveSessionManager
});
var AiKeyManagerService, AiKeyManager;
var init_keyManager = __esm({
  "src/server/ai/keyManager.ts"() {
    init_keyStore();
    init_groqProvider();
    init_geminiProvider();
    init_geminiLiveSession();
    AiKeyManagerService = class {
      constructor() {
        this.rrPointers = { groq: 0, gemini: 0 };
        this.metrics = {
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
              preferredModel: "llama-3.3-70b-versatile"
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
              preferredModel: "gemini-2.5-flash"
            }
          },
          recentEvents: []
        };
      }
      recordMetricEvent(event) {
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
      async selectEligibleKey(provider, excludedKeyIds) {
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
      async applyCooldown(key, cooldownMs, category, errorMsg) {
        const cooldownUntil = Date.now() + cooldownMs;
        await AiKeyStore.updateKeyStatus(key.id, {
          status: "TEMPORARILY_UNAVAILABLE",
          cooldownUntil,
          lastErrorCategory: category,
          lastErrorMessage: errorMsg.slice(0, 300),
          failureCount: key.failureCount + 1
        });
        if (key.projectId || key.orgId) {
          const allKeys = await AiKeyStore.getKeysByProvider(key.provider);
          for (const sibling of allKeys) {
            if (sibling.id !== key.id && (key.projectId && sibling.projectId === key.projectId || key.orgId && sibling.orgId === key.orgId)) {
              await AiKeyStore.updateKeyStatus(sibling.id, {
                status: "TEMPORARILY_UNAVAILABLE",
                cooldownUntil,
                lastErrorCategory: category,
                lastErrorMessage: `Project/Org quota cooldown inherited from ${key.maskedKey}`
              });
            }
          }
        }
      }
      /**
       * Executes a single attempt on Groq using the selected key.
       */
      async executeGroqAttempt(key, model, options, timeoutMs) {
        const decryptedKey = AiKeyStore.decryptKey(key);
        const messages = [];
        if (options.systemPrompt) {
          messages.push({ role: "system", content: options.systemPrompt });
        }
        if (options.history && options.history.length > 0) {
          options.history.forEach((h) => {
            messages.push({ role: h.role, content: h.text });
          });
        }
        messages.push({ role: "user", content: options.userPrompt });
        return callGroqChat(decryptedKey, model, messages, {
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          timeoutMs
        });
      }
      /**
       * Executes a single attempt on Gemini using the selected key.
       */
      async executeGeminiAttempt(key, model, options, timeoutMs) {
        const decryptedKey = AiKeyStore.decryptKey(key);
        let fullPrompt = "";
        if (options.history && options.history.length > 0) {
          const historyStr = options.history.map((h) => `${h.role === "user" ? "Learner" : "Sakhi"}: ${h.text}`).join("\n");
          fullPrompt = `Previous Conversation:
${historyStr}

Current Question: ${options.userPrompt}`;
        } else {
          fullPrompt = options.userPrompt;
        }
        return callGeminiGenerate(decryptedKey, model, fullPrompt, {
          systemPrompt: options.systemPrompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          timeoutMs
        });
      }
      /**
       * Attempts completion with a specific provider with round-robin failover across multiple keys.
       */
      async tryProviderCompletion(provider, options) {
        const config = await AiKeyStore.getProviderConfig(provider);
        const retryBudget = config.retryBudget || 3;
        const model = config.preferredModel;
        const timeoutMs = config.timeoutMs || 8e3;
        const triedKeyIds = /* @__PURE__ */ new Set();
        let attempts = 0;
        let lastError = null;
        while (attempts < retryBudget) {
          const key = await this.selectEligibleKey(provider, triedKeyIds);
          if (!key) {
            break;
          }
          triedKeyIds.add(key.id);
          attempts++;
          try {
            let result;
            if (provider === "groq") {
              result = await this.executeGroqAttempt(key, model, options, timeoutMs);
            } else {
              result = await this.executeGeminiAttempt(key, model, options, timeoutMs);
            }
            await AiKeyStore.updateKeyStatus(key.id, {
              status: "ACTIVE",
              cooldownUntil: void 0,
              lastUsedAt: (/* @__PURE__ */ new Date()).toISOString(),
              lastSuccessAt: (/* @__PURE__ */ new Date()).toISOString(),
              successCount: key.successCount + 1,
              failureCount: 0
            });
            this.recordMetricEvent({
              id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              provider,
              model,
              keyId: key.id,
              success: true,
              retryCount: attempts - 1,
              latencyMs: result.latencyMs
            });
            return {
              text: result.text,
              provider,
              model,
              keyId: key.id,
              retries: attempts - 1,
              latencyMs: result.latencyMs
            };
          } catch (err) {
            lastError = err;
            const category = err instanceof ProviderApiError ? err.category : "UNKNOWN";
            this.recordMetricEvent({
              id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              provider,
              model,
              keyId: key.id,
              success: false,
              errorCategory: category,
              retryCount: attempts - 1,
              latencyMs: 0
            });
            if (category === "AUTH_FAILURE") {
              await AiKeyStore.updateKeyStatus(key.id, {
                status: "FAILED",
                lastErrorCategory: category,
                lastErrorMessage: err.message.slice(0, 300),
                failureCount: key.failureCount + 1
              });
              continue;
            }
            if (category === "RATE_LIMIT") {
              const cooldownMs = err instanceof ProviderApiError && err.retryAfterMs ? err.retryAfterMs : 3e4;
              await this.applyCooldown(key, cooldownMs, category, err.message);
              const jitter = Math.random() * 200;
              await new Promise((r) => setTimeout(r, jitter));
              continue;
            }
            if (category === "TRANSIENT_SERVER_ERROR" || category === "TIMEOUT" || category === "NETWORK_ERROR") {
              await this.applyCooldown(key, 8e3, category, err.message);
              const backoff = Math.min(1500, 200 * Math.pow(1.5, attempts)) + Math.random() * 100;
              await new Promise((r) => setTimeout(r, backoff));
              continue;
            }
            if (category === "INVALID_REQUEST" || category === "MODEL_NOT_FOUND") {
              await AiKeyStore.updateKeyStatus(key.id, {
                lastErrorCategory: category,
                lastErrorMessage: err.message.slice(0, 300)
              });
              throw err;
            }
            await this.applyCooldown(key, 5e3, category, err.message);
          }
        }
        throw lastError || new Error(`All eligible keys for provider "${provider}" failed or are unavailable.`);
      }
      /**
       * Main completion router:
       * Tries primary provider; on failure, automatically fails over to secondary provider.
       */
      async generateCompletion(options) {
        const primaryProvider = options.preferredProvider || "groq";
        const secondaryProvider = primaryProvider === "groq" ? "gemini" : "groq";
        const allowFallback = options.allowFallback !== false;
        const primaryKeys = await AiKeyStore.getKeysByProvider(primaryProvider);
        const secondaryKeys = await AiKeyStore.getKeysByProvider(secondaryProvider);
        let primaryFatalError = null;
        if (primaryKeys.length > 0) {
          try {
            return await this.tryProviderCompletion(primaryProvider, options);
          } catch (primaryErr) {
            if (primaryErr instanceof ProviderApiError && primaryErr.category === "INVALID_REQUEST") {
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
          } catch (secondaryErr) {
            console.warn(
              `[AI KeyManager] Secondary provider "${secondaryProvider}" also failed:`,
              secondaryErr.message
            );
          }
        }
        if (primaryFatalError && !allowFallback) {
          throw primaryFatalError;
        }
        throw new Error("All configured AI providers and keys are currently unavailable or exhausted.");
      }
      /**
       * Performs an isolated connectivity probe for a single key on admin request.
       * Does NOT expose API key or sensitive data.
       */
      async testKeyConnectivity(keyId) {
        const key = await AiKeyStore.getKeyById(keyId);
        if (!key) {
          return {
            success: false,
            latencyMs: 0,
            message: "Key not found in store",
            modelUsed: "unknown"
          };
        }
        const config = await AiKeyStore.getProviderConfig(key.provider);
        const model = config.preferredModel;
        const testPrompt = 'Respond with "OK" if online.';
        const startTime = Date.now();
        try {
          if (key.provider === "groq") {
            const res = await this.executeGroqAttempt(
              key,
              model,
              { userPrompt: testPrompt, maxTokens: 10 },
              8e3
            );
            await AiKeyStore.updateKeyStatus(key.id, {
              status: "ACTIVE",
              cooldownUntil: void 0,
              lastCheckedAt: (/* @__PURE__ */ new Date()).toISOString(),
              lastErrorMessage: void 0
            });
            return {
              success: true,
              latencyMs: res.latencyMs,
              message: "Connectivity test successful. Key is active.",
              modelUsed: model
            };
          } else {
            const res = await this.executeGeminiAttempt(
              key,
              model,
              { userPrompt: testPrompt, maxTokens: 10 },
              8e3
            );
            await AiKeyStore.updateKeyStatus(key.id, {
              status: "ACTIVE",
              cooldownUntil: void 0,
              lastCheckedAt: (/* @__PURE__ */ new Date()).toISOString(),
              lastErrorMessage: void 0
            });
            return {
              success: true,
              latencyMs: res.latencyMs,
              message: "Connectivity test successful. Key is active.",
              modelUsed: model
            };
          }
        } catch (err) {
          const latencyMs = Date.now() - startTime;
          const category = err instanceof ProviderApiError ? err.category : "UNKNOWN";
          await AiKeyStore.updateKeyStatus(key.id, {
            status: category === "AUTH_FAILURE" ? "FAILED" : "TEMPORARILY_UNAVAILABLE",
            lastCheckedAt: (/* @__PURE__ */ new Date()).toISOString(),
            lastErrorCategory: category,
            lastErrorMessage: err.message.slice(0, 300)
          });
          return {
            success: false,
            latencyMs,
            message: err.message || "Connectivity test failed",
            modelUsed: model
          };
        }
      }
      /**
       * Returns sanitized metrics and key summaries for the admin dashboard.
       */
      async getAdminMetrics() {
        const allKeys = await AiKeyStore.getAllKeys();
        const now = Date.now();
        const groqKeys = allKeys.filter((k) => k.provider === "groq");
        const geminiKeys = allKeys.filter((k) => k.provider === "gemini");
        const groqConfig = await AiKeyStore.getProviderConfig("groq");
        const geminiConfig = await AiKeyStore.getProviderConfig("gemini");
        this.metrics.providers.groq.activeKeysCount = groqKeys.filter(
          (k) => k.enabled && k.status === "ACTIVE" && (!k.cooldownUntil || k.cooldownUntil <= now)
        ).length;
        this.metrics.providers.groq.cooldownKeysCount = groqKeys.filter(
          (k) => k.cooldownUntil && k.cooldownUntil > now
        ).length;
        this.metrics.providers.groq.failedKeysCount = groqKeys.filter(
          (k) => k.status === "FAILED"
        ).length;
        this.metrics.providers.groq.disabledKeysCount = groqKeys.filter(
          (k) => !k.enabled || k.status === "DISABLED"
        ).length;
        this.metrics.providers.groq.preferredModel = groqConfig.preferredModel;
        this.metrics.providers.gemini.activeKeysCount = geminiKeys.filter(
          (k) => k.enabled && k.status === "ACTIVE" && (!k.cooldownUntil || k.cooldownUntil <= now)
        ).length;
        this.metrics.providers.gemini.cooldownKeysCount = geminiKeys.filter(
          (k) => k.cooldownUntil && k.cooldownUntil > now
        ).length;
        this.metrics.providers.gemini.failedKeysCount = geminiKeys.filter(
          (k) => k.status === "FAILED"
        ).length;
        this.metrics.providers.gemini.disabledKeysCount = geminiKeys.filter(
          (k) => !k.enabled || k.status === "DISABLED"
        ).length;
        this.metrics.providers.gemini.preferredModel = geminiConfig.preferredModel;
        return { ...this.metrics };
      }
    };
    AiKeyManager = new AiKeyManagerService();
  }
});

// src/server/app.ts
import express from "express";
import cookieParser from "cookie-parser";
import dotenv3 from "dotenv";

// src/server/routes/auth.ts
import { Router } from "express";
import bcrypt2 from "bcryptjs";

// src/server/models/User.ts
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
var UserSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    normalizedEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: "\u092E\u0939\u093F\u0932\u093E \u0909\u0926\u094D\u092F\u092E\u0940"
    },
    role: {
      type: String,
      enum: ["ADMIN", "MODERATOR", "USER"],
      default: "USER",
      index: true
    },
    accountStatus: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      index: true
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    otpHash: {
      type: String,
      select: false
    },
    otpExpiresAt: {
      type: Date
    },
    otpAttempts: {
      type: Number,
      default: 0
    },
    otpLastSentAt: {
      type: Date
    },
    otpPurpose: {
      type: String,
      enum: ["VERIFY_EMAIL", "RESET_PASSWORD"]
    },
    businessCategory: {
      type: String,
      default: "textiles_tailoring"
    },
    businessStage: {
      type: String,
      default: "starting"
    },
    location: {
      type: String,
      default: "India"
    },
    language: {
      type: String,
      enum: ["hi", "en", "mr", "bn", "ta", "te", "gu", "kn"],
      default: "hi"
    },
    sheetsSynced: {
      type: Boolean,
      default: false,
      index: true
    },
    sheetsSyncedAt: {
      type: Date
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);
UserSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};
UserSchema.statics.normalizeEmail = function(email) {
  if (!email || typeof email !== "string") return "";
  return email.toLowerCase().trim();
};
var User = mongoose.models.User || mongoose.model("User", UserSchema);

// src/server/routes/auth.ts
init_db();

// src/server/auth.ts
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
init_db();
dotenv.config();
function getJwtSecret() {
  return process.env.JWT_SECRET || "sakhibiz-dev-secret-key-change-in-production";
}
var COOKIE_NAME = "sakhibiz_session";
function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join("="));
    }
  });
  return list;
}
function extractToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const rawCookies = parseCookies(req.headers.cookie);
  if (rawCookies[COOKIE_NAME]) {
    return rawCookies[COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return null;
}
function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1e3,
    // 7 days
    path: "/"
  };
  if (typeof res.cookie === "function") {
    res.cookie(COOKIE_NAME, token, cookieOptions);
  } else {
    const cookieStr = `${COOKIE_NAME}=${token}; Path=/; Max-Age=${7 * 24 * 60 * 60}; HttpOnly; SameSite=${isProd ? "None" : "Lax"}${isProd ? "; Secure" : ""}`;
    res.setHeader("Set-Cookie", cookieStr);
  }
}
function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === "production";
  if (typeof res.clearCookie === "function") {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/"
    });
  } else {
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`
    );
  }
}
function normalizeAdminEmail(raw) {
  if (!raw || typeof raw !== "string") return null;
  let cleaned = raw.toLowerCase().trim();
  cleaned = cleaned.replace(/^["']|["']$/g, "").trim();
  const emailMatch = cleaned.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && emailMatch[1]) {
    cleaned = emailMatch[1].toLowerCase().trim();
  }
  if (!cleaned.includes("@") || cleaned.length < 5) return null;
  return cleaned;
}
function checkIsInitialAdmin(email) {
  if (!email || typeof email !== "string") return false;
  const configuredAdmin = normalizeAdminEmail(process.env.INITIAL_ADMIN_EMAIL);
  if (!configuredAdmin) return false;
  const candidate = normalizeAdminEmail(email);
  if (!candidate) return false;
  return candidate === configuredAdmin;
}
function requireAuth(allowedRoles) {
  return async (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "Authentication required. Please sign in." });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
    }
    req.tokenPayload = payload;
    if (isMongoConfigured()) {
      try {
        await connectMongo();
        const user = await User.findOne({ userId: payload.userId });
        if (!user) {
          return res.status(401).json({ error: "User account not found." });
        }
        if (user.accountStatus === "SUSPENDED") {
          clearAuthCookie(res);
          return res.status(403).json({
            error: "This account has been suspended. Please contact the administrator."
          });
        }
        if (checkIsInitialAdmin(user.normalizedEmail) && user.role !== "ADMIN") {
          user.role = "ADMIN";
          await user.save();
        }
        req.user = user;
        req.tokenPayload.role = user.role;
      } catch (err) {
        console.warn("DB lookup failed in auth middleware, relying on token payload:", err);
      }
    }
    const effectiveRole = req.user?.role || req.tokenPayload.role;
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(effectiveRole)) {
        return res.status(403).json({
          error: `Permission denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${effectiveRole}.`
        });
      }
    }
    next();
  };
}

// src/data/courses.ts
var COURSES_DATA = [
  {
    id: "course-cost-pricing-profit",
    category: "pricing_profit",
    title: {
      hi: "\u0932\u093E\u0917\u0924, \u092C\u093F\u0915\u094D\u0930\u0940 \u092E\u0942\u0932\u094D\u092F \u0914\u0930 \u092E\u0941\u0928\u093E\u092B\u0947 \u0915\u093E \u0938\u0939\u0940 \u0939\u093F\u0938\u093E\u092C",
      en: "Cost, Selling Price and Profit Calculation"
    },
    shortDescription: {
      hi: "\u0938\u0940\u0916\u0947\u0902 \u0915\u093F \u0918\u0930\u0947\u0932\u0942 \u0909\u0924\u094D\u092A\u093E\u0926\u094B\u0902 (\u0938\u093F\u0932\u093E\u0908, \u0906\u091A\u093E\u0930, \u092A\u093E\u092A\u0921\u093C, \u0939\u0938\u094D\u0924\u0936\u093F\u0932\u094D\u092A) \u0915\u0940 \u0905\u0938\u0932\u0940 \u0932\u093E\u0917\u0924 \u0915\u0948\u0938\u0947 \u0928\u093F\u0915\u093E\u0932\u0947\u0902 \u0914\u0930 \u0938\u0939\u0940 \u092E\u0941\u0928\u093E\u092B\u093E \u0915\u0948\u0938\u0947 \u0924\u092F \u0915\u0930\u0947\u0902\u0964",
      en: "Master how to accurately calculate raw materials, labor, overheads, and set profitable selling prices."
    },
    fullDescription: {
      hi: "\u0905\u0915\u094D\u0938\u0930 \u0917\u094D\u0930\u093E\u092E\u0940\u0923 \u0914\u0930 \u091B\u094B\u091F\u0947 \u0917\u0943\u0939-\u0909\u0926\u094D\u092F\u094B\u0917\u094B\u0902 \u092E\u0947\u0902 \u092E\u0939\u093F\u0932\u093E\u090F\u0902 \u0938\u093F\u0930\u094D\u092B \u0915\u091A\u094D\u091A\u0947 \u092E\u093E\u0932 \u0915\u093E \u0916\u0930\u094D\u091A \u091C\u094B\u0921\u093C\u0924\u0940 \u0939\u0948\u0902 \u0914\u0930 \u0905\u092A\u0928\u0940 \u092E\u0947\u0939\u0928\u0924, \u092C\u093F\u091C\u0932\u0940 \u092F\u093E \u0906\u0928\u0947-\u091C\u093E\u0928\u0947 \u0915\u0947 \u0916\u0930\u094D\u091A \u0915\u094B \u092D\u0942\u0932 \u091C\u093E\u0924\u0940 \u0939\u0948\u0902\u0964 \u0907\u0938 \u0915\u094B\u0930\u094D\u0938 \u092E\u0947\u0902 \u0906\u092A \u0935\u094D\u092F\u093E\u0935\u0939\u093E\u0930\u093F\u0915 \u0909\u0926\u093E\u0939\u0930\u0923\u094B\u0902 \u0938\u0947 \u0938\u0940\u0916\u0947\u0902\u0917\u0947 \u0915\u093F \u0915\u0948\u0938\u0947 \u0905\u092A\u0928\u0947 \u0938\u092E\u092F \u0915\u0940 \u0915\u0940\u092E\u0924 \u0924\u092F \u0915\u0930\u0947\u0902, \u0939\u0930 \u091B\u094B\u091F\u0947-\u092C\u0921\u093C\u0947 \u0916\u0930\u094D\u091A \u0915\u094B \u091C\u094B\u0921\u093C\u0947\u0902 \u0914\u0930 \u0938\u092E\u094D\u092E\u093E\u0928\u091C\u0928\u0915 \u092E\u0941\u0928\u093E\u092B\u093E \u0915\u092E\u093E\u090F\u0902\u0964",
      en: "Micro-entrepreneurs often underprice their items by neglecting personal labor, transport, and indirect costs. This course uses everyday small-business scenarios to show you how to price for sustainable profit."
    },
    level: "Beginner",
    estimatedHours: 2.5,
    languageAvailable: ["hi", "en"],
    thumbnail: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80",
    badgeTitle: {
      hi: "\u092E\u0941\u0928\u093E\u092B\u093E \u0935\u093F\u0936\u0947\u0937\u091C\u094D\u091E \u0938\u0916\u0940 (Profit Master)",
      en: "Profit & Pricing Specialist"
    },
    rating: 4.9,
    reviewCount: 342,
    lessons: [
      {
        id: "lesson-cost-types",
        courseId: "course-cost-pricing-profit",
        order: 1,
        durationMinutes: 15,
        title: {
          hi: "1. \u0915\u091A\u094D\u091A\u0947 \u092E\u093E\u0932 \u0914\u0930 \u091B\u093F\u092A\u0947 \u0939\u0941\u090F \u0916\u0930\u094D\u091A\u094B\u0902 \u0915\u0940 \u092A\u0939\u091A\u093E\u0928",
          en: "1. Identifying Raw Materials and Hidden Costs"
        },
        summary: {
          hi: "\u091C\u093E\u0928\u0947\u0902 \u0915\u093F \u092A\u094D\u0930\u0924\u094D\u092F\u0915\u094D\u0937 (Direct) \u0914\u0930 \u0905\u092A\u094D\u0930\u0924\u094D\u092F\u0915\u094D\u0937 (Indirect) \u0932\u093E\u0917\u0924 \u092E\u0947\u0902 \u0915\u094D\u092F\u093E \u0905\u0902\u0924\u0930 \u0939\u0948 \u0914\u0930 \u0915\u094D\u092F\u094B\u0902 \u0915\u094B\u0908 \u092D\u0940 \u0916\u0930\u094D\u091A \u091B\u094B\u091F\u093E \u0928\u0939\u0940\u0902 \u0939\u094B\u0924\u093E\u0964",
          en: "Understand the critical difference between direct raw materials and hidden indirect overheads."
        },
        content: {
          hi: {
            introduction: "\u0915\u093F\u0938\u0940 \u092D\u0940 \u0935\u0938\u094D\u0924\u0941 \u0915\u094B \u092C\u0928\u093E\u0928\u0947 \u092E\u0947\u0902 \u0938\u093F\u0930\u094D\u092B \u0915\u091A\u094D\u091A\u093E \u092E\u093E\u0932 \u0939\u0940 \u0916\u0930\u094D\u091A \u0928\u0939\u0940\u0902 \u0939\u094B\u0924\u093E\u0964 \u0915\u0908 \u0910\u0938\u0947 \u091B\u094B\u091F\u0947 \u0916\u0930\u094D\u091A \u0939\u094B\u0924\u0947 \u0939\u0948\u0902 \u091C\u093F\u0928\u094D\u0939\u0947\u0902 \u0939\u092E \u0928\u091C\u093C\u0930\u0905\u0902\u0926\u093E\u091C\u093C \u0915\u0930 \u0926\u0947\u0924\u0947 \u0939\u0948\u0902, \u091C\u093F\u0938\u0938\u0947 \u092E\u0939\u0940\u0928\u0947 \u0915\u0947 \u0905\u0902\u0924 \u092E\u0947\u0902 \u091C\u0947\u092C \u0916\u093E\u0932\u0940 \u0930\u0939 \u091C\u093E\u0924\u0940 \u0939\u0948\u0964",
            storyExample: {
              character: "\u0938\u0941\u0928\u0940\u0924\u093E \u0926\u0940\u0926\u0940 (\u0938\u0942\u091F \u0938\u093F\u0932\u093E\u0908 \u0915\u093E\u0930\u094D\u092F)",
              title: "\u0938\u0941\u0928\u0940\u0924\u093E \u0926\u0940\u0926\u0940 \u0915\u0940 \u0906\u0902\u0916\u0947\u0902 \u0915\u0948\u0938\u0947 \u0916\u0941\u0932\u0940\u0902",
              story: "\u0938\u0941\u0928\u0940\u0924\u093E \u0926\u0940\u0926\u0940 \u0928\u0947 \u20B9200 \u0915\u093E \u0915\u092A\u0921\u093C\u093E \u0914\u0930 \u20B920 \u0915\u0947 \u092C\u091F\u0928 \u0916\u0930\u0940\u0926\u0915\u0930 \u090F\u0915 \u0915\u0941\u0930\u094D\u0924\u0940 \u0938\u093F\u0932\u0940 \u0914\u0930 \u092A\u0921\u093C\u094B\u0938\u0928 \u0915\u094B \u20B9250 \u092E\u0947\u0902 \u0926\u0947 \u0926\u0940\u0964 \u0909\u0928\u094D\u0939\u0947\u0902 \u0932\u0917\u093E \u20B930 \u0915\u093E \u092B\u093E\u092F\u0926\u093E \u0939\u0941\u0906\u0964 \u0932\u0947\u0915\u093F\u0928 \u091C\u092C \u0909\u0928\u094D\u0939\u094B\u0902\u0928\u0947 \u0938\u093F\u0932\u093E\u0908 \u092E\u0936\u0940\u0928 \u0915\u0940 \u0938\u0941\u0908, \u0924\u0947\u0932, \u092A\u094D\u0930\u0947\u0938 \u0915\u0940 \u092C\u093F\u091C\u0932\u0940 \u0914\u0930 \u0926\u0941\u0915\u093E\u0928 \u0924\u0915 \u0911\u091F\u094B \u0915\u0947 \u20B920 \u091C\u094B\u0921\u093C\u0947, \u0924\u094B \u0909\u0928\u094D\u0939\u0947\u0902 \u092A\u0924\u093E \u091A\u0932\u093E \u0915\u093F \u0935\u0947 \u0909\u0932\u094D\u091F\u0947 \u20B95 \u0915\u0947 \u0918\u093E\u091F\u0947 \u092E\u0947\u0902 \u0925\u0940\u0902!"
            },
            sections: [
              {
                heading: "1. \u092A\u094D\u0930\u0924\u094D\u092F\u0915\u094D\u0937 \u0932\u093E\u0917\u0924 (\u0915\u091A\u094D\u091A\u093E \u092E\u093E\u0932)",
                body: "\u0935\u0939 \u0938\u093E\u092E\u093E\u0928 \u091C\u094B \u0938\u0940\u0927\u0947 \u0909\u0924\u094D\u092A\u093E\u0926 \u092E\u0947\u0902 \u0907\u0938\u094D\u0924\u0947\u092E\u093E\u0932 \u0939\u094B\u0924\u093E \u0939\u0948\u0964 \u091C\u0948\u0938\u0947: \u0915\u092A\u0921\u093C\u093E, \u0906\u091A\u093E\u0930 \u0915\u0947 \u0932\u093F\u090F \u0906\u092E, \u092E\u0938\u093E\u0932\u0947, \u0924\u0947\u0932, \u092E\u093F\u0920\u093E\u0908 \u0915\u0947 \u0932\u093F\u090F \u091A\u0940\u0928\u0940 \u0935 \u092E\u093E\u0935\u093E\u0964 \u0907\u0938\u0947 \u0917\u093F\u0928\u0928\u093E \u0906\u0938\u093E\u0928 \u0939\u094B\u0924\u093E \u0939\u0948\u0964",
                tip: "\u0939\u092E\u0947\u0936\u093E \u0925\u094B\u0915 \u092E\u0902\u0921\u0940 \u0938\u0947 \u0916\u0930\u0940\u0926\u093E\u0930\u0940 \u0915\u0940 \u0930\u0938\u0940\u0926 \u092F\u093E \u0921\u093E\u092F\u0930\u0940 \u092E\u0947\u0902 \u0926\u093E\u092E \u0928\u094B\u091F \u0915\u0930\u0947\u0902\u0964"
              },
              {
                heading: "2. \u0905\u092A\u094D\u0930\u0924\u094D\u092F\u0915\u094D\u0937 \u0932\u093E\u0917\u0924 (\u091B\u093F\u092A\u0947 \u0939\u0941\u090F \u0916\u0930\u094D\u091A)",
                body: "\u0935\u0939 \u0916\u0930\u094D\u091A \u091C\u094B \u0909\u0924\u094D\u092A\u093E\u0926 \u092E\u0947\u0902 \u0938\u0940\u0927\u0947 \u0928\u0939\u0940\u0902 \u0926\u093F\u0916\u0924\u093E \u0932\u0947\u0915\u093F\u0928 \u0909\u0938\u0915\u0947 \u092C\u093F\u0928\u093E \u0915\u093E\u092E \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u0924\u093E\u0964 \u091C\u0948\u0938\u0947: \u0917\u0948\u0938/\u092C\u093F\u091C\u0932\u0940 \u0915\u093E \u092C\u093F\u0932, \u092A\u0948\u0915\u093F\u0902\u0917 \u0915\u0940 \u092A\u0949\u0932\u0940\u0925\u093F\u0928, \u0921\u093F\u092C\u094D\u092C\u0947, \u0938\u093F\u0932\u093E\u0908 \u092E\u0936\u0940\u0928 \u0915\u093E \u0930\u0916-\u0930\u0916\u093E\u0935 \u0914\u0930 \u0938\u093E\u092E\u093E\u0928 \u0932\u093E\u0928\u0947-\u0932\u0947 \u091C\u093E\u0928\u0947 \u0915\u093E \u0915\u093F\u0930\u093E\u092F\u093E\u0964",
                tip: "\u0939\u0930 \u092A\u0940\u0938 \u092A\u0930 \u0915\u092E \u0938\u0947 \u0915\u092E \u20B910 \u0938\u0947 \u20B925 \u0905\u092A\u094D\u0930\u0924\u094D\u092F\u0915\u094D\u0937 \u0916\u0930\u094D\u091A \u091C\u093C\u0930\u0942\u0930 \u091C\u094B\u0921\u093C\u0947\u0902\u0964"
              }
            ],
            practicalActivity: {
              title: "\u0906\u091C \u0939\u0940 \u0905\u092A\u0928\u0940 \u0921\u093E\u092F\u0930\u0940 \u092E\u0947\u0902 \u092F\u0939 \u0905\u092D\u094D\u092F\u093E\u0938 \u0915\u0930\u0947\u0902:",
              instructions: [
                "\u0905\u092A\u0928\u0947 \u0915\u093F\u0938\u0940 \u090F\u0915 \u0909\u0924\u094D\u092A\u093E\u0926 (\u091C\u0948\u0938\u0947 1 \u0915\u093F\u0932\u094B \u0906\u091A\u093E\u0930 \u092F\u093E 1 \u092C\u094D\u0932\u093E\u0909\u091C) \u0915\u094B \u091A\u0941\u0928\u0947\u0902\u0964",
                "\u092C\u093E\u090F\u0902 \u092A\u0928\u094D\u0928\u0947 \u092A\u0930 \u0915\u091A\u094D\u091A\u0947 \u092E\u093E\u0932 \u0915\u0940 \u0938\u0942\u091A\u0940 \u0914\u0930 \u0915\u0940\u092E\u0924 \u0932\u093F\u0916\u0947\u0902\u0964",
                "\u0926\u093E\u090F\u0902 \u092A\u0928\u094D\u0928\u0947 \u092A\u0930 3 \u091B\u093F\u092A\u0947 \u0939\u0941\u090F \u0916\u0930\u094D\u091A (\u091C\u0948\u0938\u0947 \u092C\u093F\u091C\u0932\u0940, \u0917\u0948\u0938, \u0911\u091F\u094B \u0915\u093F\u0930\u093E\u092F\u093E \u092F\u093E \u0921\u093F\u092C\u094D\u092C\u093E) \u0932\u093F\u0916\u0947\u0902\u0964",
                "\u0926\u094B\u0928\u094B\u0902 \u0915\u093E \u091C\u094B\u0921\u093C \u0928\u093F\u0915\u093E\u0932\u0947\u0902 \u2014 \u092F\u0939 \u0906\u092A\u0915\u0940 \u0935\u093E\u0938\u094D\u0924\u0935\u093F\u0915 \u0938\u093E\u092E\u0917\u094D\u0930\u0940 \u0932\u093E\u0917\u0924 \u0939\u0948!"
              ]
            },
            keyTakeaways: [
              "\u0938\u093F\u0930\u094D\u092B \u0915\u092A\u0921\u093C\u0947 \u092F\u093E \u092E\u0938\u093E\u0932\u0947 \u0915\u0940 \u0915\u0940\u092E\u0924 \u0939\u0940 \u0932\u093E\u0917\u0924 \u0928\u0939\u0940\u0902 \u0939\u094B\u0924\u0940\u0964",
              "\u091B\u093F\u092A\u0947 \u0939\u0941\u090F \u0916\u0930\u094D\u091A (\u092A\u0948\u0915\u093F\u0902\u0917, \u092C\u093F\u091C\u0932\u0940, \u0915\u093F\u0930\u093E\u092F\u093E) \u0915\u094B \u0928 \u091C\u094B\u0921\u093C\u0928\u0947 \u0938\u0947 \u0938\u0940\u0927\u093E \u0928\u0941\u0915\u0938\u093E\u0928 \u0939\u094B\u0924\u093E \u0939\u0948\u0964",
              "\u0939\u0930 \u091B\u094B\u091F\u0940 \u0916\u0930\u0940\u0926\u093E\u0930\u0940 \u0915\u0940 \u092A\u0930\u094D\u091A\u0940 \u0938\u0902\u092D\u093E\u0932 \u0915\u0930 \u0930\u0916\u0947\u0902\u0964"
            ]
          },
          en: {
            introduction: "Producing any handcrafted or homemade item involves more than just raw ingredients. Hidden overheads frequently erode real earnings if ignored.",
            storyExample: {
              character: "Sunita Didi (Tailoring & Garments)",
              title: "Why Sunita\u2019s Ledger Was In The Red",
              story: "Sunita bought cloth for \u20B9200 and buttons for \u20B920, stitched a kurti, and sold it to a neighbour for \u20B9250. She assumed a \u20B930 profit. But once she accounted for machine oil, electricity for ironing, and \u20B920 shared auto fare to the market, she was actually losing \u20B95 per kurti!"
            },
            sections: [
              {
                heading: "1. Direct Costs (Raw Materials)",
                body: "Materials that physically go into the item: fabric, raw mangoes, mustard oil, glass jars, spices, sugar.",
                tip: "Always note bulk wholesale prices to keep direct costs lean."
              },
              {
                heading: "2. Indirect Overheads (Hidden Costs)",
                body: "Necessary operational expenses: gas cylinder usage, transport fare, packaging tapes, machine maintenance, label tags.",
                tip: "Allocate \u20B910 to \u20B930 per unit to cover indirect overheads."
              }
            ],
            practicalActivity: {
              title: "Practical Ledger Exercise:",
              instructions: [
                "Pick one standard item you sell (e.g., 1 kg pickle or 1 stitched dress).",
                "List all direct raw material inputs on the left column.",
                "List at least 3 hidden overheads (packaging, power, transport) on the right column.",
                "Sum both columns to find your true Base Material Cost."
              ]
            },
            keyTakeaways: [
              "Raw material cost is never your total cost.",
              "Neglecting overheads leads to silent business losses.",
              "Maintain a simple daily register of all supplies purchased."
            ]
          }
        }
      },
      {
        id: "lesson-labor-time-value",
        courseId: "course-cost-pricing-profit",
        order: 2,
        durationMinutes: 18,
        title: {
          hi: "2. \u0905\u092A\u0928\u0940 \u092E\u0947\u0939\u0928\u0924 \u0914\u0930 \u0938\u092E\u092F \u0915\u093E \u092E\u0942\u0932\u094D\u092F \u0924\u092F \u0915\u0930\u0928\u093E",
          en: "2. Valuing Your Personal Labor and Time"
        },
        summary: {
          hi: '\u0905\u092A\u0928\u0940 \u092E\u0947\u0939\u0928\u0924 \u0915\u094B "\u092E\u0941\u092B\u093C\u094D\u0924" \u0938\u092E\u091D\u0928\u093E \u0938\u092C\u0938\u0947 \u092C\u0921\u093C\u0940 \u092D\u0942\u0932 \u0939\u0948\u0964 \u091C\u093E\u0928\u093F\u090F \u092A\u094D\u0930\u0924\u093F \u0918\u0902\u091F\u093E \u092F\u093E \u092A\u094D\u0930\u0924\u093F \u092A\u0940\u0938 \u0936\u094D\u0930\u092E \u0932\u093E\u0917\u0924 \u0915\u0948\u0938\u0947 \u0928\u093F\u0915\u093E\u0932\u0947\u0902\u0964',
          en: "Treating your own time as free is the fastest route to burnout. Learn how to calculate fair labor cost."
        },
        content: {
          hi: {
            introduction: '\u092E\u0939\u093F\u0932\u093E\u090F\u0902 \u0905\u0915\u094D\u0938\u0930 \u0915\u0939\u0924\u0940 \u0939\u0948\u0902, "\u092E\u0947\u0939\u0928\u0924 \u0924\u094B \u092E\u0947\u0930\u0940 \u0905\u092A\u0928\u0940 \u0939\u0940 \u0939\u0948, \u0909\u0938\u0915\u093E \u0915\u094D\u092F\u093E \u092A\u0948\u0938\u093E \u091C\u094B\u0921\u093C\u0928\u093E!" \u092F\u0939 \u0938\u094B\u091A \u0906\u092A\u0915\u0947 \u0935\u094D\u092F\u093E\u092A\u093E\u0930 \u0915\u094B \u0915\u092D\u0940 \u0906\u0917\u0947 \u0928\u0939\u0940\u0902 \u092C\u0922\u093C\u0928\u0947 \u0926\u0947\u0924\u0940\u0964 \u092F\u0926\u093F \u0906\u092A \u0915\u093F\u0938\u0940 \u0915\u093E\u0930\u0940\u0917\u0930 \u0915\u094B \u0930\u0916\u0924\u0947, \u0924\u094B \u0909\u0938\u0947 \u092E\u091C\u0926\u0942\u0930\u0940 \u0926\u0947\u0924\u0947 \u2014 \u0907\u0938\u0932\u093F\u090F \u0916\u0941\u0926 \u0915\u0940 \u092E\u0947\u0939\u0928\u0924 \u092D\u0940 \u090F\u0915 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0932\u093E\u0917\u0924 \u0939\u0948\u0964',
            storyExample: {
              character: "\u092E\u0940\u0928\u093E \u0924\u093E\u0908 (\u0939\u0938\u094D\u0924\u0928\u093F\u0930\u094D\u092E\u093F\u0924 \u092C\u0948\u0917)",
              title: "\u092E\u0940\u0928\u093E \u0924\u093E\u0908 \u0915\u0940 \u0938\u092E\u091D\u0926\u093E\u0930\u0940",
              story: "\u092E\u0940\u0928\u093E \u0924\u093E\u0908 \u090F\u0915 \u091C\u0942\u091F \u092C\u0948\u0917 \u092C\u0928\u093E\u0928\u0947 \u092E\u0947\u0902 4 \u0918\u0902\u091F\u0947 \u0932\u0917\u093E\u0924\u0940 \u0925\u0940\u0902\u0964 \u091C\u092C \u0909\u0928\u094D\u0939\u094B\u0902\u0928\u0947 \u0924\u092F \u0915\u093F\u092F\u093E \u0915\u093F \u0909\u0928\u0915\u0947 1 \u0918\u0902\u091F\u0947 \u0915\u0940 \u092E\u0947\u0939\u0928\u0924 \u0915\u092E \u0938\u0947 \u0915\u092E \u20B940 \u0915\u0940 \u0939\u0948 (4 \u0918\u0902\u091F\u0947 = \u20B9160), \u0924\u092C \u091C\u093E\u0915\u0930 \u0935\u0947 \u0938\u092E\u091D \u092A\u093E\u0908\u0902 \u0915\u093F \u0909\u0928\u094D\u0939\u0947\u0902 \u092C\u0948\u0917 \u0915\u093F\u0924\u0928\u0947 \u092E\u0947\u0902 \u092C\u0947\u091A\u0928\u093E \u091A\u093E\u0939\u093F\u090F \u0924\u093E\u0915\u093F \u0909\u0928\u0915\u093E \u092A\u0930\u093F\u0935\u093E\u0930 \u0906\u0924\u094D\u092E\u0928\u093F\u0930\u094D\u092D\u0930 \u092C\u0928 \u0938\u0915\u0947\u0964"
            },
            sections: [
              {
                heading: "1. \u092A\u094D\u0930\u0924\u093F \u0918\u0902\u091F\u093E \u092E\u0947\u0939\u0928\u0924 \u0915\u093E \u0939\u093F\u0938\u093E\u092C",
                body: "\u092E\u093E\u0928 \u0932\u0940\u091C\u093F\u090F \u0906\u092A \u092E\u0939\u0940\u0928\u0947 \u092E\u0947\u0902 25 \u0926\u093F\u0928, \u0930\u094B\u091C\u093E\u0928\u093E 6 \u0918\u0902\u091F\u0947 \u0915\u093E\u092E \u0915\u0930\u0924\u0940 \u0939\u0948\u0902 (\u0915\u0941\u0932 150 \u0918\u0902\u091F\u0947)\u0964 \u092F\u0926\u093F \u0906\u092A \u0905\u092A\u0928\u0947 \u0932\u093F\u090F \u092E\u0939\u0940\u0928\u0947 \u0915\u093E \u20B96,000 \u0928\u094D\u092F\u0942\u0928\u0924\u092E \u092A\u093E\u0930\u093F\u0936\u094D\u0930\u092E\u093F\u0915 \u091A\u093E\u0939\u0924\u0940 \u0939\u0948\u0902, \u0924\u094B \u0906\u092A\u0915\u0940 1 \u0918\u0902\u091F\u0947 \u0915\u0940 \u0915\u0940\u092E\u0924 \u20B940 \u0939\u0941\u0908 (\u20B96000 \xF7 150)\u0964",
                tip: "\u092F\u0926\u093F \u0915\u093F\u0938\u0940 \u0909\u0924\u094D\u092A\u093E\u0926 \u092E\u0947\u0902 2 \u0918\u0902\u091F\u0947 \u0932\u0917\u0924\u0947 \u0939\u0948\u0902, \u0924\u094B \u0936\u094D\u0930\u092E \u0932\u093E\u0917\u0924 = 2 \xD7 \u20B940 = \u20B980\u0964"
              },
              {
                heading: "2. \u092E\u091C\u0926\u0942\u0930\u0940 \u0932\u093E\u0917\u0924 \u091C\u094B\u0921\u093C\u0928\u093E \u0915\u094D\u092F\u094B\u0902 \u091C\u093C\u0930\u0942\u0930\u0940 \u0939\u0948?",
                body: "\u091C\u092C \u0915\u0932 \u0906\u092A\u0915\u093E \u0915\u093E\u092E \u092C\u0922\u093C\u0947\u0917\u093E \u0914\u0930 \u0906\u092A \u0915\u093F\u0938\u0940 \u0938\u0939\u093E\u092F\u093F\u0915\u093E \u0915\u094B \u0930\u0916\u0947\u0902\u0917\u0940, \u0924\u094B \u0917\u094D\u0930\u093E\u0939\u0915 \u0905\u091A\u093E\u0928\u0915 \u092C\u0922\u093C\u0940 \u0939\u0941\u0908 \u0915\u0940\u092E\u0924 \u0938\u094D\u0935\u0940\u0915\u093E\u0930 \u0928\u0939\u0940\u0902 \u0915\u0930\u0947\u0902\u0917\u0947\u0964 \u0907\u0938\u0932\u093F\u090F \u0936\u0941\u0930\u0942 \u0938\u0947 \u0939\u0940 \u0936\u094D\u0930\u092E \u0932\u093E\u0917\u0924 \u091C\u094B\u0921\u093C\u0915\u0930 \u091A\u0932\u0947\u0902\u0964",
                tip: '\u0936\u094D\u0930\u092E \u0932\u093E\u0917\u0924 \u0915\u094B \u0932\u093E\u0917\u0924 (Cost) \u092E\u0947\u0902 \u091C\u094B\u0921\u093C\u0947\u0902, \u092F\u0939 \u0906\u092A\u0915\u093E "\u092E\u0941\u0928\u093E\u092B\u093E" \u0928\u0939\u0940\u0902 \u092C\u0932\u094D\u0915\u093F \u0906\u092A\u0915\u0940 "\u092E\u091C\u0926\u0942\u0930\u0940" \u0939\u0948\u0964'
              }
            ],
            practicalActivity: {
              title: "\u0905\u092A\u0928\u0947 \u0938\u092E\u092F \u0915\u093E \u092E\u0942\u0932\u094D\u092F \u0928\u093F\u0915\u093E\u0932\u0947\u0902:",
              instructions: [
                "\u0924\u092F \u0915\u0930\u0947\u0902 \u0915\u093F \u0906\u092A \u092E\u0939\u0940\u0928\u0947 \u092E\u0947\u0902 \u0905\u092A\u0928\u0940 \u092E\u0947\u0939\u0928\u0924 \u0915\u093E \u0915\u093F\u0924\u0928\u093E \u092A\u093E\u0930\u093F\u0936\u094D\u0930\u092E\u093F\u0915 \u092A\u093E\u0928\u093E \u091A\u093E\u0939\u0924\u0940 \u0939\u0948\u0902 (\u0909\u0926\u093E. \u20B95,000 \u092F\u093E \u20B98,000)\u0964",
                "\u092E\u0939\u0940\u0928\u0947 \u092E\u0947\u0902 \u091C\u093F\u0924\u0928\u0947 \u0918\u0902\u091F\u0947 \u0915\u093E\u092E \u0915\u0930\u0924\u0940 \u0939\u0948\u0902, \u0909\u0938\u0938\u0947 \u092D\u093E\u0917 \u0926\u0947\u0902\u0964",
                "\u0905\u092C \u0905\u092A\u0928\u0947 \u0909\u0924\u094D\u092A\u093E\u0926 \u0915\u094B \u092C\u0928\u093E\u0928\u0947 \u092E\u0947\u0902 \u0932\u0917\u0928\u0947 \u0935\u093E\u0932\u0947 \u0918\u0902\u091F\u094B\u0902 \u0938\u0947 \u0917\u0941\u0923\u093E \u0915\u0930\u0947\u0902\u0964 \u092F\u0939\u0940 \u0906\u092A\u0915\u0940 \u0936\u094D\u0930\u092E \u0932\u093E\u0917\u0924 \u0939\u0948!"
              ]
            },
            keyTakeaways: [
              "\u0906\u092A\u0915\u0940 \u0905\u092A\u0928\u0940 \u092E\u0947\u0939\u0928\u0924 \u092E\u0941\u092B\u093C\u094D\u0924 \u0928\u0939\u0940\u0902 \u0939\u0948; \u092F\u0939 \u090F\u0915 \u0935\u094D\u092F\u093E\u0935\u0938\u093E\u092F\u093F\u0915 \u0932\u093E\u0917\u0924 \u0939\u0948\u0964",
              "\u0936\u094D\u0930\u092E \u0936\u0941\u0932\u094D\u0915 \u0924\u092F \u0915\u0930\u0928\u0947 \u0938\u0947 \u092D\u0935\u093F\u0937\u094D\u092F \u092E\u0947\u0902 \u0915\u093E\u0930\u0940\u0917\u0930 \u0930\u0916\u0928\u093E \u0906\u0938\u093E\u0928 \u0939\u094B \u091C\u093E\u0924\u093E \u0939\u0948\u0964",
              "\u0936\u094D\u0930\u092E \u092E\u091C\u0926\u0942\u0930\u0940 \u0905\u0932\u0917 \u0939\u0948 \u0914\u0930 \u0935\u094D\u092F\u093E\u092A\u093E\u0930 \u0915\u093E \u0936\u0941\u0926\u094D\u0927 \u0932\u093E\u092D (Profit) \u0905\u0932\u0917 \u0939\u0948\u0964"
            ]
          },
          en: {
            introduction: 'Women frequently say: "It\u2019s just my own time, so it costs nothing." This mindset prevents micro-enterprises from scaling. If you hired a helper, you would pay wages\u2014your time is equally valuable.',
            storyExample: {
              character: "Meena Tai (Jute Handicrafts)",
              title: "Meena\u2019s Transformation",
              story: "Meena Tai spent 4 hours crafting an embroidered tote bag. Once she valued her skill at \u20B940/hour (\u20B9160 per bag), she realized her bags were worth far more than the raw jute, giving her family real financial dignity."
            },
            sections: [
              {
                heading: "1. Calculating Hourly Wage",
                body: "If you dedicate 150 hours a month and target \u20B96,000 as your earned personal wage, your hourly rate is \u20B940. A 2-hour craft requires \u20B980 in labor cost.",
                tip: "Always treat personal labor as a hard expense line item."
              },
              {
                heading: "2. Preparing to Hire and Scale",
                body: "If you do not include labor from day one, you cannot afford to hire assistants as customer demand surges without shocking clients with price hikes.",
                tip: "Labor is wages; profit is growth capital for the business."
              }
            ],
            practicalActivity: {
              title: "Set Your Hourly Baseline:",
              instructions: [
                "Set your monthly desired personal wage target (e.g. \u20B96,000).",
                "Divide by estimated monthly working hours (e.g. 150 hours = \u20B940/hr).",
                "Multiply by the time needed to make 1 unit of your product."
              ]
            },
            keyTakeaways: [
              "Your labor is a real expense, never free labor.",
              "Separating labor from profit is the key to business sustainability.",
              "Charge proudly for your artisan skills."
            ]
          }
        }
      },
      {
        id: "lesson-pricing-formula",
        courseId: "course-cost-pricing-profit",
        order: 3,
        durationMinutes: 20,
        title: {
          hi: "3. \u0938\u0939\u0940 \u092C\u093F\u0915\u094D\u0930\u0940 \u092E\u0942\u0932\u094D\u092F \u0915\u093E \u0905\u091A\u0942\u0915 \u092B\u0949\u0930\u094D\u092E\u0942\u0932\u093E",
          en: "3. The Master Formula for Selling Price and Profit"
        },
        summary: {
          hi: "\u0915\u0941\u0932 \u0932\u093E\u0917\u0924 + \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u092E\u0941\u0928\u093E\u092B\u093E = \u0938\u0939\u0940 \u092C\u093F\u0915\u094D\u0930\u0940 \u092E\u0942\u0932\u094D\u092F\u0964 \u091C\u093E\u0928\u093F\u090F 25% \u0938\u0947 40% \u092E\u093E\u0930\u094D\u091C\u093F\u0928 \u0915\u0948\u0938\u0947 \u091C\u094B\u0921\u093C\u0947\u0902\u0964",
          en: "Total Cost + Target Margin = Selling Price. How to ensure healthy 25-40% gross margins."
        },
        content: {
          hi: {
            introduction: "\u0905\u092C \u0938\u092E\u092F \u0906 \u0917\u092F\u093E \u0939\u0948 \u0938\u092D\u0940 \u091F\u0941\u0915\u0921\u093C\u094B\u0902 \u0915\u094B \u091C\u094B\u0921\u093C\u0915\u0930 \u090F\u0915 \u0910\u0938\u093E \u092C\u093F\u0915\u094D\u0930\u0940 \u092E\u0942\u0932\u094D\u092F \u0924\u092F \u0915\u0930\u0928\u0947 \u0915\u093E \u091C\u094B \u092C\u093E\u091C\u093E\u0930 \u092E\u0947\u0902 \u0909\u091A\u093F\u0924 \u092D\u0940 \u0939\u094B \u0914\u0930 \u0906\u092A\u0915\u0947 \u0935\u094D\u092F\u0935\u0938\u093E\u092F \u0915\u094B \u0939\u0930 \u092E\u0939\u0940\u0928\u0947 \u0906\u0917\u0947 \u092D\u0940 \u092C\u0922\u093C\u093E\u090F\u0964",
            storyExample: {
              character: "\u0915\u092E\u0932\u093E \u092C\u0939\u0928 (\u092A\u093E\u092A\u0921\u093C \u0914\u0930 \u0938\u094D\u0928\u0948\u0915\u094D\u0938)",
              title: "\u0915\u092E\u0932\u093E \u092C\u0939\u0928 \u0915\u093E 100 \u092A\u0948\u0915\u0947\u091F \u0915\u093E \u0917\u0923\u093F\u0924",
              story: "\u0915\u092E\u0932\u093E \u092C\u0939\u0928 100 \u092A\u0948\u0915\u0947\u091F \u092A\u093E\u092A\u0921\u093C \u092C\u0928\u093E\u0924\u0940 \u0939\u0948\u0902\u0964 \u0915\u091A\u094D\u091A\u093E \u092E\u093E\u0932 \u20B91,200, \u092A\u0948\u0915\u093F\u0902\u0917 \u0935 \u092E\u0938\u093E\u0932\u093E \u20B9300, \u0936\u094D\u0930\u092E \u20B9500\u0964 \u0915\u0941\u0932 \u0932\u093E\u0917\u0924 \u0939\u0941\u0908 \u20B92,000 (\u092A\u094D\u0930\u0924\u093F \u092A\u0948\u0915\u0947\u091F \u20B920)\u0964 \u0909\u0928\u094D\u0939\u094B\u0902\u0928\u0947 35% \u092E\u0941\u0928\u093E\u092B\u093E (\u20B97 \u092A\u094D\u0930\u0924\u093F \u092A\u0948\u0915\u0947\u091F) \u091C\u094B\u0921\u093C\u093E \u0914\u0930 \u20B927 \u092E\u0947\u0902 \u092C\u0947\u091A\u093E\u0964 100 \u092A\u0948\u0915\u0947\u091F \u092C\u093F\u0915\u0928\u0947 \u092A\u0930 \u0909\u0928\u094D\u0939\u0947\u0902 \u20B9700 \u0915\u093E \u0936\u0941\u0926\u094D\u0927 \u0932\u093E\u092D \u0939\u0941\u0906, \u091C\u093F\u0938\u0938\u0947 \u0909\u0928\u094D\u0939\u094B\u0902\u0928\u0947 \u0928\u0908 \u092A\u0948\u0915\u0947\u091C\u093F\u0902\u0917 \u092E\u0936\u0940\u0928 \u0932\u0940!"
            },
            sections: [
              {
                heading: "\u0917\u094B\u0932\u094D\u0921\u0928 \u092B\u0949\u0930\u094D\u092E\u0942\u0932\u093E (The Golden Formula)",
                body: "\u0915\u0941\u0932 \u0932\u093E\u0917\u0924 = \u0915\u091A\u094D\u091A\u093E \u092E\u093E\u0932 + \u0936\u094D\u0930\u092E (\u092E\u0947\u0939\u0928\u0924) + \u0905\u0928\u094D\u092F \u0916\u0930\u094D\u091A (\u092A\u0948\u0915\u093F\u0902\u0917, \u092C\u093F\u091C\u0932\u0940, \u092F\u093E\u0924\u094D\u0930\u093E)\u0964\n\u092C\u093F\u0915\u094D\u0930\u0940 \u092E\u0942\u0932\u094D\u092F = \u0915\u0941\u0932 \u0932\u093E\u0917\u0924 + (\u0915\u0941\u0932 \u0932\u093E\u0917\u0924 \xD7 \u092E\u0941\u0928\u093E\u092B\u093E \u092A\u094D\u0930\u0924\u093F\u0936\u0924 \xF7 100)\u0964",
                tip: "\u0939\u0938\u094D\u0924\u0936\u093F\u0932\u094D\u092A \u0914\u0930 \u092B\u0942\u0921 \u0909\u0924\u094D\u092A\u093E\u0926\u094B\u0902 \u092E\u0947\u0902 \u0915\u092E \u0938\u0947 \u0915\u092E 30% \u0938\u0947 40% \u092E\u0941\u0928\u093E\u092B\u093E \u092E\u093E\u0930\u094D\u091C\u093F\u0928 \u0930\u0916\u0947\u0902\u0964"
              },
              {
                heading: "\u092C\u093E\u091C\u093E\u0930 \u0915\u0947 \u0926\u093E\u092E \u0938\u0947 \u0924\u0941\u0932\u0928\u093E \u0915\u0948\u0938\u0947 \u0915\u0930\u0947\u0902?",
                body: "\u092F\u0926\u093F \u0906\u092A\u0915\u093E \u0928\u093F\u0915\u093E\u0932\u093E \u0917\u092F\u093E \u092E\u0942\u0932\u094D\u092F \u092C\u093E\u091C\u093E\u0930 \u0938\u0947 \u0925\u094B\u0921\u093C\u093E \u091C\u094D\u092F\u093E\u0926\u093E \u0939\u0948, \u0924\u094B \u0905\u092A\u0928\u0940 \u0916\u0942\u092C\u0940 (\u091C\u0948\u0938\u0947 \u0936\u0941\u0926\u094D\u0927\u0924\u093E, \u0939\u093E\u0925 \u0915\u0940 \u0915\u0922\u093C\u093E\u0908, \u0924\u093E\u091C\u093E \u092E\u0938\u093E\u0932\u0947) \u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u094B \u0938\u092E\u091D\u093E\u090F\u0902\u0964 \u0915\u092D\u0940 \u092D\u0940 \u0917\u0941\u0923\u0935\u0924\u094D\u0924\u093E \u0938\u0947 \u0938\u092E\u091D\u094C\u0924\u093E \u0915\u0930\u0915\u0947 \u0926\u093E\u092E \u092E\u0924 \u0918\u091F\u093E\u0907\u090F\u0964",
                tip: "\u0938\u0938\u094D\u0924\u093E \u092C\u0947\u091A\u0928\u0947 \u0938\u0947 \u0917\u094D\u0930\u093E\u0939\u0915 \u092C\u0922\u093C\u0924\u0947 \u0939\u0948\u0902 \u092A\u0930 \u0935\u094D\u092F\u093E\u092A\u093E\u0930 \u092C\u0902\u0926 \u0939\u094B \u091C\u093E\u0924\u093E \u0939\u0948; \u0905\u091A\u094D\u091B\u093E \u092C\u0947\u091A\u0928\u0947 \u0938\u0947 \u0917\u094D\u0930\u093E\u0939\u0915 \u092C\u093E\u0930-\u092C\u093E\u0930 \u0906\u0924\u0947 \u0939\u0948\u0902\u0964"
              }
            ],
            practicalActivity: {
              title: "\u0938\u0916\u0940\u092C\u093F\u091C \u092A\u094D\u0930\u0949\u092B\u093F\u091F \u0915\u0948\u0932\u0915\u0941\u0932\u0947\u091F\u0930 \u0906\u091C\u093C\u092E\u093E\u090F\u0902:",
              instructions: [
                '\u090A\u092A\u0930 \u0928\u0947\u0935\u093F\u0917\u0947\u0936\u0928 \u092E\u0947\u0902 "\u092C\u093F\u091C\u0928\u0947\u0938 \u091F\u0942\u0932\u094D\u0938" \u092A\u0930 \u091C\u093E\u090F\u0902\u0964',
                "Profit Calculator \u0916\u094B\u0932\u0947\u0902\u0964",
                "\u0905\u092A\u0928\u0947 \u0909\u0924\u094D\u092A\u093E\u0926 \u0915\u0940 \u0932\u093E\u0917\u0924 \u0914\u0930 \u092C\u093F\u0915\u094D\u0930\u0940 \u092E\u0942\u0932\u094D\u092F \u0921\u093E\u0932\u0915\u0930 \u0924\u0941\u0930\u0902\u0924 \u0926\u0947\u0916\u0947\u0902 \u0915\u093F \u0906\u092A\u0915\u094B \u0915\u093F\u0924\u0928\u093E % \u092E\u0941\u0928\u093E\u092B\u093E \u0939\u094B \u0930\u0939\u093E \u0939\u0948!"
              ]
            },
            keyTakeaways: [
              "\u092C\u093F\u0915\u094D\u0930\u0940 \u092E\u0942\u0932\u094D\u092F = \u0915\u0941\u0932 \u0932\u093E\u0917\u0924 + \u0932\u0915\u094D\u0937\u093F\u0924 \u092E\u0941\u0928\u093E\u092B\u093E\u0964",
              "\u0917\u0941\u0923\u0935\u0924\u094D\u0924\u093E \u0914\u0930 \u0935\u093F\u0936\u094D\u0935\u0938\u0928\u0940\u092F\u0924\u093E \u0915\u0947 \u0906\u0927\u093E\u0930 \u092A\u0930 \u0926\u093E\u092E \u0924\u092F \u0915\u0930\u0947\u0902, \u0915\u0947\u0935\u0932 \u092E\u091C\u092C\u0942\u0930\u0940 \u092E\u0947\u0902 \u0928\u0939\u0940\u0902\u0964",
              "\u0928\u093F\u092F\u092E\u093F\u0924 \u0930\u0942\u092A \u0938\u0947 \u0905\u092A\u0928\u0947 \u092E\u0941\u0928\u093E\u092B\u0947 \u0915\u093E 20% \u0928\u090F \u0938\u093E\u092E\u093E\u0928 \u092F\u093E \u092C\u091A\u0924 \u092E\u0947\u0902 \u0932\u0917\u093E\u090F\u0902\u0964"
            ]
          },
          en: {
            introduction: "Bring every element together into a transparent formula that wins customer trust while fueling monthly savings and reinvestment.",
            storyExample: {
              character: "Kamla Bahen (Snacks & Papad)",
              title: "Kamla\u2019s 100-Pack Success",
              story: "Kamla produced 100 packs of organic papad. Raw lentils: \u20B91,200. Spices & seal bags: \u20B9300. Artisan labor: \u20B9500. Total Cost = \u20B92,000 (\u20B920/pack). She added a 35% margin (\u20B97) and retailed at \u20B927. After 100 packs, she cleared \u20B9700 net profit to reinvest into a mechanical sealer!"
            },
            sections: [
              {
                heading: "The Core Formula",
                body: "Total Cost = Raw Materials + Labor + Overheads.\nSelling Price = Total Cost + (Total Cost \xD7 Desired Margin % \xF7 100).",
                tip: "Aim for 30% to 45% margin on handcrafted or artisanal foods."
              },
              {
                heading: "Comparing Against Market Rates",
                body: "If your price is slightly higher than mass-produced factory items, articulate your quality advantage: pure ingredients, customized stitching, fresh preparation.",
                tip: "Competing solely on being the cheapest leads to insolvency. Compete on trust."
              }
            ],
            practicalActivity: {
              title: "Test with the SakhiBiz Profit Calculator:",
              instructions: [
                'Navigate to the "Business Toolkit" tab in the header.',
                "Open the Profit Calculator.",
                "Enter unit cost, desired price, and quantity to see exact margins in seconds!"
              ]
            },
            keyTakeaways: [
              "Selling Price = Total Cost + Realistic Margin.",
              "Highlight authentic handmade value rather than discounting frantically.",
              "Reinvest a portion of monthly profits back into productive tools."
            ]
          }
        }
      }
    ],
    quiz: {
      id: "quiz-cost-pricing-profit",
      courseId: "course-cost-pricing-profit",
      title: {
        hi: "\u092E\u0942\u0932\u094D\u092F \u0928\u093F\u0930\u094D\u0927\u093E\u0930\u0923 \u090F\u0935\u0902 \u092E\u0941\u0928\u093E\u092B\u093E \u091F\u0947\u0938\u094D\u091F",
        en: "Pricing & Profit Mastery Quiz"
      },
      passingScorePercent: 75,
      questions: [
        {
          id: "q1",
          question: {
            hi: "\u092F\u0926\u093F \u090F\u0915 \u0915\u0941\u0930\u094D\u0924\u0940 \u092C\u0928\u093E\u0928\u0947 \u092E\u0947\u0902 \u20B9250 \u0915\u093E \u0915\u092A\u0921\u093C\u093E, \u20B930 \u0915\u0940 \u0938\u093F\u0932\u093E\u0908 \u0938\u093E\u092E\u0917\u094D\u0930\u0940 \u0914\u0930 \u20B970 \u0906\u092A\u0915\u0940 \u0916\u0941\u0926 \u0915\u0940 \u092E\u0947\u0939\u0928\u0924 \u0932\u0917\u0924\u0940 \u0939\u0948, \u0924\u094B \u0915\u0941\u0930\u094D\u0924\u0940 \u0915\u0940 \u0915\u0941\u0932 \u0932\u093E\u0917\u0924 \u0915\u094D\u092F\u093E \u0939\u094B\u0917\u0940?",
            en: "If making a kurti requires \u20B9250 cloth, \u20B930 notions/packaging, and \u20B970 for your labor, what is the Total Cost?"
          },
          options: {
            hi: ["\u20B9250 (\u0938\u093F\u0930\u094D\u092B \u0915\u092A\u0921\u093C\u093E)", "\u20B9280 (\u0915\u092A\u0921\u093C\u093E \u0914\u0930 \u0938\u093E\u092E\u0917\u094D\u0930\u0940)", "\u20B9350 (\u0915\u092A\u0921\u093C\u093E + \u0938\u093E\u092E\u0917\u094D\u0930\u0940 + \u0936\u094D\u0930\u092E \u0932\u093E\u0917\u0924)", "\u20B9500"],
            en: ["\u20B9250 (cloth only)", "\u20B9280 (cloth & materials)", "\u20B9350 (cloth + materials + labor)", "\u20B9500"]
          },
          correctOptionIndex: 2,
          explanation: {
            hi: "\u0938\u0939\u0940 \u0909\u0924\u094D\u0924\u0930 \u20B9350 \u0939\u0948! \u0915\u0941\u0932 \u0932\u093E\u0917\u0924 \u092E\u0947\u0902 \u0915\u091A\u094D\u091A\u093E \u092E\u093E\u0932 (\u20B9250), \u0938\u093E\u092E\u0917\u094D\u0930\u0940 (\u20B930) \u0914\u0930 \u0906\u092A\u0915\u0940 \u0916\u0941\u0926 \u0915\u0940 \u092E\u0947\u0939\u0928\u0924 (\u20B970) \u0924\u0940\u0928\u094B\u0902 \u0915\u094B \u091C\u094B\u0921\u093C\u0928\u093E \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948\u0964",
            en: "Correct is \u20B9350! Total cost must combine direct materials (\u20B9250), accessories (\u20B930), and your personal labor (\u20B970)."
          }
        },
        {
          id: "q2",
          question: {
            hi: "\u092E\u0939\u093F\u0932\u093E \u0909\u0926\u094D\u092F\u092E\u093F\u092F\u094B\u0902 \u0926\u094D\u0935\u093E\u0930\u093E \u0915\u0940 \u091C\u093E\u0928\u0947 \u0935\u093E\u0932\u0940 \u0938\u092C\u0938\u0947 \u0906\u092E \u0935\u093F\u0924\u094D\u0924\u0940\u092F \u0917\u0932\u0924\u0940 \u0915\u094D\u092F\u093E \u0939\u0948?",
            en: "What is the most frequent pricing mistake made by home-based micro-entrepreneurs?"
          },
          options: {
            hi: [
              "\u0905\u092A\u0928\u0940 \u0916\u0941\u0926 \u0915\u0940 \u092E\u0947\u0939\u0928\u0924 (\u0938\u092E\u092F) \u0915\u094B \u092E\u0941\u092B\u093C\u094D\u0924 \u092E\u093E\u0928 \u0932\u0947\u0928\u093E \u0914\u0930 \u0932\u093E\u0917\u0924 \u092E\u0947\u0902 \u0928 \u091C\u094B\u0921\u093C\u0928\u093E",
              "\u0905\u091A\u094D\u091B\u0940 \u0917\u0941\u0923\u0935\u0924\u094D\u0924\u093E \u0915\u093E \u0915\u091A\u094D\u091A\u093E \u092E\u093E\u0932 \u0916\u0930\u0940\u0926\u0928\u093E",
              "\u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0915\u094B \u092A\u0915\u094D\u0915\u093E \u092C\u093F\u0932 \u092F\u093E \u0939\u093F\u0938\u093E\u092C \u0926\u0947\u0928\u093E",
              "\u0926\u0941\u0915\u093E\u0928 \u092A\u0930 \u0938\u093E\u092B\u093C-\u0938\u092B\u093C\u093E\u0908 \u0930\u0916\u0928\u093E"
            ],
            en: [
              "Treating their own time as zero cost and omitting personal labor",
              "Purchasing top quality raw materials",
              "Maintaining a transparent ledger",
              "Keeping the workspace organized"
            ]
          },
          correctOptionIndex: 0,
          explanation: {
            hi: "\u0905\u092A\u0928\u0940 \u092E\u0947\u0939\u0928\u0924 \u0915\u093E \u092E\u0942\u0932\u094D\u092F \u0928 \u091C\u094B\u0921\u093C\u0928\u093E \u0938\u092C\u0938\u0947 \u092C\u0921\u093C\u0940 \u092D\u0942\u0932 \u0939\u0948\u0964 \u0907\u0938\u0938\u0947 \u0932\u0917\u0924\u093E \u0939\u0948 \u0915\u093F \u092E\u0941\u0928\u093E\u092B\u093E \u0939\u094B \u0930\u0939\u093E \u0939\u0948, \u091C\u092C\u0915\u093F \u0905\u0938\u0932 \u092E\u0947\u0902 \u0906\u092A \u092E\u0941\u092B\u093C\u094D\u0924 \u092E\u0947\u0902 \u0915\u093E\u092E \u0915\u0930 \u0930\u0939\u0940 \u0939\u094B\u0924\u0940 \u0939\u0948\u0902\u0964",
            en: "Omitting personal labor creates an illusion of profit when in reality you are working for zero wage."
          }
        },
        {
          id: "q3",
          question: {
            hi: "\u092F\u0926\u093F \u0915\u093F\u0938\u0940 \u0935\u0938\u094D\u0924\u0941 \u0915\u0940 \u0915\u0941\u0932 \u0932\u093E\u0917\u0924 \u20B9100 \u0939\u0948 \u0914\u0930 \u0906\u092A 30% \u092E\u0941\u0928\u093E\u092B\u093E \u0915\u092E\u093E\u0928\u093E \u091A\u093E\u0939\u0924\u0940 \u0939\u0948\u0902, \u0924\u094B \u0938\u0939\u0940 \u092C\u093F\u0915\u094D\u0930\u0940 \u092E\u0942\u0932\u094D\u092F \u0915\u094D\u092F\u093E \u0939\u094B\u0917\u093E?",
            en: "If the total cost of an item is \u20B9100 and you target a 30% profit margin, what should the selling price be?"
          },
          options: {
            hi: ["\u20B9100", "\u20B9130", "\u20B9110", "\u20B970"],
            en: ["\u20B9100", "\u20B9130", "\u20B9110", "\u20B970"]
          },
          correctOptionIndex: 1,
          explanation: {
            hi: "\u0938\u0939\u0940 \u0909\u0924\u094D\u0924\u0930 \u20B9130 \u0939\u0948! \u0915\u0941\u0932 \u0932\u093E\u0917\u0924 (\u20B9100) + 30% \u092E\u0941\u0928\u093E\u092B\u093E (\u20B930) = \u20B9130 \u092C\u093F\u0915\u094D\u0930\u0940 \u092E\u0942\u0932\u094D\u092F\u0964",
            en: "Correct is \u20B9130! Total Cost (\u20B9100) + 30% Profit Margin (\u20B930) = \u20B9130 Selling Price."
          }
        },
        {
          id: "q4",
          question: {
            hi: "\u0905\u092A\u094D\u0930\u0924\u094D\u092F\u0915\u094D\u0937 \u0916\u0930\u094D\u091A (Indirect Costs) \u092E\u0947\u0902 \u0907\u0928\u092E\u0947\u0902 \u0938\u0947 \u0915\u094D\u092F\u093E \u0936\u093E\u092E\u093F\u0932 \u0939\u094B\u0924\u093E \u0939\u0948?",
            en: "Which of the following is considered an Indirect Overhead cost?"
          },
          options: {
            hi: [
              "\u0926\u0941\u0915\u093E\u0928 \u092F\u093E \u0935\u0930\u094D\u0915\u0936\u0949\u092A \u0915\u0940 \u092C\u093F\u091C\u0932\u0940, \u0917\u0948\u0938 \u0914\u0930 \u0906\u0928\u0947-\u091C\u093E\u0928\u0947 \u0915\u093E \u0911\u091F\u094B \u0915\u093F\u0930\u093E\u092F\u093E",
              "\u0938\u0942\u091F \u092E\u0947\u0902 \u0932\u0917\u0928\u0947 \u0935\u093E\u0932\u093E \u092E\u0941\u0916\u094D\u092F \u0915\u092A\u0921\u093C\u093E",
              "\u0906\u091A\u093E\u0930 \u092E\u0947\u0902 \u0921\u0932\u0928\u0947 \u0935\u093E\u0932\u0947 \u092E\u0941\u0916\u094D\u092F \u0906\u092E",
              "\u0915\u0947\u0935\u0932 \u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0915\u094B \u0926\u093F\u092F\u093E \u091C\u093E\u0928\u0947 \u0935\u093E\u0932\u093E \u0921\u093F\u0938\u094D\u0915\u093E\u0909\u0902\u091F"
            ],
            en: [
              "Electricity, gas fuel, and transport/auto fares",
              "The primary dress fabric",
              "Raw mangoes for pickle",
              "Discounts offered to customers"
            ]
          },
          correctOptionIndex: 0,
          explanation: {
            hi: "\u092C\u093F\u091C\u0932\u0940, \u092A\u0948\u0915\u093F\u0902\u0917, \u0917\u0948\u0938 \u0914\u0930 \u0906\u0928\u0947-\u091C\u093E\u0928\u0947 \u0915\u093E \u0915\u093F\u0930\u093E\u092F\u093E \u0905\u092A\u094D\u0930\u0924\u094D\u092F\u0915\u094D\u0937 \u0916\u0930\u094D\u091A \u0939\u0948\u0902 \u091C\u093F\u0928\u094D\u0939\u0947\u0902 \u0939\u0930 \u0909\u0924\u094D\u092A\u093E\u0926 \u092E\u0947\u0902 \u0925\u094B\u0921\u093C\u093E-\u0925\u094B\u0921\u093C\u093E \u091C\u094B\u0921\u093C\u0928\u093E \u091A\u093E\u0939\u093F\u090F\u0964",
            en: "Utilities, gas, transport, and packaging are indirect overheads that must be allocated per unit."
          }
        }
      ]
    }
  },
  {
    id: "course-digital-payments-safety",
    category: "digital_payments",
    title: {
      hi: "\u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0921\u093F\u091C\u093F\u091F\u0932 \u092D\u0941\u0917\u0924\u093E\u0928 \u0914\u0930 \u0911\u0928\u0932\u093E\u0907\u0928 \u0927\u094B\u0916\u093E\u0927\u0921\u093C\u0940 \u0938\u0947 \u092C\u091A\u093E\u0935",
      en: "Safe Digital Payments & Scam Prevention"
    },
    shortDescription: {
      hi: "\u0938\u0940\u0916\u0947\u0902 \u0915\u093F UPI \u0914\u0930 QR \u0915\u094B\u0921 \u0938\u0947 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u092A\u0948\u0938\u0947 \u0915\u0948\u0938\u0947 \u0932\u0947\u0902 \u0914\u0930 \u092B\u0930\u094D\u091C\u0940 \u0938\u094D\u0915\u094D\u0930\u0940\u0928\u0936\u0949\u091F \u0935 OTP \u0918\u094B\u091F\u093E\u0932\u094B\u0902 \u0938\u0947 \u0905\u092A\u0928\u0940 \u0915\u092E\u093E\u0908 \u0915\u0948\u0938\u0947 \u092C\u091A\u093E\u090F\u0902\u0964",
      en: "Learn how to accept UPI QR payments safely and protect your hard-earned money from scam calls and fake screenshots."
    },
    fullDescription: {
      hi: "\u0921\u093F\u091C\u093F\u091F\u0932 \u092A\u0947\u092E\u0947\u0902\u091F \u0928\u0947 \u092E\u0939\u093F\u0932\u093E \u0909\u0926\u094D\u092F\u092E\u093F\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u0935\u094D\u092F\u093E\u092A\u093E\u0930 \u092C\u0939\u0941\u0924 \u0906\u0938\u093E\u0928 \u0915\u0930 \u0926\u093F\u092F\u093E \u0939\u0948, \u0932\u0947\u0915\u093F\u0928 \u0938\u093E\u0907\u092C\u0930 \u0920\u0917 \u0928\u090F-\u0928\u090F \u0924\u0930\u0940\u0915\u094B\u0902 \u0938\u0947 \u092E\u0939\u093F\u0932\u093E\u0913\u0902 \u0915\u094B \u0928\u093F\u0936\u093E\u0928\u093E \u092C\u0928\u093E\u0924\u0947 \u0939\u0948\u0902\u0964 \u092F\u0939 \u0915\u094B\u0930\u094D\u0938 \u0906\u092A\u0915\u094B \u0938\u093F\u0916\u093E\u090F\u0917\u093E \u0915\u093F UPI PIN \u0915\u093E \u0938\u0939\u0940 \u0928\u093F\u092F\u092E \u0915\u094D\u092F\u093E \u0939\u0948, \u0938\u093E\u0909\u0902\u0921\u092C\u0949\u0915\u094D\u0938 \u092F\u093E \u092C\u0948\u0902\u0915 SMS \u0938\u0947 \u092A\u0948\u0938\u0947 \u0915\u0940 \u092A\u0941\u0937\u094D\u091F\u093F \u0915\u0948\u0938\u0947 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0915\u093F\u0938\u0940 \u092D\u0940 \u0905\u0928\u091C\u093E\u0928 \u0932\u093F\u0902\u0915 \u092A\u0930 \u0915\u094D\u0932\u093F\u0915 \u0915\u0930\u0928\u0947 \u0938\u0947 \u0915\u0948\u0938\u0947 \u092C\u091A\u0947\u0902\u0964",
      en: "Digital payments empower grassroots businesses with instant settlement, but cyber frauds target uninformed merchants. This course provides step-by-step vigilance training on UPI security, soundboxes, and fake payment verification."
    },
    level: "Beginner",
    estimatedHours: 2,
    languageAvailable: ["hi", "en"],
    thumbnail: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=800&q=80",
    badgeTitle: {
      hi: "\u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0921\u093F\u091C\u093F\u091F\u0932 \u0938\u0916\u0940 (Digital Safety Champion)",
      en: "Digital Safety Champion"
    },
    rating: 5,
    reviewCount: 418,
    lessons: [
      {
        id: "lesson-upi-golden-rule",
        courseId: "course-digital-payments-safety",
        order: 1,
        durationMinutes: 15,
        title: {
          hi: "1. \u0921\u093F\u091C\u093F\u091F\u0932 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0915\u093E \u0938\u094D\u0935\u0930\u094D\u0923\u093F\u092E \u0928\u093F\u092F\u092E: UPI PIN \u0915\u0940 \u0938\u091A\u094D\u091A\u093E\u0908",
          en: "1. The Golden Rule of Digital Safety: UPI PIN Truth"
        },
        summary: {
          hi: "\u092F\u0939 \u090F\u0915 \u092C\u093E\u0924 \u091C\u0940\u0935\u0928 \u092D\u0930 \u092F\u093E\u0926 \u0930\u0916\u0947\u0902: \u092A\u0948\u0938\u0947 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0915\u0930\u0928\u0947 (Receive) \u0915\u0947 \u0932\u093F\u090F \u0915\u092D\u0940 \u092D\u0940 UPI PIN \u0921\u093E\u0932\u0928\u0947 \u0915\u0940 \u0906\u0935\u0936\u094D\u092F\u0915\u0924\u093E \u0928\u0939\u0940\u0902 \u0939\u094B\u0924\u0940!",
          en: "Memorize this core truth: You NEVER need to enter a UPI PIN to RECEIVE money."
        },
        content: {
          hi: {
            introduction: "\u092D\u093E\u0930\u0924 \u0938\u0930\u0915\u093E\u0930 \u0914\u0930 \u092D\u093E\u0930\u0924\u0940\u092F \u0930\u093F\u091C\u0930\u094D\u0935 \u092C\u0948\u0902\u0915 (RBI) \u0915\u093E \u0938\u092C\u0938\u0947 \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u0928\u093F\u092F\u092E: UPI PIN \u0938\u093F\u0930\u094D\u092B \u0906\u092A\u0915\u0947 \u092C\u0948\u0902\u0915 \u0938\u0947 \u092A\u0948\u0938\u0947 \u0915\u093E\u091F\u0928\u0947 \u0915\u0940 \u091A\u093E\u092C\u0940 \u0939\u0948, \u092A\u0948\u0938\u0947 \u092A\u093E\u0928\u0947 \u0915\u0940 \u0928\u0939\u0940\u0902!",
            storyExample: {
              character: "\u0936\u093E\u0902\u0924\u093F \u092C\u093E\u0908 (\u0915\u093F\u0930\u093E\u0928\u093E \u0926\u0941\u0915\u093E\u0928)",
              title: "\u0936\u093E\u0902\u0924\u093F \u092C\u093E\u0908 \u0928\u0947 \u0915\u0948\u0938\u0947 \u092C\u091A\u093E\u092F\u093E \u0905\u092A\u0928\u093E \u0916\u093E\u0924\u093E",
              story: '\u090F\u0915 \u0905\u091C\u094D\u091E\u093E\u0924 \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0928\u0947 \u0936\u093E\u0902\u0924\u093F \u092C\u093E\u0908 \u0915\u094B \u092B\u094B\u0928 \u0915\u093F\u092F\u093E \u0915\u093F "\u092E\u0948\u0902\u0928\u0947 \u0906\u092A\u0915\u0940 \u0926\u0941\u0915\u093E\u0928 \u0938\u0947 5 \u0915\u093F\u0932\u094B \u0906\u091F\u093E \u0932\u0947\u0928\u093E \u0939\u0948, \u092E\u0948\u0902 \u20B9250 \u090F\u0921\u0935\u093E\u0902\u0938 \u092D\u0947\u091C \u0930\u0939\u093E \u0939\u0942\u0901, \u0906\u092A \u0907\u0938 \u0932\u093F\u0902\u0915 \u092A\u0930 \u0915\u094D\u0932\u093F\u0915 \u0915\u0930\u0915\u0947 \u0905\u092A\u0928\u093E UPI \u092A\u093F\u0928 \u0921\u093E\u0932\u0947\u0902\u0964" \u0936\u093E\u0902\u0924\u093F \u092C\u093E\u0908 \u0928\u0947 \u0938\u0916\u0940\u092C\u093F\u091C \u092E\u0947\u0902 \u0938\u0940\u0916\u093E \u0925\u093E \u0915\u093F \u092A\u0948\u0938\u0947 \u0932\u0947\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u092A\u093F\u0928 \u0928\u0939\u0940\u0902 \u0921\u093E\u0932\u0924\u0947\u0964 \u0909\u0928\u094D\u0939\u094B\u0902\u0928\u0947 \u0924\u0941\u0930\u0902\u0924 \u092B\u094B\u0928 \u0915\u093E\u091F \u0926\u093F\u092F\u093E \u0914\u0930 \u0905\u092A\u0928\u0940 \u0917\u093E\u0922\u093C\u0940 \u0915\u092E\u093E\u0908 \u092C\u091A\u093E \u0932\u0940!'
            },
            sections: [
              {
                heading: "\u0938\u094D\u0935\u0930\u094D\u0923\u093F\u092E \u0928\u093F\u092F\u092E (The Golden Rule)",
                body: "\u091C\u092C \u0906\u092A \u0915\u093F\u0938\u0940 \u0915\u094B \u092A\u0948\u0938\u0947 \u092D\u0947\u091C\u0924\u0947 \u0939\u0948\u0902 (Send), \u0924\u092D\u0940 UPI PIN \u0921\u093E\u0932\u0928\u093E \u0939\u094B\u0924\u093E \u0939\u0948\u0964 \u091C\u092C \u0915\u094B\u0908 \u0906\u092A\u0915\u094B \u092A\u0948\u0938\u0947 \u092D\u0947\u091C\u0924\u093E \u0939\u0948 (Receive), \u0924\u094B \u092A\u0948\u0938\u0947 \u0938\u0940\u0927\u0947 \u0906\u092A\u0915\u0947 \u0916\u093E\u0924\u0947 \u092E\u0947\u0902 \u0906\u0924\u0947 \u0939\u0948\u0902 \u2014 \u0906\u092A\u0915\u094B \u0915\u094B\u0908 \u092C\u091F\u0928 \u0928\u0939\u0940\u0902 \u0926\u092C\u093E\u0928\u093E \u0914\u0930 \u0915\u094B\u0908 PIN \u0928\u0939\u0940\u0902 \u0921\u093E\u0932\u0928\u093E!",
                tip: '\u092F\u0926\u093F \u0915\u094B\u0908 \u0915\u0939\u0947 \u0915\u093F "PIN \u0921\u093E\u0932\u094B \u0924\u092D\u0940 \u092A\u0948\u0938\u0947 \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0939\u094B\u0902\u0917\u0947", \u0924\u094B \u0935\u0939 100% \u0927\u094B\u0916\u0947\u092C\u093E\u091C (Scammer) \u0939\u0948\u0964'
              },
              {
                heading: "\u0926\u0941\u0915\u093E\u0928 \u092A\u0930 QR \u0915\u094B\u0921 \u0915\u093E \u0938\u0939\u0940 \u0907\u0938\u094D\u0924\u0947\u092E\u093E\u0932",
                body: "\u0926\u0941\u0915\u093E\u0928 \u092F\u093E \u0915\u093E\u0909\u0902\u091F\u0930 \u092A\u0930 \u0905\u092A\u0928\u093E \u0938\u094D\u0925\u093E\u092F\u0940 UPI QR \u0915\u094B\u0921 \u0938\u094D\u091F\u0948\u0902\u0921 \u0932\u0917\u093E\u090F\u0902\u0964 \u0917\u094D\u0930\u093E\u0939\u0915 \u0938\u0947 \u0915\u0939\u0947\u0902 \u0915\u093F \u0935\u0939 \u0907\u0938\u0947 \u0938\u094D\u0915\u0948\u0928 \u0915\u0930\u0915\u0947 \u092A\u0947\u092E\u0947\u0902\u091F \u0915\u0930\u0947\u0964 \u0917\u094D\u0930\u093E\u0939\u0915 \u0926\u094D\u0935\u093E\u0930\u093E \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0930\u0928\u0947 \u0915\u0947 \u092C\u093E\u0926 \u0905\u092A\u0928\u0947 \u092B\u094B\u0928 \u092A\u0930 \u092C\u0948\u0902\u0915 \u0915\u093E SMS \u092F\u093E \u0938\u093E\u0909\u0902\u0921\u092C\u0949\u0915\u094D\u0938 \u0915\u0940 \u0906\u0935\u093E\u091C \u0938\u0941\u0928\u0947\u0902\u0964",
                tip: "\u0915\u092D\u0940 \u092D\u0940 \u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u0947 \u092B\u094B\u0928 \u092E\u0947\u0902 \u0905\u092A\u0928\u093E UPI PIN \u0928 \u0921\u093E\u0932\u0947\u0902\u0964"
              }
            ],
            practicalActivity: {
              title: "\u0906\u091C \u0939\u0940 \u092F\u0939 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902:",
              instructions: [
                "\u0905\u092A\u0928\u0947 \u092A\u0930\u093F\u0935\u093E\u0930 \u0914\u0930 \u0938\u0939\u093E\u092F\u0915\u094B\u0902 \u0915\u094B \u092F\u0939 \u0938\u094D\u0935\u0930\u094D\u0923\u093F\u092E \u0928\u093F\u092F\u092E \u091C\u093C\u094B\u0930 \u0938\u0947 \u092A\u0922\u093C\u0915\u0930 \u0938\u0941\u0928\u093E\u090F\u0902\u0964",
                "\u0905\u092A\u0928\u0947 UPI \u0910\u092A (\u091C\u0948\u0938\u0947 PhonePe, Google Pay \u092F\u093E Paytm) \u0915\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0915\u093F\u0938\u0940 \u0921\u093E\u092F\u0930\u0940 \u092E\u0947\u0902 \u0916\u0941\u0932\u0947 \u092E\u0947\u0902 \u0928 \u0932\u093F\u0916\u0947\u0902\u0964",
                "\u0938\u0941\u0928\u093F\u0936\u094D\u091A\u093F\u0924 \u0915\u0930\u0947\u0902 \u0915\u093F \u0906\u092A\u0915\u093E \u092C\u0948\u0902\u0915 \u0938\u0947 \u091C\u0941\u0921\u093C\u093E \u092E\u094B\u092C\u093E\u0907\u0932 \u0928\u0902\u092C\u0930 \u0906\u092A\u0915\u0947 \u0939\u0940 \u092A\u093E\u0938 \u0930\u0939\u0947\u0964"
              ]
            },
            keyTakeaways: [
              "\u092A\u0948\u0938\u0947 \u0932\u0947\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F UPI PIN \u0915\u092D\u0940 \u0928\u0939\u0940\u0902 \u0921\u093E\u0932\u093E \u091C\u093E\u0924\u093E\u0964",
              "\u0905\u0928\u091C\u093E\u0928 \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0926\u094D\u0935\u093E\u0930\u093E \u092D\u0947\u091C\u0947 \u0917\u090F \u0915\u093F\u0938\u0940 \u092D\u0940 \u0932\u093F\u0902\u0915 \u092A\u0930 \u0915\u092D\u0940 \u0915\u094D\u0932\u093F\u0915 \u0928 \u0915\u0930\u0947\u0902\u0964",
              "\u0936\u0915 \u0939\u094B\u0928\u0947 \u092A\u0930 \u0924\u0941\u0930\u0902\u0924 \u0938\u094D\u0925\u093E\u0928\u0940\u092F \u092C\u0948\u0902\u0915 \u0936\u093E\u0916\u093E \u092F\u093E 1930 (\u0938\u093E\u0907\u092C\u0930 \u0939\u0947\u0932\u094D\u092A\u0932\u093E\u0907\u0928) \u092A\u0930 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964"
            ]
          },
          en: {
            introduction: "The Reserve Bank of India\u2019s fundamental directive: A UPI PIN is the digital key to deduct money from your account, never to receive money into it.",
            storyExample: {
              character: "Shanti Bai (Grocery & Kirana)",
              title: "How Shanti Thwarted a Fraudster",
              story: 'A caller claimed he wanted to order 5 bags of grain and sent a payment link, telling Shanti: "Click this link and enter your UPI PIN to approve the \u20B91,000 credit." Because Shanti completed SakhiBiz training, she knew receiving money requires zero PIN. She hung up immediately and saved her savings!'
            },
            sections: [
              {
                heading: "The Irreversible Rule",
                body: "UPI PIN is used ONLY to SEND money. When money is being paid to you, funds deposit directly into your linked bank account without you typing any PIN or passcode.",
                tip: "Anyone asking you to enter a PIN to receive a payment or reward is an active scammer."
              },
              {
                heading: "Merchant QR Code Hygiene",
                body: "Display your official printed QR code on your craft stall or shop counter. Ensure your linked soundbox announces payments aloud or check your real bank SMS notification.",
                tip: "Never handle a customer\u2019s phone to type your credentials."
              }
            ],
            practicalActivity: {
              title: "Family & Staff Safety Drill:",
              instructions: [
                "Share the golden rule with any family members or assistants who manage your sales desk.",
                "Ensure your UPI transaction PIN is known only to you.",
                "Save the national cybercrime helpline number (1930) in your contacts."
              ]
            },
            keyTakeaways: [
              "Zero PIN is required to receive incoming funds.",
              "Never tap on unsolicited payment approval links.",
              "Verify transactions via your own device, not the buyer\u2019s screen."
            ]
          }
        }
      },
      {
        id: "lesson-fake-screenshots-alerts",
        courseId: "course-digital-payments-safety",
        order: 2,
        durationMinutes: 16,
        title: {
          hi: "2. \u092B\u0930\u094D\u091C\u0940 \u0938\u094D\u0915\u094D\u0930\u0940\u0928\u0936\u0949\u091F \u0914\u0930 \u0928\u0915\u0932\u0940 SMS \u0938\u0947 \u0915\u0948\u0938\u0947 \u092C\u091A\u0947\u0902",
          en: "2. Spotting Fake Screenshots and Spoofed SMS Alerts"
        },
        summary: {
          hi: '\u0920\u0917 \u092B\u0930\u094D\u091C\u0940 \u0910\u092A \u0938\u0947 \u0939\u0930\u093E \u091F\u093F\u0915 \u0935\u093E\u0932\u093E "Payment Successful" \u0938\u094D\u0915\u094D\u0930\u0940\u0928\u0936\u0949\u091F \u0926\u093F\u0916\u093E\u0924\u0947 \u0939\u0948\u0902\u0964 \u091C\u093E\u0928\u093F\u090F \u0905\u0938\u0932\u0940 \u092A\u0941\u0937\u094D\u091F\u093F \u0915\u0948\u0938\u0947 \u0915\u0930\u0947\u0902\u0964',
          en: "Scammers show counterfeit payment apps with fake green checkmarks. Learn real-time verification."
        },
        content: {
          hi: {
            introduction: '\u0906\u091C\u0915\u0932 \u0907\u0902\u091F\u0930\u0928\u0947\u091F \u092A\u0930 \u0910\u0938\u0947 \u092B\u0930\u094D\u091C\u0940 \u0910\u092A\u094D\u0938 \u0906 \u0917\u090F \u0939\u0948\u0902 \u091C\u094B \u0928\u0915\u0932\u0940 "\u0938\u092B\u0932 \u092D\u0941\u0917\u0924\u093E\u0928" (Payment Successful) \u0938\u094D\u0915\u094D\u0930\u0940\u0928 \u0926\u093F\u0916\u093E\u0924\u0947 \u0939\u0948\u0902\u0964 \u091C\u092C \u0924\u0915 \u0906\u092A\u0915\u0947 \u0905\u092A\u0928\u0947 \u092B\u094B\u0928 \u092A\u0930 \u092C\u0948\u0902\u0915 \u0915\u0940 \u092A\u0941\u0937\u094D\u091F\u093F \u0928 \u0906\u090F, \u0938\u093E\u092E\u093E\u0928 \u0915\u092D\u0940 \u0928 \u0938\u094C\u0902\u092A\u0947\u0902\u0964',
            storyExample: {
              character: "\u0905\u0928\u093F\u0924\u093E \u0926\u0940\u0926\u0940 (\u092C\u0941\u091F\u0940\u0915 \u0935 \u091A\u0942\u0921\u093C\u0940 \u0935\u093F\u0915\u094D\u0930\u0947\u0924\u093E)",
              title: "\u0905\u0928\u093F\u0924\u093E \u0926\u0940\u0926\u0940 \u0915\u0940 \u0938\u0924\u0930\u094D\u0915\u0924\u093E",
              story: '\u090F\u0915 \u0917\u094D\u0930\u093E\u0939\u0915 \u0928\u0947 \u20B9800 \u0915\u0947 \u0915\u0902\u0917\u0928 \u0932\u093F\u090F \u0914\u0930 \u0905\u092A\u0928\u0947 \u092B\u094B\u0928 \u092A\u0930 \u0939\u0930\u093E \u0938\u094D\u0915\u094D\u0930\u0940\u0928\u0936\u0949\u091F \u0926\u093F\u0916\u093E\u092F\u093E \u0915\u093F "\u0926\u0940\u0926\u0940 \u092A\u0948\u0938\u0947 \u091A\u0932\u0947 \u0917\u090F, \u091C\u0932\u094D\u0926\u0940 \u092E\u0947\u0902 \u0939\u0942\u0901 \u091C\u093E \u0930\u0939\u093E \u0939\u0942\u0901\u0964" \u0905\u0928\u093F\u0924\u093E \u0928\u0947 \u0915\u0939\u093E, "\u092D\u0948\u092F\u093E, 10 \u0938\u0947\u0915\u0902\u0921 \u0930\u0941\u0915\u093F\u090F, \u092E\u0947\u0930\u0947 \u092B\u094B\u0928 \u092E\u0947\u0902 \u092E\u0948\u0938\u0947\u091C \u0906\u0928\u0947 \u0926\u0940\u091C\u093F\u090F\u0964" 30 \u0938\u0947\u0915\u0902\u0921 \u092C\u093E\u0926 \u092D\u0940 \u092E\u0948\u0938\u0947\u091C \u0928\u0939\u0940\u0902 \u0906\u092F\u093E\u0964 \u091C\u092C \u0926\u094B\u092C\u093E\u0930\u093E \u091A\u0947\u0915 \u0915\u093F\u092F\u093E \u0924\u094B \u092A\u0924\u093E \u091A\u0932\u093E \u0935\u0939 \u0938\u093F\u0930\u094D\u092B \u090F\u0915 \u092B\u094B\u091F\u094B \u0925\u0940! \u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u094B \u0905\u0938\u0932\u0940 \u092A\u0947\u092E\u0947\u0902\u091F \u0915\u0930\u0928\u0940 \u092A\u0921\u093C\u0940\u0964'
            },
            sections: [
              {
                heading: "1. \u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u0947 \u092B\u094B\u0928 \u092A\u0930 \u0915\u092D\u0940 \u092D\u0930\u094B\u0938\u093E \u0928 \u0915\u0930\u0947\u0902",
                body: "\u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u093E \u092B\u094B\u0928 \u0928\u0915\u0932\u0940 \u0939\u094B \u0938\u0915\u0924\u093E \u0939\u0948 \u092F\u093E \u0909\u0938\u092E\u0947\u0902 \u090F\u0921\u093F\u091F \u0915\u093F\u092F\u093E \u0939\u0941\u0906 \u092B\u094B\u091F\u094B \u0939\u094B \u0938\u0915\u0924\u093E \u0939\u0948\u0964 \u0939\u092E\u0947\u0936\u093E \u092A\u0941\u0937\u094D\u091F\u093F \u0905\u092A\u0928\u0947 \u0909\u092A\u0915\u0930\u0923 (\u0906\u092A\u0915\u0947 \u092B\u094B\u0928 \u0915\u093E SMS, \u0906\u092A\u0915\u093E UPI \u0910\u092A \u092F\u093E \u0938\u093E\u0909\u0902\u0921\u092C\u0949\u0915\u094D\u0938) \u092A\u0930 \u0915\u0930\u0947\u0902\u0964",
                tip: "\u091C\u0932\u094D\u0926\u092C\u093E\u091C\u0940 \u0915\u0930\u0928\u0947 \u0935\u093E\u0932\u0947 \u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0938\u0947 \u0935\u093F\u0936\u0947\u0937 \u0930\u0942\u092A \u0938\u0947 \u0938\u093E\u0935\u0927\u093E\u0928 \u0930\u0939\u0947\u0902\u0964"
              },
              {
                heading: "2. \u0938\u093E\u0909\u0902\u0921\u092C\u0949\u0915\u094D\u0938 \u092F\u093E UPI \u0935\u094D\u092F\u093E\u092A\u093E\u0930\u0940 \u0910\u092A \u0915\u093E \u0909\u092A\u092F\u094B\u0917",
                body: '\u092F\u0926\u093F \u0906\u092A\u0915\u0940 \u0926\u0941\u0915\u093E\u0928 \u092A\u0930 \u0930\u094B\u091C\u093C \u0915\u0908 \u0917\u094D\u0930\u093E\u0939\u0915 \u0906\u0924\u0947 \u0939\u0948\u0902, \u0924\u094B \u090F\u0915 \u091B\u094B\u091F\u093E \u0938\u093E\u0909\u0902\u0921\u092C\u0949\u0915\u094D\u0938 (\u091C\u0948\u0938\u0947 Paytm/PhonePe/Google Pay \u0938\u093E\u0909\u0902\u0921\u092C\u0949\u0915\u094D\u0938) \u092C\u0939\u0941\u0924 \u092E\u0926\u0926\u0917\u093E\u0930 \u0939\u094B\u0924\u093E \u0939\u0948\u0964 \u092F\u0939 \u091C\u094B\u0930 \u0938\u0947 \u092C\u094B\u0932\u0915\u0930 \u092C\u0924\u093E\u0924\u093E \u0939\u0948: "\u20B9250 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0939\u0941\u090F"\u0964',
                tip: "\u092F\u0926\u093F \u0938\u093E\u0909\u0902\u0921\u092C\u0949\u0915\u094D\u0938 \u0928\u0939\u0940\u0902 \u0939\u0948, \u0924\u094B \u0905\u092A\u0928\u093E \u092C\u0948\u0902\u0915 \u0910\u092A \u0916\u094B\u0932\u0915\u0930 \u092A\u093E\u0938\u092C\u0941\u0915/\u092C\u0948\u0932\u0947\u0902\u0938 \u0924\u0941\u0930\u0902\u0924 \u0930\u0940\u092B\u094D\u0930\u0947\u0936 \u0915\u0930\u0947\u0902\u0964"
              }
            ],
            practicalActivity: {
              title: "\u0926\u0941\u0915\u093E\u0928 \u0915\u0940 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0928\u0940\u0924\u093F \u092C\u0928\u093E\u090F\u0902:",
              instructions: [
                '\u0915\u093E\u0909\u0902\u091F\u0930 \u092A\u0930 \u090F\u0915 \u0935\u093F\u0928\u092E\u094D\u0930 \u092C\u094B\u0930\u094D\u0921 \u0932\u0917\u093E\u090F\u0902: "\u0915\u0943\u092A\u092F\u093E \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0947 \u092C\u093E\u0926 \u0939\u092E\u093E\u0930\u0947 \u092B\u094B\u0928 \u092A\u0930 \u092A\u0941\u0937\u094D\u091F\u093F \u0939\u094B\u0928\u0947 \u0924\u0915 \u092A\u094D\u0930\u0924\u0940\u0915\u094D\u0937\u093E \u0915\u0930\u0947\u0902\u0964"',
                "\u0905\u092A\u0928\u0947 \u092C\u0948\u0902\u0915 \u0915\u0947 \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 SMS \u0938\u0947\u0902\u0921\u0930 \u0928\u093E\u092E (\u091C\u0948\u0938\u0947 VK-HDFCBK, AXISBK, SBIINB) \u0915\u094B \u092A\u0939\u091A\u093E\u0928\u0928\u093E \u0938\u0940\u0916\u0947\u0902\u0964"
              ]
            },
            keyTakeaways: [
              "\u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u0947 \u092B\u094B\u0928 \u0915\u093E \u0938\u094D\u0915\u094D\u0930\u0940\u0928\u0936\u0949\u091F \u0905\u0938\u0932\u0940 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u093E \u092A\u0915\u094D\u0915\u093E \u0938\u092C\u0942\u0924 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
              "\u092A\u0941\u0937\u094D\u091F\u093F \u0939\u092E\u0947\u0936\u093E \u0905\u092A\u0928\u0947 \u0916\u0941\u0926 \u0915\u0947 \u092B\u094B\u0928 \u092F\u093E \u0938\u093E\u0909\u0902\u0921\u092C\u0949\u0915\u094D\u0938 \u0938\u0947 \u0915\u0930\u0947\u0902\u0964",
              "\u0936\u093E\u0932\u0940\u0928\u0924\u093E \u0914\u0930 \u0926\u0943\u0922\u093C\u0924\u093E \u0915\u0947 \u0938\u093E\u0925 \u0905\u092A\u0928\u0947 \u0935\u094D\u092F\u093E\u092A\u093E\u0930 \u0915\u0947 \u0928\u093F\u092F\u092E\u094B\u0902 \u0915\u093E \u092A\u093E\u0932\u0928 \u0915\u0930\u0947\u0902\u0964"
            ]
          },
          en: {
            introduction: 'Counterfeit Android APKs can simulate fake "Payment Successful" screens with green ticks and sound effects. Goods must only be handed over after your own device confirms settlement.',
            storyExample: {
              character: "Anita Didi (Jewellery & Boutique)",
              title: "Anita\u2019s 10-Second Wait",
              story: 'A customer purchased \u20B9800 bangles, flashed his phone screen showing "Payment Successful", and tried to hurry away. Anita politely asked him to pause for 10 seconds for her phone notification. No credit arrived because his screenshot was fake. Caught, the buyer paid with real cash.'
            },
            sections: [
              {
                heading: "1. Never Trust the Buyer\u2019s Screen Alone",
                body: "Apps can fabricate realistic receipts. The sole authoritative source of truth is your own bank SMS, your merchant notification, or your soundbox.",
                tip: "Be extra alert if a buyer urges you to hurry or creates a rush."
              },
              {
                heading: "2. Soundboxes and Transaction Feeds",
                body: 'Voice soundboxes announce exact amounts immediately in Hindi or regional languages ("Received \u20B9250"). Alternatively, pull down to refresh your merchant transaction feed.',
                tip: "Check that the sender\u2019s name and exact amount tally."
              }
            ],
            practicalActivity: {
              title: "Storefront Verification Protocol:",
              instructions: [
                'Place a polite reminder at your counter: "Kindly allow a few seconds for SMS confirmation."',
                "Familiarize yourself with your bank\u2019s official 6-character SMS sender ID header."
              ]
            },
            keyTakeaways: [
              "A customer\u2019s screen is not legal proof of credit.",
              "Verify payments solely through your own phone or voice box.",
              "Politely insist on confirmation before handing over merchandise."
            ]
          }
        }
      }
    ],
    quiz: {
      id: "quiz-digital-payments-safety",
      courseId: "course-digital-payments-safety",
      title: {
        hi: "\u0921\u093F\u091C\u093F\u091F\u0932 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u090F\u0935\u0902 \u092D\u0941\u0917\u0924\u093E\u0928 \u091F\u0947\u0938\u094D\u091F",
        en: "Digital Safety & Payments Assessment"
      },
      passingScorePercent: 75,
      questions: [
        {
          id: "qs1",
          question: {
            hi: '\u092F\u0926\u093F \u0915\u094B\u0908 \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0915\u0939\u0947 \u0915\u093F "\u0906\u092A\u0915\u0947 \u0916\u093E\u0924\u0947 \u092E\u0947\u0902 \u20B9500 \u092D\u0947\u091C\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0905\u092A\u0928\u093E UPI PIN \u0921\u093E\u0932\u0947\u0902", \u0924\u094B \u0906\u092A\u0915\u094B \u0915\u094D\u092F\u093E \u0915\u0930\u0928\u093E \u091A\u093E\u0939\u093F\u090F?',
            en: 'If someone tells you: "Enter your UPI PIN to receive \u20B9500 in your account", what should you do?'
          },
          options: {
            hi: [
              "\u0924\u0941\u0930\u0902\u0924 PIN \u0921\u093E\u0932 \u0926\u0947\u0928\u093E \u091A\u093E\u0939\u093F\u090F \u0924\u093E\u0915\u093F \u092A\u0948\u0938\u0947 \u0906 \u091C\u093E\u090F\u0902",
              "PIN \u0915\u092D\u0940 \u0928\u0939\u0940\u0902 \u0921\u093E\u0932\u0928\u093E \u091A\u093E\u0939\u093F\u090F, \u0915\u094D\u092F\u094B\u0902\u0915\u093F \u092A\u0948\u0938\u0947 \u0932\u0947\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F PIN \u0915\u0940 \u091C\u093C\u0930\u0942\u0930\u0924 \u0928\u0939\u0940\u0902 \u0939\u094B\u0924\u0940",
              "\u0905\u092A\u0928\u093E \u092C\u0948\u0902\u0915 \u0916\u093E\u0924\u093E \u0928\u0902\u092C\u0930 \u0914\u0930 OTP \u092D\u0940 \u092C\u0924\u093E \u0926\u0947\u0928\u093E \u091A\u093E\u0939\u093F\u090F",
              "\u0905\u092A\u0928\u0947 \u0926\u094B\u0938\u094D\u0924 \u0915\u093E PIN \u0921\u093E\u0932\u0928\u093E \u091A\u093E\u0939\u093F\u090F"
            ],
            en: [
              "Enter the PIN immediately to receive the money",
              "Never enter the PIN, as receiving money requires zero PIN",
              "Share account number and OTP as well",
              "Enter a friend\u2019s PIN instead"
            ]
          },
          correctOptionIndex: 1,
          explanation: {
            hi: "\u092A\u0948\u0938\u0947 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0915\u092D\u0940 \u092D\u0940 UPI PIN \u0928\u0939\u0940\u0902 \u0921\u093E\u0932\u093E \u091C\u093E\u0924\u093E! \u092F\u0939 \u090F\u0915 \u0920\u0917\u0940 \u0915\u093E \u092A\u094D\u0930\u092F\u093E\u0938 \u0939\u0948\u0964",
            en: "Never enter a UPI PIN to receive money! This is an unmistakable scam attempt."
          }
        },
        {
          id: "qs2",
          question: {
            hi: "\u0926\u0941\u0915\u093E\u0928 \u092A\u0930 \u0921\u093F\u091C\u093F\u091F\u0932 \u092A\u0947\u092E\u0947\u0902\u091F \u0938\u092B\u0932 \u0939\u0941\u0908 \u0939\u0948 \u092F\u093E \u0928\u0939\u0940\u0902, \u0907\u0938\u0915\u0940 \u0938\u092C\u0938\u0947 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u092A\u0941\u0937\u094D\u091F\u093F \u0915\u0948\u0938\u0947 \u0939\u094B\u0924\u0940 \u0939\u0948?",
            en: "What is the most reliable way to confirm that a customer\u2019s digital payment actually went through?"
          },
          options: {
            hi: [
              "\u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u0947 \u092B\u094B\u0928 \u0915\u093E \u0938\u094D\u0915\u094D\u0930\u0940\u0928\u0936\u0949\u091F \u0926\u0947\u0916\u0915\u0930",
              "\u0906\u092A\u0915\u0947 \u0905\u092A\u0928\u0947 \u092B\u094B\u0928 \u092A\u0930 \u092C\u0948\u0902\u0915 SMS \u092F\u093E \u0938\u093E\u0909\u0902\u0921\u092C\u0949\u0915\u094D\u0938 \u0915\u0940 \u0906\u0935\u093E\u091C \u0938\u0941\u0928\u0915\u0930",
              "\u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u0940 \u092C\u093E\u0924\u094B\u0902 \u092A\u0930 \u092A\u0942\u0930\u093E \u092D\u0930\u094B\u0938\u093E \u0915\u0930\u0915\u0947",
              "\u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u093E \u092B\u094B\u0928 \u0905\u092A\u0928\u0947 \u0939\u093E\u0925 \u092E\u0947\u0902 \u0932\u0947\u0915\u0930 \u0926\u0947\u0916\u0928\u093E"
            ],
            en: [
              "Looking at the customer\u2019s phone screenshot",
              "Hearing your own soundbox or checking your own bank SMS notification",
              "Taking the customer\u2019s verbal assurance",
              "Looking at an unverified photo"
            ]
          },
          correctOptionIndex: 1,
          explanation: {
            hi: "\u092A\u0941\u0937\u094D\u091F\u093F \u0939\u092E\u0947\u0936\u093E \u0905\u092A\u0928\u0947 \u0916\u0941\u0926 \u0915\u0947 \u092B\u094B\u0928 \u092F\u093E \u0938\u093E\u0909\u0902\u0921\u092C\u0949\u0915\u094D\u0938 \u092A\u0930 \u0939\u0940 \u0915\u0930\u0928\u0940 \u091A\u093E\u0939\u093F\u090F, \u0915\u094D\u092F\u094B\u0902\u0915\u093F \u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u093E \u0938\u094D\u0915\u094D\u0930\u0940\u0928\u0936\u0949\u091F \u0928\u0915\u0932\u0940 \u0939\u094B \u0938\u0915\u0924\u093E \u0939\u0948\u0964",
            en: "Always verify through your own device or soundbox because buyer screens can be spoofed."
          }
        },
        {
          id: "qs3",
          question: {
            hi: "\u0911\u0928\u0932\u093E\u0907\u0928 \u0935\u093F\u0924\u094D\u0924\u0940\u092F \u0927\u094B\u0916\u093E\u0927\u0921\u093C\u0940 \u0939\u094B\u0928\u0947 \u092A\u0930 \u092D\u093E\u0930\u0924 \u092E\u0947\u0902 \u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u093E\u0907\u092C\u0930 \u0939\u0947\u0932\u094D\u092A\u0932\u093E\u0907\u0928 \u0915\u093E \u0928\u0902\u092C\u0930 \u0915\u094D\u092F\u093E \u0939\u0948?",
            en: "What is the official national cyber fraud emergency helpline number in India?"
          },
          options: {
            hi: ["100", "1930", "108", "112"],
            en: ["100", "1930", "108", "112"]
          },
          correctOptionIndex: 1,
          explanation: {
            hi: "1930 \u092D\u093E\u0930\u0924 \u0938\u0930\u0915\u093E\u0930 \u0915\u0940 \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 \u0935\u093F\u0924\u094D\u0924\u0940\u092F \u0938\u093E\u0907\u092C\u0930 \u0905\u092A\u0930\u093E\u0927 \u0939\u0947\u0932\u094D\u092A\u0932\u093E\u0907\u0928 \u0939\u0948 (cybercrime.gov.in)\u0964",
            en: "1930 is India\u2019s official financial cybercrime reporting emergency helpline (cybercrime.gov.in)."
          }
        }
      ]
    }
  },
  {
    id: "course-whatsapp-social-marketing",
    category: "digital_marketing",
    title: {
      hi: "\u0935\u094D\u0939\u093E\u091F\u094D\u0938\u090F\u092A \u0914\u0930 \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0938\u0947 \u0935\u094D\u092F\u093E\u092A\u093E\u0930 \u0915\u0948\u0938\u0947 \u092C\u095D\u093E\u090F\u0902",
      en: "Growing Your Business via WhatsApp & Social Media"
    },
    shortDescription: {
      hi: "\u0938\u0940\u0916\u0947\u0902 \u0915\u093F WhatsApp Business \u0915\u0948\u091F\u0932\u0949\u0917 \u0915\u0948\u0938\u0947 \u092C\u0928\u093E\u090F\u0902, \u0938\u094D\u091F\u0947\u091F\u0938 \u0938\u0947 \u0928\u090F \u0911\u0930\u094D\u0921\u0930 \u0915\u0948\u0938\u0947 \u0932\u0947\u0902 \u0914\u0930 \u0938\u094D\u0925\u093E\u0928\u0940\u092F \u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0915\u093E \u092D\u0930\u094B\u0938\u093E \u0915\u0948\u0938\u0947 \u091C\u0940\u0924\u0947\u0902\u0964",
      en: "Set up WhatsApp Business catalogs, take orders through statuses, and market your products locally with zero advertising budget."
    },
    fullDescription: {
      hi: "\u0906\u091C \u0932\u0917\u092D\u0917 \u0939\u0930 \u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u0947 \u0939\u093E\u0925 \u092E\u0947\u0902 \u0938\u094D\u092E\u093E\u0930\u094D\u091F\u092B\u094B\u0928 \u0939\u0948\u0964 \u092C\u093F\u0928\u093E \u0915\u093F\u0938\u0940 \u092E\u0939\u0902\u0917\u0947 \u0935\u093F\u091C\u094D\u091E\u093E\u092A\u0928 \u0915\u0947, \u0915\u0947\u0935\u0932 \u0905\u092A\u0928\u0947 \u0935\u094D\u0939\u093E\u091F\u094D\u0938\u090F\u092A \u0914\u0930 \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0915\u093E \u0938\u0939\u0940 \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0915\u0947 \u0906\u092A \u0905\u092A\u0928\u0947 \u092E\u094B\u0939\u0932\u094D\u0932\u0947, \u0917\u093E\u0902\u0935 \u0914\u0930 \u092A\u093E\u0938 \u0915\u0947 \u0936\u0939\u0930\u094B\u0902 \u092E\u0947\u0902 10 \u0917\u0941\u0928\u093E \u091C\u094D\u092F\u093E\u0926\u093E \u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0924\u0915 \u092A\u0939\u0941\u0902\u091A \u0938\u0915\u0924\u0940 \u0939\u0948\u0902\u0964 \u0907\u0938 \u0915\u094B\u0930\u094D\u0938 \u092E\u0947\u0902 \u0935\u094D\u092F\u093E\u0935\u0939\u093E\u0930\u093F\u0915 \u0914\u0930 \u0938\u0930\u0932 \u0915\u0926\u092E \u0938\u093F\u0916\u093E\u090F \u0917\u090F \u0939\u0948\u0902\u0964",
      en: "Almost every potential buyer carries a smartphone. Without paying for expensive ads, leverage free WhatsApp Business tools, digital catalogs, and polite follow-ups to expand your customer base across your region."
    },
    level: "Beginner",
    estimatedHours: 2,
    languageAvailable: ["hi", "en"],
    thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=800&q=80",
    badgeTitle: {
      hi: "\u0921\u093F\u091C\u093F\u091F\u0932 \u092E\u093E\u0930\u094D\u0915\u0947\u091F\u093F\u0902\u0917 \u0938\u0916\u0940 (Marketing Champion)",
      en: "Social Commerce Champion"
    },
    rating: 4.8,
    reviewCount: 289,
    lessons: [
      {
        id: "lesson-whatsapp-catalog",
        courseId: "course-whatsapp-social-marketing",
        order: 1,
        durationMinutes: 15,
        title: {
          hi: "1. WhatsApp Business \u0910\u092A \u0914\u0930 \u092A\u094D\u0930\u094B\u0921\u0915\u094D\u091F \u0915\u0948\u091F\u0932\u0949\u0917 \u092C\u0928\u093E\u0928\u093E",
          en: "1. Setting up WhatsApp Business & Digital Catalog"
        },
        summary: {
          hi: "\u0938\u093E\u0927\u093E\u0930\u0923 \u0935\u094D\u0939\u093E\u091F\u094D\u0938\u090F\u092A \u0915\u0940 \u091C\u0917\u0939 WhatsApp Business \u0915\u094D\u092F\u094B\u0902 \u091C\u093C\u0930\u0942\u0930\u0940 \u0939\u0948 \u0914\u0930 \u0907\u0938\u092E\u0947\u0902 \u0905\u092A\u0928\u0940 \u0926\u0941\u0915\u093E\u0928 \u0915\u093E \u0921\u093F\u091C\u093F\u091F\u0932 \u0936\u094B\u0915\u0947\u0938 \u0915\u0948\u0938\u0947 \u092C\u0928\u093E\u090F\u0902\u0964",
          en: "Why WhatsApp Business is superior to personal WhatsApp and how to showcase your products with photos and prices."
        },
        content: {
          hi: {
            introduction: "WhatsApp Business \u090F\u0915 \u092E\u0941\u092B\u093C\u094D\u0924 \u0910\u092A \u0939\u0948 \u091C\u094B \u0906\u092A\u0915\u0940 \u091C\u0947\u092C \u092E\u0947\u0902 \u0906\u092A\u0915\u0940 \u092A\u0942\u0930\u0940 \u0926\u0941\u0915\u093E\u0928 \u092C\u0928\u093E \u0926\u0947\u0924\u093E \u0939\u0948\u0964 \u0917\u094D\u0930\u093E\u0939\u0915 \u092C\u093F\u0928\u093E \u092C\u093E\u0930-\u092C\u093E\u0930 \u092B\u094B\u091F\u094B \u092E\u093E\u0902\u0917\u0947 \u0906\u092A\u0915\u0940 \u092A\u0942\u0930\u0940 \u0935\u0948\u0930\u093E\u092F\u091F\u0940 \u090F\u0915 \u091C\u0917\u0939 \u0926\u0947\u0916 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964",
            storyExample: {
              character: "\u0930\u0941\u0916\u0938\u093E\u0928\u093E \u0906\u092A\u093E (\u0915\u0922\u093C\u093E\u0908\u0926\u093E\u0930 \u091A\u093E\u0926\u0930\u0947\u0902 \u0935 \u0915\u0941\u0936\u0928)",
              title: "\u0930\u0941\u0916\u0938\u093E\u0928\u093E \u0906\u092A\u093E \u0915\u0940 \u0921\u093F\u091C\u093F\u091F\u0932 \u0926\u0941\u0915\u093E\u0928",
              story: "\u0930\u0941\u0916\u0938\u093E\u0928\u093E \u0906\u092A\u093E \u092A\u0939\u0932\u0947 \u0939\u0930 \u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u094B \u0905\u0932\u0917-\u0905\u0932\u0917 20 \u092B\u094B\u091F\u094B \u092D\u0947\u091C\u0924\u0940 \u0925\u0940\u0902, \u091C\u093F\u0938\u0938\u0947 \u092B\u094B\u0928 \u092D\u0930 \u091C\u093E\u0924\u093E \u0925\u093E \u0914\u0930 \u0917\u094D\u0930\u093E\u0939\u0915 \u092A\u0930\u0947\u0936\u093E\u0928 \u0939\u094B\u0924\u0947 \u0925\u0947\u0964 \u0909\u0928\u094D\u0939\u094B\u0902\u0928\u0947 WhatsApp Business \u092E\u0947\u0902 6 \u091A\u093E\u0926\u0930\u094B\u0902 \u0915\u093E \u0915\u0948\u091F\u0932\u0949\u0917 \u092C\u0928\u093E\u092F\u093E \u091C\u093F\u0938\u092E\u0947\u0902 \u0926\u093E\u092E \u0914\u0930 \u0928\u093E\u092A \u0932\u093F\u0916\u093E \u0925\u093E\u0964 \u0905\u092C \u0935\u0947 \u0938\u093F\u0930\u094D\u092B \u090F\u0915 \u0932\u093F\u0902\u0915 \u092D\u0947\u091C\u0924\u0940 \u0939\u0948\u0902 \u0914\u0930 \u0917\u094D\u0930\u093E\u0939\u0915 \u0916\u0941\u0926 \u092A\u0938\u0902\u0926 \u0915\u0930\u0915\u0947 \u0911\u0930\u094D\u0921\u0930 \u0926\u0947 \u0926\u0947\u0924\u0947 \u0939\u0948\u0902!"
            },
            sections: [
              {
                heading: "1. WhatsApp Business \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0935 \u0938\u0947\u091F\u0905\u092A",
                body: 'Google Play Store \u0938\u0947 "WhatsApp Business" \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u0930\u0947\u0902\u0964 \u0905\u092A\u0928\u0940 \u0926\u0941\u0915\u093E\u0928 \u092F\u093E \u092C\u094D\u0930\u093E\u0902\u0921 \u0915\u093E \u0928\u093E\u092E, \u092A\u0924\u093E, \u0916\u0941\u0932\u0928\u0947 \u0915\u093E \u0938\u092E\u092F \u0914\u0930 \u090F\u0915 \u0938\u0941\u0902\u0926\u0930 \u0932\u094B\u0917\u094B \u092F\u093E \u0905\u092A\u0928\u0940 \u092B\u094B\u091F\u094B \u0932\u0917\u093E\u090F\u0902\u0964',
                tip: "\u0905\u092A\u0928\u0947 \u0935\u094D\u092F\u0915\u094D\u0924\u093F\u0917\u0924 \u0928\u0902\u092C\u0930 \u0914\u0930 \u0935\u094D\u092F\u093E\u092A\u093E\u0930 \u0915\u0947 \u0928\u0902\u092C\u0930 \u0915\u094B \u0905\u0932\u0917 \u0930\u0916\u0928\u093E \u0938\u092C\u0938\u0947 \u0905\u091A\u094D\u091B\u093E \u0939\u094B\u0924\u093E \u0939\u0948\u0964"
              },
              {
                heading: "2. \u0915\u0948\u091F\u0932\u0949\u0917 \u092E\u0947\u0902 \u0909\u0924\u094D\u092A\u093E\u0926 \u091C\u094B\u0921\u093C\u0928\u093E",
                body: 'Settings > Business Tools > Catalog \u092E\u0947\u0902 \u091C\u093E\u090F\u0902\u0964 "Add New Item" \u0926\u092C\u093E\u090F\u0902\u0964 \u0905\u091A\u094D\u091B\u0940 \u0930\u094B\u0936\u0928\u0940 \u092E\u0947\u0902 \u0932\u0940 \u0917\u0908 2 \u0938\u093E\u092B \u0924\u0938\u094D\u0935\u0940\u0930\u0947\u0902 \u0932\u0917\u093E\u090F\u0902, \u0909\u0924\u094D\u092A\u093E\u0926 \u0915\u093E \u0928\u093E\u092E (\u091C\u0948\u0938\u0947: \u0936\u0941\u0926\u094D\u0927 \u0906\u092E \u0915\u093E \u0906\u091A\u093E\u0930 500g), \u0915\u0940\u092E\u0924 (\u20B9180) \u0914\u0930 2 \u0932\u093E\u0907\u0928 \u0915\u093E \u0935\u093F\u0935\u0930\u0923 \u0932\u093F\u0916\u0947\u0902\u0964',
                tip: "\u0924\u0938\u094D\u0935\u0940\u0930 \u0939\u092E\u0947\u0936\u093E \u0926\u093F\u0928 \u0915\u0947 \u0909\u091C\u093E\u0932\u0947 \u092E\u0947\u0902 \u0938\u093E\u092B \u092A\u0943\u0937\u094D\u0920\u092D\u0942\u092E\u093F \u092A\u0930 \u0932\u0947\u0902\u0964"
              }
            ],
            practicalActivity: {
              title: "\u0906\u091C \u0939\u0940 \u092A\u0939\u0932\u093E \u0915\u0948\u091F\u0932\u0949\u0917 \u0906\u0907\u091F\u092E \u092C\u0928\u093E\u090F\u0902:",
              instructions: [
                "\u0905\u092A\u0928\u0947 \u0938\u092C\u0938\u0947 \u0932\u094B\u0915\u092A\u094D\u0930\u093F\u092F \u0909\u0924\u094D\u092A\u093E\u0926 \u0915\u094B \u0938\u093E\u092B \u092E\u0947\u091C \u092A\u0930 \u0930\u0916\u0947\u0902\u0964",
                "\u0926\u093F\u0928 \u0915\u0940 \u0930\u094B\u0936\u0928\u0940 \u092E\u0947\u0902 2 \u0905\u091A\u094D\u091B\u0940 \u0924\u0938\u094D\u0935\u0940\u0930\u0947\u0902 \u0916\u0940\u0902\u091A\u0947\u0902\u0964",
                "WhatsApp Business \u092E\u0947\u0902 \u0935\u093F\u0935\u0930\u0923 \u0914\u0930 \u0915\u0940\u092E\u0924 \u0915\u0947 \u0938\u093E\u0925 \u0915\u0948\u091F\u0932\u0949\u0917 \u092E\u0947\u0902 \u091C\u094B\u0921\u093C\u0947\u0902\u0964",
                "\u0905\u092A\u0928\u0947 3 \u092A\u0930\u093F\u091A\u093F\u0924 \u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0915\u094B \u0907\u0938\u0915\u093E \u0932\u093F\u0902\u0915 \u092D\u0947\u091C\u0915\u0930 \u0909\u0928\u0915\u0940 \u0930\u093E\u092F \u0932\u0947\u0902\u0964"
              ]
            },
            keyTakeaways: [
              "WhatsApp Business \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0938\u0947 \u092E\u0941\u092B\u093C\u094D\u0924 \u0914\u0930 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0939\u0948\u0964",
              "\u0915\u0948\u091F\u0932\u0949\u0917 \u0939\u094B\u0928\u0947 \u0938\u0947 \u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0915\u094B \u0906\u092A\u0915\u0940 \u0926\u0941\u0915\u093E\u0928 \u0905\u0927\u093F\u0915 \u092A\u0947\u0936\u0947\u0935\u0930 \u0932\u0917\u0924\u0940 \u0939\u0948\u0964",
              "\u0905\u091A\u094D\u091B\u0940 \u0924\u0938\u094D\u0935\u0940\u0930\u0947\u0902 \u0914\u0930 \u0938\u094D\u092A\u0937\u094D\u091F \u0915\u0940\u092E\u0924 \u0938\u0947 \u092C\u093F\u0915\u094D\u0930\u0940 \u0926\u094B\u0917\u0941\u0928\u0940 \u0939\u094B \u091C\u093E\u0924\u0940 \u0939\u0948\u0964"
            ]
          },
          en: {
            introduction: "WhatsApp Business turns your phone into a professional digital storefront. Buyers can browse items, read descriptions, and see prices without clunky back-and-forth messaging.",
            storyExample: {
              character: "Rukhsana Aapa (Embroidered Quilts & Linens)",
              title: "Rukhsana\u2019s Pocket Storefront",
              story: "Rukhsana used to forward 25 individual photos to every prospective buyer, cluttering storage and confusing orders. By organizing a 6-item WhatsApp catalog with dimensions and fixed prices, she now sends one catalog link, speeding up purchases dramatically."
            },
            sections: [
              {
                heading: "1. Download & Profile Setup",
                body: 'Install "WhatsApp Business" from Google Play Store. Add your business trade name, operational hours, workshop address, and a friendly profile icon.',
                tip: "Using a dedicated SIM for business interactions keeps your personal family life organized."
              },
              {
                heading: "2. Adding Catalog Items",
                body: 'Go to Settings > Business Tools > Catalog. Tap "Add New Item". Attach 2 crisp daylight photos, enter product title (e.g., Pure Mango Pickle 500g), retail price (\u20B9180), and simple description.',
                tip: "Photograph items against a clean, uncluttered background."
              }
            ],
            practicalActivity: {
              title: "Create Your First Item Entry:",
              instructions: [
                "Set your top-selling product on a clean table.",
                "Take 2 well-lit photos in natural daylight.",
                "Publish the entry in your WhatsApp catalog with transparent pricing.",
                "Share the catalog link with 3 loyal customers for feedback."
              ]
            },
            keyTakeaways: [
              "WhatsApp Business is completely free to install and maintain.",
              "A clean catalog builds instant buyer credibility.",
              "Transparent pricing eliminates hesitation and closes sales faster."
            ]
          }
        }
      }
    ],
    quiz: {
      id: "quiz-whatsapp-social-marketing",
      courseId: "course-whatsapp-social-marketing",
      title: {
        hi: "\u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u092E\u093E\u0930\u094D\u0915\u0947\u091F\u093F\u0902\u0917 \u092E\u0942\u0932\u094D\u092F\u093E\u0902\u0915\u0928",
        en: "Social Media Marketing Quiz"
      },
      passingScorePercent: 75,
      questions: [
        {
          id: "qm1",
          question: {
            hi: "\u0938\u093E\u0927\u093E\u0930\u0923 \u0935\u094D\u0939\u093E\u091F\u094D\u0938\u090F\u092A \u0915\u0947 \u092E\u0941\u0915\u093E\u092C\u0932\u0947 WhatsApp Business \u0915\u093E \u0938\u092C\u0938\u0947 \u092C\u0921\u093C\u093E \u0935\u094D\u092F\u093E\u0935\u0938\u093E\u092F\u093F\u0915 \u092B\u093E\u092F\u0926\u093E \u0915\u094D\u092F\u093E \u0939\u0948?",
            en: "What is the biggest operational advantage of WhatsApp Business over standard personal WhatsApp?"
          },
          options: {
            hi: [
              "\u0907\u0938\u092E\u0947\u0902 \u0909\u0924\u094D\u092A\u093E\u0926 \u0915\u0948\u091F\u0932\u0949\u0917 (\u092B\u094B\u091F\u094B \u0935 \u0926\u093E\u092E \u0938\u0939\u093F\u0924) \u0914\u0930 \u0911\u091F\u094B\u092E\u0948\u091F\u093F\u0915 \u0938\u094D\u0935\u093E\u0917\u0924 \u0938\u0902\u0926\u0947\u0936 \u0915\u0940 \u0938\u0941\u0935\u093F\u0927\u093E \u0939\u094B\u0924\u0940 \u0939\u0948",
              "\u0907\u0938\u092E\u0947\u0902 \u0915\u0947\u0935\u0932 \u0917\u0947\u092E \u0916\u0947\u0932\u0947 \u091C\u093E \u0938\u0915\u0924\u0947 \u0939\u0948\u0902",
              "\u092F\u0939 \u0907\u0902\u091F\u0930\u0928\u0947\u091F \u0915\u0947 \u092C\u093F\u0928\u093E \u091A\u0932\u0924\u093E \u0939\u0948",
              "\u0907\u0938\u092E\u0947\u0902 \u0915\u0947\u0935\u0932 \u092B\u093F\u0932\u094D\u092E\u0947\u0902 \u0926\u0947\u0916\u0940 \u091C\u093E \u0938\u0915\u0924\u0940 \u0939\u0948\u0902"
            ],
            en: [
              "It provides product catalogs with prices and automated greeting messages",
              "It only runs video games",
              "It operates without any internet connectivity",
              "It is strictly for streaming movies"
            ]
          },
          correctOptionIndex: 0,
          explanation: {
            hi: "WhatsApp Business \u092E\u0947\u0902 \u0915\u0948\u091F\u0932\u0949\u0917, \u0924\u094D\u0935\u0930\u093F\u0924 \u0909\u0924\u094D\u0924\u0930 (Quick Replies) \u0914\u0930 \u0935\u094D\u092F\u093E\u0935\u0938\u093E\u092F\u093F\u0915 \u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u0915\u0940 \u0938\u0941\u0935\u093F\u0927\u093E \u0939\u094B\u0924\u0940 \u0939\u0948 \u091C\u094B \u0935\u094D\u092F\u093E\u092A\u093E\u0930 \u0915\u094B \u0917\u0924\u093F \u0926\u0947\u0924\u0940 \u0939\u0948\u0964",
            en: "WhatsApp Business allows you to build product showcases, catalogs, and automated customer responses."
          }
        },
        {
          id: "qm2",
          question: {
            hi: "\u0915\u0948\u091F\u0932\u0949\u0917 \u092E\u0947\u0902 \u0909\u0924\u094D\u092A\u093E\u0926 \u0915\u0940 \u092B\u094B\u091F\u094B \u0916\u0940\u0902\u091A\u0924\u0947 \u0938\u092E\u092F \u0938\u092C\u0938\u0947 \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u092C\u093E\u0924 \u0915\u094D\u092F\u093E \u0939\u0948?",
            en: "What is the most important guideline when taking product photos for your digital catalog?"
          },
          options: {
            hi: [
              "\u092B\u094B\u091F\u094B \u0905\u0902\u0927\u0947\u0930\u0947 \u092E\u0947\u0902 \u0916\u0940\u0902\u091A\u0928\u093E \u091A\u093E\u0939\u093F\u090F",
              "\u0926\u093F\u0928 \u0915\u0947 \u092A\u094D\u0930\u093E\u0915\u0943\u0924\u093F\u0915 \u0909\u091C\u093E\u0932\u0947 \u092E\u0947\u0902 \u0938\u093E\u092B \u092A\u0943\u0937\u094D\u0920\u092D\u0942\u092E\u093F \u092A\u0930 \u092B\u094B\u091F\u094B \u0916\u0940\u0902\u091A\u0928\u093E \u091A\u093E\u0939\u093F\u090F",
              "\u0907\u0902\u091F\u0930\u0928\u0947\u091F \u0938\u0947 \u0915\u093F\u0938\u0940 \u0935\u093F\u0926\u0947\u0936\u0940 \u0915\u0902\u092A\u0928\u0940 \u0915\u0940 \u0928\u0915\u0932\u0940 \u092B\u094B\u091F\u094B \u091A\u0941\u0930\u093E\u0915\u0930 \u0932\u0917\u093E\u0928\u093E",
              "\u0915\u0947\u0935\u0932 \u092C\u093F\u0928\u093E \u092B\u094B\u091F\u094B \u0915\u0947 \u0939\u0940 \u0938\u093E\u092E\u093E\u0928 \u092C\u0947\u091A\u0928\u093E \u091A\u093E\u0939\u093F\u090F"
            ],
            en: [
              "Take photos in dark rooms",
              "Shoot in bright natural daylight against a clean, clutter-free background",
              "Copy fake stock images from international sites",
              "Never show photos of actual items"
            ]
          },
          correctOptionIndex: 1,
          explanation: {
            hi: "\u0926\u093F\u0928 \u0915\u0940 \u092A\u094D\u0930\u093E\u0915\u0943\u0924\u093F\u0915 \u0930\u094B\u0936\u0928\u0940 \u092E\u0947\u0902 \u0916\u0940\u0902\u091A\u0940 \u0917\u0908 \u0905\u0938\u0932\u0940 \u0924\u0938\u094D\u0935\u0940\u0930 \u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u093E \u0935\u093F\u0936\u094D\u0935\u093E\u0938 \u091C\u0940\u0924\u0924\u0940 \u0939\u0948\u0964",
            en: "Authentic photos taken in clean natural lighting establish real buyer trust."
          }
        }
      ]
    }
  },
  {
    id: "course-govt-schemes-resources",
    category: "government_schemes",
    title: {
      hi: "\u092E\u0939\u093F\u0932\u093E \u0909\u0926\u094D\u092F\u092E\u093F\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u0938\u0930\u0915\u093E\u0930\u0940 \u092F\u094B\u091C\u0928\u093E\u090F\u0902 \u0914\u0930 \u0932\u094B\u0928 \u0917\u093E\u0907\u0921",
      en: "Government Schemes & Micro-Loan Guide for Women"
    },
    shortDescription: {
      hi: "\u092E\u0941\u0926\u094D\u0930\u093E \u092F\u094B\u091C\u0928\u093E (PMMY), \u0909\u0926\u094D\u092F\u092E \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u0914\u0930 \u0938\u094D\u0935\u092F\u0902 \u0938\u0939\u093E\u092F\u0924\u093E \u0938\u092E\u0942\u0939 (SHG) \u0938\u0947 \u092C\u093F\u0928\u093E \u0915\u093F\u0938\u0940 \u0926\u0932\u093E\u0932 \u0915\u0947 \u0938\u0939\u093E\u092F\u0924\u093E \u092A\u093E\u0928\u0947 \u0915\u0940 \u0938\u0939\u0940 \u091C\u093E\u0928\u0915\u093E\u0930\u0940\u0964",
      en: "Factual guide to Pradhan Mantri Mudra Yojana, free Udyam MSME certification, and SHG bank credit without middlemen."
    },
    fullDescription: {
      hi: "\u092D\u093E\u0930\u0924 \u0938\u0930\u0915\u093E\u0930 \u0914\u0930 \u0930\u093E\u091C\u094D\u092F \u0938\u0930\u0915\u093E\u0930\u094B\u0902 \u0915\u0947 \u092A\u093E\u0938 \u092E\u0939\u093F\u0932\u093E \u0909\u0926\u094D\u092F\u092E\u093F\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u0915\u092E \u092C\u094D\u092F\u093E\u091C \u0926\u0930 \u0914\u0930 \u092C\u093F\u0928\u093E \u0917\u093E\u0930\u0902\u091F\u0940 \u0935\u093E\u0932\u0947 \u0932\u094B\u0928 \u0915\u0940 \u0915\u0908 \u092F\u094B\u091C\u0928\u093E\u090F\u0902 \u0939\u0948\u0902\u0964 \u0907\u0938 \u0915\u094B\u0930\u094D\u0938 \u092E\u0947\u0902 \u091C\u093E\u0928\u0947\u0902 \u0915\u093F \u0915\u094C\u0928-\u0915\u094C\u0928 \u0938\u0940 \u092F\u094B\u091C\u0928\u093E\u090F\u0902 \u0905\u0938\u0932\u0940 \u0939\u0948\u0902, \u0915\u094D\u092F\u093E \u091C\u0930\u0942\u0930\u0940 \u0915\u093E\u0917\u091C\u093E\u0924 \u091A\u093E\u0939\u093F\u090F \u0914\u0930 \u0926\u0932\u093E\u0932\u094B\u0902 \u0915\u0947 \u0927\u094B\u0916\u0947 \u0938\u0947 \u092C\u091A\u0915\u0930 \u0938\u0940\u0927\u0947 \u092C\u0948\u0902\u0915 \u092F\u093E \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 \u092A\u094B\u0930\u094D\u091F\u0932 \u092A\u0930 \u0915\u0948\u0938\u0947 \u0906\u0935\u0947\u0926\u0928 \u0915\u0930\u0947\u0902\u0964",
      en: "Learn how to leverage legitimate government microfinance programs like PMMY Mudra loans, Stand-Up India, and official MSME Udyam registration safely and transparently."
    },
    level: "Beginner",
    estimatedHours: 2,
    languageAvailable: ["hi", "en"],
    thumbnail: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800&q=80",
    badgeTitle: {
      hi: "\u092F\u094B\u091C\u0928\u093E \u092E\u093E\u0930\u094D\u0917\u0926\u0930\u094D\u0936\u0915 \u0938\u0916\u0940 (Schemes Guide)",
      en: "Govt Schemes Navigator"
    },
    rating: 4.9,
    reviewCount: 310,
    lessons: [
      {
        id: "lesson-mudra-udyam",
        courseId: "course-govt-schemes-resources",
        order: 1,
        durationMinutes: 18,
        title: {
          hi: "1. \u092A\u0940\u090F\u092E \u092E\u0941\u0926\u094D\u0930\u093E \u092F\u094B\u091C\u0928\u093E \u0914\u0930 \u0909\u0926\u094D\u092F\u092E \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u0915\u093E \u0938\u091A",
          en: "1. PMMY Mudra Loans & Free Udyam MSME Registration"
        },
        summary: {
          hi: "\u0936\u093F\u0936\u0941, \u0915\u093F\u0936\u094B\u0930 \u0914\u0930 \u0924\u0930\u0941\u0923 \u0932\u094B\u0928 \u0915\u0947 \u0928\u093F\u092F\u092E, \u0914\u0930 \u0918\u0930 \u092C\u0948\u0920\u0947 \u092B\u094D\u0930\u0940 \u092E\u0947\u0902 \u0938\u0930\u0915\u093E\u0930\u0940 \u090F\u092E\u090F\u0938\u090F\u092E\u0908 \u092A\u094D\u0930\u092E\u093E\u0923 \u092A\u0924\u094D\u0930 \u0915\u0948\u0938\u0947 \u092C\u0928\u093E\u090F\u0902\u0964",
          en: "Eligibility rules for Shishu, Kishore loans and how to get your official MSME registration at zero fee."
        },
        content: {
          hi: {
            introduction: "\u0915\u0908 \u092E\u0939\u093F\u0932\u093E\u090F\u0902 \u0938\u094B\u091A\u0924\u0940 \u0939\u0948\u0902 \u0915\u093F \u0938\u0930\u0915\u093E\u0930\u0940 \u0932\u094B\u0928 \u092A\u093E\u0928\u093E \u0928\u093E\u092E\u0941\u092E\u0915\u093F\u0928 \u0939\u0948 \u092F\u093E \u0907\u0938\u0915\u0947 \u0932\u093F\u090F \u0926\u0932\u093E\u0932\u094B\u0902 \u0915\u094B \u092A\u0948\u0938\u0947 \u0926\u0947\u0928\u0947 \u092A\u0921\u093C\u0924\u0947 \u0939\u0948\u0902\u0964 \u092F\u0939 \u092C\u093F\u0932\u094D\u0915\u0941\u0932 \u0917\u0932\u0924 \u0939\u0948\u0964 \u0906\u0907\u090F \u091C\u093E\u0928\u0924\u0947 \u0939\u0948\u0902 \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 \u0928\u093F\u092F\u092E\u0964",
            storyExample: {
              character: "\u0915\u0935\u093F\u0924\u093E \u0926\u0940\u0926\u0940 (\u0921\u0947\u092F\u0930\u0940 \u0914\u0930 \u0926\u0941\u0917\u094D\u0927 \u0909\u0924\u094D\u092A\u093E\u0926)",
              title: "\u0915\u0935\u093F\u0924\u093E \u0926\u0940\u0926\u0940 \u0915\u094B \u0915\u0948\u0938\u0947 \u092E\u093F\u0932\u093E \u20B950,000 \u0915\u093E \u092E\u0941\u0926\u094D\u0930\u093E \u0932\u094B\u0928",
              story: "\u0915\u0935\u093F\u0924\u093E \u0926\u0940\u0926\u0940 \u0928\u0947 \u0905\u092A\u0928\u0940 2 \u0917\u093E\u092F\u094B\u0902 \u0938\u0947 \u0926\u0942\u0927 \u0915\u093E \u0915\u093E\u092E \u092C\u0922\u093C\u093E\u092F\u093E\u0964 \u0909\u0928\u094D\u0939\u094B\u0902\u0928\u0947 \u0909\u0926\u094D\u092F\u092E \u0906\u0927\u093E\u0930 \u092A\u0930 \u0916\u0941\u0926 \u092B\u094D\u0930\u0940 \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u0915\u093F\u092F\u093E \u0914\u0930 \u092A\u093E\u0938 \u0915\u0947 \u0917\u094D\u0930\u093E\u092E\u0940\u0923 \u092C\u0948\u0902\u0915 \u0936\u093E\u0916\u093E \u092A\u094D\u0930\u092C\u0902\u0927\u0915 \u0915\u094B \u0905\u092A\u0928\u0940 \u0926\u0948\u0928\u093F\u0915 \u092C\u093F\u0915\u094D\u0930\u0940 \u0915\u0940 \u0921\u093E\u092F\u0930\u0940 \u0926\u093F\u0916\u093E\u0908\u0964 \u092C\u0948\u0902\u0915 \u0928\u0947 \u0909\u0928\u0915\u0947 \u0916\u093E\u0924\u0947 \u0915\u0947 \u0938\u0939\u0940 \u0930\u093F\u0915\u0949\u0930\u094D\u0921 \u0926\u0947\u0916\u0915\u0930 \u092C\u093F\u0928\u093E \u0915\u093F\u0938\u0940 \u0917\u093E\u0930\u0902\u091F\u0940 \u0915\u0947 \u0936\u093F\u0936\u0941 \u092E\u0941\u0926\u094D\u0930\u093E \u0932\u094B\u0928 \u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0915\u093F\u092F\u093E!"
            },
            sections: [
              {
                heading: "1. \u092A\u094D\u0930\u0927\u093E\u0928\u092E\u0902\u0924\u094D\u0930\u0940 \u092E\u0941\u0926\u094D\u0930\u093E \u092F\u094B\u091C\u0928\u093E (PMMY) \u0915\u0940 3 \u0936\u094D\u0930\u0947\u0923\u093F\u092F\u093E\u0902",
                body: "- **\u0936\u093F\u0936\u0941 \u0932\u094B\u0928 (Shishu):** \u20B950,000 \u0924\u0915 (\u0928\u092F\u093E \u0915\u093E\u092E \u092F\u093E \u0938\u093F\u0932\u093E\u0908 \u092E\u0936\u0940\u0928/\u0938\u093E\u092E\u093E\u0928 \u0915\u0947 \u0932\u093F\u090F)\u0964\n- **\u0915\u093F\u0936\u094B\u0930 \u0932\u094B\u0928 (Kishore):** \u20B950,000 \u0938\u0947 \u20B95 \u0932\u093E\u0916 \u0924\u0915 (\u0915\u093E\u092E \u0915\u094B \u092C\u0922\u093C\u093E\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F)\u0964\n- **\u0924\u0930\u0941\u0923 \u0932\u094B\u0928 (Tarun):** \u20B95 \u0932\u093E\u0916 \u0938\u0947 \u20B910 \u0932\u093E\u0916 \u0924\u0915\u0964",
                tip: "\u0907\u0938\u0915\u0947 \u0932\u093F\u090F \u0915\u093F\u0938\u0940 \u0938\u0902\u092A\u0924\u094D\u0924\u093F \u092F\u093E \u091C\u093C\u092E\u0940\u0928 \u0915\u094B \u0917\u093F\u0930\u0935\u0940 (Collateral-Free) \u0930\u0916\u0928\u0947 \u0915\u0940 \u0906\u0935\u0936\u094D\u092F\u0915\u0924\u093E \u0928\u0939\u0940\u0902 \u0939\u094B\u0924\u0940\u0964"
              },
              {
                heading: "2. \u0909\u0926\u094D\u092F\u092E \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 (Udyam Registration)",
                body: "\u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 \u0935\u0947\u092C\u0938\u093E\u0907\u091F udyamregistration.gov.in \u092A\u0930 \u092F\u0939 100% \u092E\u0941\u092B\u093C\u094D\u0924 \u0939\u0948\u0964 \u0907\u0938\u0915\u0947 \u0932\u093F\u090F \u0906\u0927\u093E\u0930 \u0915\u093E\u0930\u094D\u0921 \u0914\u0930 \u092C\u0948\u0902\u0915 \u0916\u093E\u0924\u0947 \u0915\u0940 \u0906\u0935\u0936\u094D\u092F\u0915\u0924\u093E \u0939\u094B\u0924\u0940 \u0939\u0948\u0964 \u0928\u0915\u0932\u0940 \u0935\u0947\u092C\u0938\u093E\u0907\u091F\u094B\u0902 \u0938\u0947 \u092C\u091A\u0947\u0902 \u091C\u094B \u20B9500 \u092F\u093E \u20B91,000 \u092E\u093E\u0902\u0917\u0924\u0940 \u0939\u0948\u0902\u0964",
                tip: '\u0938\u0930\u0915\u093E\u0930\u0940 \u0935\u0947\u092C\u0938\u093E\u0907\u091F \u0915\u093E \u092A\u0924\u093E \u0939\u092E\u0947\u0936\u093E ".gov.in" \u092A\u0930 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B\u0924\u093E \u0939\u0948\u0964'
              }
            ],
            practicalActivity: {
              title: "\u091C\u0930\u0942\u0930\u0940 \u0926\u0938\u094D\u0924\u093E\u0935\u0947\u091C\u094B\u0902 \u0915\u0940 \u092B\u093E\u0907\u0932 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902:",
              instructions: [
                "\u0906\u0927\u093E\u0930 \u0915\u093E\u0930\u094D\u0921 \u0914\u0930 \u092A\u0948\u0928 \u0915\u093E\u0930\u094D\u0921 \u0915\u0940 2-2 \u092B\u094B\u091F\u094B\u0915\u0949\u092A\u0940\u0964",
                "\u092C\u0948\u0902\u0915 \u092A\u093E\u0938\u092C\u0941\u0915 \u0915\u0947 \u092A\u093F\u091B\u0932\u0947 6 \u092E\u0939\u0940\u0928\u0947 \u0915\u0947 \u0932\u0947\u0928\u0926\u0947\u0928 \u0915\u0940 \u0915\u0949\u092A\u0940\u0964",
                "\u0926\u0941\u0915\u093E\u0928 \u092F\u093E \u0915\u093E\u092E \u0915\u093E \u092C\u093F\u091C\u0932\u0940 \u092C\u093F\u0932 \u092F\u093E \u0930\u0947\u0902\u091F \u090F\u0917\u094D\u0930\u0940\u092E\u0947\u0902\u091F\u0964",
                "\u0905\u092A\u0928\u0947 \u0915\u093E\u092E \u0915\u0940 2 \u0924\u0938\u094D\u0935\u0940\u0930\u0947\u0902 \u090F\u0915 \u0938\u093E\u092B \u092B\u094B\u0932\u094D\u0921\u0930 \u092E\u0947\u0902 \u0930\u0916\u0947\u0902\u0964"
              ]
            },
            keyTakeaways: [
              "\u0909\u0926\u094D\u092F\u092E \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u092E\u0941\u092B\u093C\u094D\u0924 \u0939\u0948; \u0915\u093F\u0938\u0940 \u0926\u0932\u093E\u0932 \u0915\u094B \u092A\u0948\u0938\u0947 \u0928 \u0926\u0947\u0902\u0964",
              "\u0936\u093F\u0936\u0941 \u092E\u0941\u0926\u094D\u0930\u093E \u0932\u094B\u0928 \u092E\u0947\u0902 \u20B950,000 \u0924\u0915 \u092C\u093F\u0928\u093E \u0917\u093E\u0930\u0902\u091F\u0940 \u0938\u0939\u093E\u092F\u0924\u093E \u092E\u093F\u0932\u0924\u0940 \u0939\u0948\u0964",
              '\u0939\u092E\u0947\u0936\u093E \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 ".gov.in" \u0935\u0947\u092C\u0938\u093E\u0907\u091F\u094B\u0902 \u092A\u0930 \u0939\u0940 \u092D\u0930\u094B\u0938\u093E \u0915\u0930\u0947\u0902\u0964'
            ]
          },
          en: {
            introduction: "Grassroots women often assume bank micro-loans are unattainable or require commission payments to middlemen. Learn the transparent, official guidelines directly from banking authorities.",
            storyExample: {
              character: "Kavita Didi (Dairy & Milk Cooperative)",
              title: "Kavita\u2019s Collateral-Free Bank Success",
              story: "Kavita expanded her dairy micro-enterprise from 2 to 4 cows. She completed her free Udyam MSME certificate online, maintained a clean daily sales ledger, and presented her business notebook to the rural bank branch manager, securing a \u20B950,000 Shishu Mudra loan with zero collateral."
            },
            sections: [
              {
                heading: "1. Pradhan Mantri Mudra Yojana (PMMY) Tiers",
                body: "- **Shishu Tier:** Loans up to \u20B950,000 for starting or small equipment purchases.\n- **Kishore Tier:** Loans from \u20B950,000 to \u20B95,00,000 for expansion.\n- **Tarun Tier:** Loans from \u20B95,00,000 to \u20B910,00,000.",
                tip: "Mudra loans are collateral-free under government guarantee schemes."
              },
              {
                heading: "2. Official Free Udyam MSME Registration",
                body: "The government portal udyamregistration.gov.in is 100% free. Never pay commercial private portals claiming fees for MSME certificates.",
                tip: 'Official central government portals always end in ".gov.in".'
              }
            ],
            practicalActivity: {
              title: "Organize Your Loan Application Portfolio:",
              instructions: [
                "Photocopies of Aadhaar Card and PAN Card.",
                "Bank passbook statement showing past 6 months of steady activity.",
                "2 photographs of your production unit, workshop, or shopfront.",
                "A 1-page summary of your sales and estimated profit."
              ]
            },
            keyTakeaways: [
              "Udyam registration is 100% free of charge on .gov.in.",
              "Shishu Mudra loans provide up to \u20B950,000 with zero collateral.",
              "Keep written business records to impress local bank managers."
            ]
          }
        }
      }
    ],
    quiz: {
      id: "quiz-govt-schemes-resources",
      courseId: "course-govt-schemes-resources",
      title: {
        hi: "\u0938\u0930\u0915\u093E\u0930\u0940 \u092F\u094B\u091C\u0928\u093E \u091C\u094D\u091E\u093E\u0928 \u091F\u0947\u0938\u094D\u091F",
        en: "Govt Schemes Knowledge Check"
      },
      passingScorePercent: 75,
      questions: [
        {
          id: "qg1",
          question: {
            hi: '\u092A\u094D\u0930\u0927\u093E\u0928\u092E\u0902\u0924\u094D\u0930\u0940 \u092E\u0941\u0926\u094D\u0930\u093E \u092F\u094B\u091C\u0928\u093E \u0915\u0947 \u0924\u0939\u0924 "\u0936\u093F\u0936\u0941 \u0932\u094B\u0928" \u092E\u0947\u0902 \u0905\u0927\u093F\u0915\u0924\u092E \u0915\u093F\u0924\u0928\u0940 \u0930\u093E\u0936\u093F \u0915\u093E \u0932\u094B\u0928 \u092E\u093F\u0932\u0924\u093E \u0939\u0948?',
            en: 'Under Pradhan Mantri Mudra Yojana, what is the maximum limit for a "Shishu" tier loan?'
          },
          options: {
            hi: ["\u20B910,000", "\u20B950,000", "\u20B95,00,000", "\u20B910,00,000"],
            en: ["\u20B910,000", "\u20B950,000", "\u20B95,00,000", "\u20B910,00,000"]
          },
          correctOptionIndex: 1,
          explanation: {
            hi: "\u0936\u093F\u0936\u0941 \u0932\u094B\u0928 \u0915\u0940 \u0938\u0940\u092E\u093E \u20B950,000 \u0924\u0915 \u0939\u0948\u0964 \u20B950,000 \u0938\u0947 \u20B95 \u0932\u093E\u0916 \u0924\u0915 \u0915\u093E \u0932\u094B\u0928 \u0915\u093F\u0936\u094B\u0930 \u0936\u094D\u0930\u0947\u0923\u0940 \u092E\u0947\u0902 \u0906\u0924\u093E \u0939\u0948\u0964",
            en: "Shishu tier covers micro-loans up to \u20B950,000."
          }
        },
        {
          id: "qg2",
          question: {
            hi: "\u0938\u0930\u0915\u093E\u0930\u0940 \u0909\u0926\u094D\u092F\u092E (Udyam MSME) \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u0915\u0930\u093E\u0928\u0947 \u0915\u0940 \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 \u0938\u0930\u0915\u093E\u0930\u0940 \u092B\u0940\u0938 \u0915\u093F\u0924\u0928\u0940 \u0939\u0948?",
            en: "What is the official government fee for registering an MSME on the official Udyam portal?"
          },
          options: {
            hi: ["\u20B90 (\u092C\u093F\u0932\u094D\u0915\u0941\u0932 \u092E\u0941\u092B\u093C\u094D\u0924)", "\u20B9500", "\u20B91,500", "\u20B92,000"],
            en: ["\u20B90 (Completely Free)", "\u20B9500", "\u20B91,500", "\u20B92,000"]
          },
          correctOptionIndex: 0,
          explanation: {
            hi: "\u0909\u0926\u094D\u092F\u092E \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u092D\u093E\u0930\u0924 \u0938\u0930\u0915\u093E\u0930 \u0915\u0947 \u092A\u094B\u0930\u094D\u091F\u0932 (udyamregistration.gov.in) \u092A\u0930 100% \u092E\u0941\u092B\u093C\u094D\u0924 \u0939\u0948\u0964 \u091C\u094B \u0935\u0947\u092C\u0938\u093E\u0907\u091F\u0947\u0902 \u092A\u0948\u0938\u0947 \u092E\u093E\u0902\u0917\u0924\u0940 \u0939\u0948\u0902 \u0935\u0947 \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0939\u094B\u0924\u0940 \u0939\u0948\u0902\u0964",
            en: "Udyam registration is 100% free on the official government website (udyamregistration.gov.in)."
          }
        }
      ]
    }
  }
];

// src/server/sheets.ts
function parseGoogleDriveVideo(url) {
  if (!url || typeof url !== "string") {
    return { driveFileId: "", embedUrl: "", viewUrl: "", rawUrl: "", isValid: false };
  }
  const trimmed = url.trim();
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    const id = fileDMatch[1];
    return {
      driveFileId: id,
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      viewUrl: `https://drive.google.com/file/d/${id}/view`,
      rawUrl: trimmed,
      isValid: true
    };
  }
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    const id = idParamMatch[1];
    return {
      driveFileId: id,
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      viewUrl: `https://drive.google.com/file/d/${id}/view`,
      rawUrl: trimmed,
      isValid: true
    };
  }
  if (/^[a-zA-Z0-9_-]{20,50}$/.test(trimmed)) {
    return {
      driveFileId: trimmed,
      embedUrl: `https://drive.google.com/file/d/${trimmed}/preview`,
      viewUrl: `https://drive.google.com/file/d/${trimmed}/view`,
      rawUrl: `https://drive.google.com/file/d/${trimmed}/view`,
      isValid: true
    };
  }
  return {
    driveFileId: "",
    embedUrl: trimmed,
    viewUrl: trimmed,
    rawUrl: trimmed,
    isValid: false
  };
}
function isSheetsConfigured() {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SHARED_SECRET;
  return typeof url === "string" && url.startsWith("https://script.google.com/macros/s/") && typeof secret === "string" && secret.trim().length >= 8 && !secret.includes("placeholder");
}
var SheetsClient = {
  isConfigured() {
    return isSheetsConfigured();
  },
  async callAppsScript(action, payload = {}) {
    if (!isSheetsConfigured()) {
      return { success: false, fallback: true, error: "Google Apps Script URL is not configured" };
    }
    const scriptUrl = process.env.APPS_SCRIPT_URL.trim();
    const sharedSecret = process.env.APPS_SCRIPT_SHARED_SECRET.trim();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9e3);
      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: sharedSecret,
          action,
          payload,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }),
        redirect: "follow",
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`Apps Script responded with HTTP status ${response.status}`);
      }
      const result = await response.json();
      return result;
    } catch (err) {
      console.warn(`Apps Script invocation [${action}] failed:`, err?.message || err);
      return {
        success: false,
        error: err?.message || "Apps Script request failed",
        fallback: true
      };
    }
  },
  // 1. Synchronize registered user to the Users sheet
  async syncUser(userData) {
    if (!isSheetsConfigured()) {
      return { success: false, error: "Apps Script not configured" };
    }
    const res = await this.callAppsScript("syncUser", userData);
    return { success: !!res?.success, error: res?.error };
  },
  // 2. List published courses
  async listCourses(includeUnpublished = false) {
    if (isSheetsConfigured()) {
      const res = await this.callAppsScript("listCourses", { includeUnpublished });
      if (res && res.success && Array.isArray(res.courses) && res.courses.length > 0) {
        return res.courses;
      }
    }
    return COURSES_DATA.map((c) => ({
      courseId: c.id,
      title: c.title.hi,
      titleEn: c.title.en,
      description: c.shortDescription.hi,
      descriptionEn: c.shortDescription.en,
      category: c.category,
      language: "hi,en",
      thumbnailUrl: c.thumbnail,
      published: true,
      lessonsCount: c.lessons.length,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      createdBy: "System Seed"
    }));
  },
  // 3. Get course detail with lessons
  async getCourse(courseId) {
    if (isSheetsConfigured()) {
      const res = await this.callAppsScript("getCourse", { courseId });
      if (res && res.success && res.course) {
        return res;
      }
    }
    const local = COURSES_DATA.find((c) => c.id === courseId);
    if (!local) return null;
    return {
      success: true,
      course: {
        courseId: local.id,
        title: local.title.hi,
        titleEn: local.title.en,
        description: local.fullDescription.hi,
        descriptionEn: local.fullDescription.en,
        category: local.category,
        language: "hi,en",
        thumbnailUrl: local.thumbnail,
        published: true,
        createdBy: "System Seed"
      },
      lessons: local.lessons.map((l) => ({
        lessonId: l.id,
        courseId: local.id,
        title: l.title.hi,
        titleEn: l.title.en,
        description: l.summary.hi,
        order: l.order,
        driveFileId: "",
        videoUrl: "",
        duration: `${l.durationMinutes} min`,
        published: true,
        content: l.content
      })),
      quiz: local.quiz
    };
  },
  // 4. Admin CRUD Operations for Courses
  async createCourse(data) {
    return this.callAppsScript("createCourse", data);
  },
  async updateCourse(courseId, data) {
    return this.callAppsScript("updateCourse", { courseId, ...data });
  },
  async deleteCourse(courseId) {
    return this.callAppsScript("deleteCourse", { courseId });
  },
  // 5. Admin CRUD Operations for Lessons
  async createLesson(data) {
    return this.callAppsScript("createLesson", data);
  },
  async updateLesson(lessonId, data) {
    return this.callAppsScript("updateLesson", { lessonId, ...data });
  },
  async deleteLesson(lessonId) {
    return this.callAppsScript("deleteLesson", { lessonId });
  },
  // 6. Enrollments in Sheets
  async recordEnrollment(data) {
    return this.callAppsScript("recordEnrollment", data);
  },
  // 7. Email Announcements via MailApp / GmailApp
  async previewEmail(recipientGroup) {
    return this.callAppsScript("previewEmail", { recipientGroup });
  },
  async sendEmailAnnouncement(campaign) {
    return this.callAppsScript("sendEmailAnnouncement", campaign);
  },
  async getEmailLogs() {
    const res = await this.callAppsScript("getEmailLogs");
    return res?.success && Array.isArray(res.logs) ? res.logs : [];
  },
  // 8. Activity Logs in Sheets
  async logActivity(data) {
    await this.callAppsScript("logActivity", {
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  },
  async getActivityLogs() {
    const res = await this.callAppsScript("getActivityLogs");
    return res?.success && Array.isArray(res.logs) ? res.logs : [];
  },
  // 9. Stats Aggregate
  async getStats() {
    return this.callAppsScript("getStats");
  }
};

// src/server/email/brevo.ts
import dotenv2 from "dotenv";
dotenv2.config();
var BrevoClient = class {
  static {
    this.API_BASE = "https://api.brevo.com/v3";
  }
  /**
   * Safely inspect configured Brevo environment parameters without exposing secret key
   */
  static getConfig() {
    const rawKey = process.env.BREVO_API_KEY || "";
    const hasKey = typeof rawKey === "string" && rawKey.trim().length > 10;
    const keyPreview = hasKey ? `${rawKey.trim().substring(0, 7)}...${rawKey.trim().slice(-4)}` : "NONE";
    return {
      isConfigured: hasKey,
      keyPreview,
      senderName: (process.env.BREVO_SENDER_NAME || "Authentication of SakhiBiz").trim(),
      senderEmail: (process.env.BREVO_SENDER_EMAIL || "authentication@sakhibiz.xyz").toLowerCase().trim()
    };
  }
  /**
   * Send a transactional email via Brevo REST API v3
   */
  static async sendTransactionalEmail(options) {
    const config = this.getConfig();
    if (!config.isConfigured) {
      console.warn("[Brevo] BREVO_API_KEY is not configured in server environment.");
      return {
        success: false,
        statusCode: 503,
        error: "Brevo API key is not configured on the server (BREVO_API_KEY missing).",
        errorCode: "PROVIDER_NOT_CONFIGURED",
        diagnostics: "Please add BREVO_API_KEY to your server-side environment variables."
      };
    }
    const apiKey = process.env.BREVO_API_KEY.trim();
    const payload = {
      sender: {
        name: config.senderName,
        email: config.senderEmail
      },
      to: options.to.map((recipient) => ({
        email: recipient.email.toLowerCase().trim(),
        name: recipient.name || "Recipient"
      })),
      subject: options.subject,
      htmlContent: options.htmlContent,
      textContent: options.textContent || void 0,
      tags: options.tags || ["sakhibiz-auth"]
    };
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12e3);
      const response = await fetch(`${this.API_BASE}/smtp/email`, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const responseText = await response.text();
      let responseBody = {};
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = { raw: responseText };
      }
      if (response.status === 201 || response.ok && responseBody.messageId) {
        const messageId = responseBody.messageId || "ACCEPTED_NO_ID";
        console.log(`[Brevo] Transactional email queued successfully: HTTP 201, messageId=${messageId}`);
        return {
          success: true,
          messageId,
          statusCode: response.status,
          diagnostics: `Email accepted by Brevo API. Enqueued with messageId: ${messageId}`
        };
      }
      const errCode = responseBody.code || `HTTP_${response.status}`;
      const errMsg = responseBody.message || responseText || "Unknown Brevo API error";
      let diagnosticNote = "Brevo rejected the transactional dispatch.";
      if (response.status === 401) {
        diagnosticNote = "HTTP 401 Unauthorized: The BREVO_API_KEY is invalid or lacks transactional email permissions.";
      } else if (response.status === 400 && responseBody.code === "unauthorized_sender") {
        diagnosticNote = `HTTP 400 unauthorized_sender: The sender email "${config.senderEmail}" is not verified in your Brevo account under Senders & IPs.`;
      } else if (response.status === 400) {
        diagnosticNote = `HTTP 400 Bad Request: Check recipient email validity and payload parameters (${errMsg}).`;
      } else if (response.status === 402) {
        diagnosticNote = "HTTP 402 Payment Required: Transactional email credit limit reached in your Brevo account.";
      } else if (response.status === 403) {
        diagnosticNote = "HTTP 403 Forbidden: Transactional email sending is disabled or under review for this Brevo account.";
      }
      console.error(`[Brevo API Error] Status: ${response.status}, Code: ${errCode}, Message: ${errMsg}`);
      return {
        success: false,
        statusCode: response.status,
        errorCode: errCode,
        error: errMsg,
        diagnostics: diagnosticNote
      };
    } catch (networkErr) {
      const isTimeout = networkErr.name === "AbortError";
      const msg = isTimeout ? "Brevo API request timed out (12s)" : networkErr.message || "Network error";
      console.error("[Brevo Network Error]:", msg);
      return {
        success: false,
        statusCode: isTimeout ? 504 : 500,
        errorCode: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
        error: msg,
        diagnostics: "Failed to establish connection to https://api.brevo.com."
      };
    }
  }
  /**
   * Diagnostic: Fetch verified senders list from Brevo
   * Verifies if admin@sakhibiz.xyz exists and is verified
   */
  static async getSendersList() {
    const config = this.getConfig();
    if (!config.isConfigured) {
      return { success: false, senders: [], isSenderAuthorized: false, error: "BREVO_API_KEY is not configured." };
    }
    try {
      const response = await fetch(`${this.API_BASE}/senders`, {
        method: "GET",
        headers: {
          "api-key": process.env.BREVO_API_KEY.trim(),
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        const errBody = await response.text();
        return {
          success: false,
          senders: [],
          isSenderAuthorized: false,
          error: `HTTP ${response.status}: ${errBody}`
        };
      }
      const data = await response.json();
      const senders = Array.isArray(data.senders) ? data.senders : [];
      const match = senders.find(
        (s) => s.email.toLowerCase().trim() === config.senderEmail && s.active === true
      );
      return {
        success: true,
        senders,
        isSenderAuthorized: !!match
      };
    } catch (err) {
      return {
        success: false,
        senders: [],
        isSenderAuthorized: false,
        error: err.message || "Failed to fetch senders from Brevo"
      };
    }
  }
  /**
   * Diagnostic: Check Brevo account plan, credits, and transactional activation
   */
  static async getAccountInfo() {
    const config = this.getConfig();
    if (!config.isConfigured) {
      return { success: false, error: "BREVO_API_KEY is not configured." };
    }
    try {
      const response = await fetch(`${this.API_BASE}/account`, {
        method: "GET",
        headers: {
          "api-key": process.env.BREVO_API_KEY.trim(),
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        const errBody = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errBody}` };
      }
      const data = await response.json();
      return { success: true, account: data };
    } catch (err) {
      return { success: false, error: err.message || "Failed to fetch account info from Brevo" };
    }
  }
  /**
   * Diagnostic: Query actual email delivery events (delivered, bounced, spam, blocked)
   * Essential to distinguish API acceptance from actual inbox delivery!
   */
  static async getDeliveryEvents(recipientEmail, limit = 10) {
    const config = this.getConfig();
    if (!config.isConfigured) {
      return { success: false, events: [], error: "BREVO_API_KEY is not configured." };
    }
    try {
      const url = new URL(`${this.API_BASE}/smtp/statistics/events`);
      url.searchParams.set("limit", limit.toString());
      if (recipientEmail) {
        url.searchParams.set("email", recipientEmail.toLowerCase().trim());
      }
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "api-key": process.env.BREVO_API_KEY.trim(),
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        const errBody = await response.text();
        return { success: false, events: [], error: `HTTP ${response.status}: ${errBody}` };
      }
      const data = await response.json();
      return { success: true, events: data.events || [] };
    } catch (err) {
      return { success: false, events: [], error: err.message || "Failed to fetch delivery events" };
    }
  }
};

// src/server/email/templates.ts
function generateOtpEmail(options) {
  const {
    otp,
    recipientName = "\u0909\u0926\u094D\u092F\u092E\u0940 (Entrepreneur)",
    purpose,
    expiryMinutes = 5,
    senderEmail = process.env.BREVO_SENDER_EMAIL || "authentication@sakhibiz.xyz"
  } = options;
  const isReset = purpose === "RESET_PASSWORD";
  const subject = isReset ? `[SakhiBiz] \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0930\u0940\u0938\u0947\u091F \u0915\u094B\u0921 (Password Reset Code): ${otp}` : `[SakhiBiz] \u0908\u092E\u0947\u0932 \u0938\u0924\u094D\u092F\u093E\u092A\u0928 \u0915\u094B\u0921 (Email Verification Code): ${otp}`;
  const titleHi = isReset ? "\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0930\u0940\u0938\u0947\u091F \u0905\u0928\u0941\u0930\u094B\u0927" : "\u0938\u0916\u0940\u092C\u093F\u091C\u093C \u092E\u0947\u0902 \u0906\u092A\u0915\u093E \u0938\u094D\u0935\u093E\u0917\u0924 \u0939\u0948!";
  const titleEn = isReset ? "Password Reset Request" : "Welcome to SakhiBiz!";
  const descriptionHi = isReset ? "\u0906\u092A\u0928\u0947 \u0905\u092A\u0928\u0947 \u0938\u0916\u0940\u092C\u093F\u091C\u093C \u0916\u093E\u0924\u0947 \u0915\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0930\u0940\u0938\u0947\u091F \u0915\u0930\u0928\u0947 \u0915\u093E \u0905\u0928\u0941\u0930\u094B\u0927 \u0915\u093F\u092F\u093E \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u0928\u0940\u091A\u0947 \u0926\u093F\u090F \u0917\u090F 6-\u0905\u0902\u0915\u0940\u092F \u0938\u0924\u094D\u092F\u093E\u092A\u0928 \u0915\u094B\u0921 (OTP) \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0947\u0902:" : "\u0938\u0916\u0940\u092C\u093F\u091C\u093C \u092E\u0939\u093F\u0932\u093E \u0909\u0926\u094D\u092F\u092E\u093F\u0924\u093E \u092E\u0902\u091A \u092A\u0930 \u0906\u092A\u0915\u093E \u0938\u094D\u0935\u093E\u0917\u0924 \u0939\u0948\u0964 \u0905\u092A\u0928\u0947 \u0908\u092E\u0947\u0932 \u092A\u0924\u0947 \u0915\u0940 \u092A\u0941\u0937\u094D\u091F\u093F \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0928\u0940\u091A\u0947 \u0926\u093F\u090F \u0917\u090F 6-\u0905\u0902\u0915\u0940\u092F \u0938\u0924\u094D\u092F\u093E\u092A\u0928 \u0915\u094B\u0921 (OTP) \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0947\u0902:";
  const descriptionEn = isReset ? "We received a request to reset your SakhiBiz account password. Please use the 6-digit verification code below:" : "Welcome to the SakhiBiz women entrepreneurship platform. Please use the 6-digit verification code below to verify your email address:";
  const warningHi = isReset ? "\u092F\u0926\u093F \u0906\u092A\u0928\u0947 \u092F\u0939 \u0905\u0928\u0941\u0930\u094B\u0927 \u0928\u0939\u0940\u0902 \u0915\u093F\u092F\u093E \u0925\u093E, \u0924\u094B \u0915\u0943\u092A\u092F\u093E \u0907\u0938 \u0908\u092E\u0947\u0932 \u0915\u094B \u0905\u0928\u0926\u0947\u0916\u093E \u0915\u0930\u0947\u0902\u0964 \u0906\u092A\u0915\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0930\u0939\u0947\u0917\u093E\u0964" : "\u092F\u0926\u093F \u0906\u092A\u0928\u0947 \u092F\u0939 \u0916\u093E\u0924\u093E \u0928\u0939\u0940\u0902 \u092C\u0928\u093E\u092F\u093E \u0925\u093E, \u0924\u094B \u0915\u0943\u092A\u092F\u093E \u0907\u0938 \u0908\u092E\u0947\u0932 \u0915\u094B \u0905\u0928\u0926\u0947\u0916\u093E \u0915\u0930\u0947\u0902\u0964";
  const warningEn = isReset ? "If you did not make this request, please ignore this email. Your password will remain secure." : "If you did not create this account, please disregard this email.";
  const html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f7f9f6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2D3748;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      background-color: #f7f9f6;
      padding: 30px 15px;
    }
    .card {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px rgba(24, 57, 43, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #18392B 0%, #2D5A47 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .brand-name {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
      color: #F4F1DE;
    }
    .brand-tagline {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 6px;
      color: #ffffff;
      font-weight: 500;
    }
    .body {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #18392B;
      margin-bottom: 12px;
    }
    .text-p {
      font-size: 14px;
      color: #4A5568;
      margin-bottom: 12px;
    }
    .otp-container {
      margin: 28px 0;
      text-align: center;
      background-color: #FDFBF7;
      border: 2px dashed #E07A5F;
      border-radius: 16px;
      padding: 24px 16px;
    }
    .otp-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #E07A5F;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 10px;
      color: #18392B;
      padding-left: 10px;
      display: inline-block;
    }
    .expiry-note {
      font-size: 12px;
      color: #718096;
      margin-top: 10px;
    }
    .expiry-badge {
      display: inline-block;
      background-color: #FFF5F2;
      color: #C53030;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
    }
    .security-notice {
      background-color: #F8FAFC;
      border-left: 4px solid #18392B;
      padding: 14px 16px;
      border-radius: 0 10px 10px 0;
      font-size: 12px;
      color: #4A5568;
      margin-top: 24px;
    }
    .footer {
      background-color: #FAFAFA;
      padding: 20px 24px;
      text-align: center;
      border-top: 1px solid #EDF2F7;
      font-size: 11px;
      color: #A0AEC0;
    }
    .footer a {
      color: #18392B;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="brand-name">SakhiBiz \u2022 \u0938\u0916\u0940\u092C\u093F\u091C\u093C</h1>
        <div class="brand-tagline">\u092E\u0939\u093F\u0932\u093E \u0909\u0926\u094D\u092F\u092E\u093F\u0924\u093E \u0914\u0930 \u0921\u093F\u091C\u093F\u091F\u0932 \u0915\u094C\u0936\u0932 \u092E\u0902\u091A</div>
      </div>
      <div class="body">
        <div class="greeting">\u0928\u092E\u0938\u094D\u0924\u0947, ${recipientName}</div>
        <div class="text-p"><strong>${titleHi}</strong></div>
        <div class="text-p">${descriptionHi}</div>
        <div class="text-p" style="font-size: 13px; color: #718096;"><em>${descriptionEn}</em></div>

        <div class="otp-container">
          <div class="otp-label">\u0906\u092A\u0915\u093E \u0938\u0924\u094D\u092F\u093E\u092A\u0928 \u0915\u094B\u0921 \u2022 Your OTP Code</div>
          <div class="otp-code">${otp}</div>
          <div class="expiry-note">
            <span class="expiry-badge">\u23F1\uFE0F ${expiryMinutes} \u092E\u093F\u0928\u091F \u0915\u0947 \u0932\u093F\u090F \u092E\u093E\u0928\u094D\u092F (Valid for ${expiryMinutes} min)</span>
          </div>
        </div>

        <div class="security-notice">
          <strong>\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0928\u093F\u0930\u094D\u0926\u0947\u0936 (Security Notice):</strong>
          <ul style="margin: 6px 0 0 18px; padding: 0;">
            <li>\u092F\u0939 \u0915\u094B\u0921 \u0915\u093F\u0938\u0940 \u0915\u0947 \u0938\u093E\u0925 \u0938\u093E\u091D\u093E \u0928 \u0915\u0930\u0947\u0902 (Do not share this code).</li>
            <li>\u0938\u0916\u0940\u092C\u093F\u091C\u093C \u091F\u0940\u092E \u0906\u092A\u0938\u0947 \u0915\u092D\u0940 \u0906\u092A\u0915\u093E OTP \u0928\u0939\u0940\u0902 \u092E\u093E\u0902\u0917\u0947\u0917\u0940\u0964</li>
            <li>${warningHi}</li>
            <li><em>${warningEn}</em></li>
          </ul>
        </div>
      </div>
      <div class="footer">
        <div>\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} SakhiBiz Platform. All rights reserved.</div>
        <div style="margin-top: 4px;">SakhiBiz Grassroots Entrepreneurship \u2022 contact: ${senderEmail}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  const text = `SakhiBiz \u2022 \u0938\u0916\u0940\u092C\u093F\u091C\u093C
======================================
\u0928\u092E\u0938\u094D\u0924\u0947, ${recipientName}

${titleHi} / ${titleEn}
${descriptionHi}

>> \u0906\u092A\u0915\u093E \u0938\u0924\u094D\u092F\u093E\u092A\u0928 \u0915\u094B\u0921 (OTP): ${otp} <<

\u0935\u0948\u0927\u0924\u093E: \u092F\u0939 \u0915\u094B\u0921 ${expiryMinutes} \u092E\u093F\u0928\u091F \u0915\u0947 \u0932\u093F\u090F \u0935\u0948\u0927 \u0939\u0948 (Valid for ${expiryMinutes} minutes).

\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0928\u093F\u0930\u094D\u0926\u0947\u0936:
- \u092F\u0939 OTP \u0915\u093F\u0938\u0940 \u0915\u0947 \u0938\u093E\u0925 \u092D\u0940 \u0938\u093E\u091D\u093E \u0928 \u0915\u0930\u0947\u0902\u0964
- \u0938\u0916\u0940\u092C\u093F\u091C\u093C \u091F\u0940\u092E \u0906\u092A\u0938\u0947 \u0915\u092D\u0940 OTP \u0928\u0939\u0940\u0902 \u092E\u093E\u0902\u0917\u0924\u0940\u0964
- ${warningHi}

SakhiBiz Platform \u2014 ${senderEmail}
`;
  return { subject, html, text };
}

// src/server/auth/otp.ts
import crypto from "crypto";
var OTP_CONFIG = {
  LENGTH: 6,
  EXPIRATION_MS: 5 * 60 * 1e3,
  // 5 minutes
  COOLDOWN_MS: 60 * 1e3,
  // 60 seconds
  MAX_ATTEMPTS: 5
};
function generateSecureOtp() {
  const num = crypto.randomInt(1e5, 1e6);
  return num.toString();
}
function hashOtp(otp) {
  const secret = getJwtSecret();
  return crypto.createHmac("sha256", secret).update(otp.trim()).digest("hex");
}
function verifyOtpHash(candidateOtp, storedHash) {
  if (!candidateOtp || !storedHash) return false;
  const candidateHash = hashOtp(candidateOtp);
  try {
    const bufA = Buffer.from(candidateHash, "hex");
    const bufB = Buffer.from(storedHash, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
function createOtpPackage() {
  const plainOtp = generateSecureOtp();
  const hashedOtp = hashOtp(plainOtp);
  const now = Date.now();
  return {
    plainOtp,
    hashedOtp,
    expiresAt: new Date(now + OTP_CONFIG.EXPIRATION_MS),
    cooldownUntil: new Date(now + OTP_CONFIG.COOLDOWN_MS)
  };
}
function checkResendCooldown(lastSentAt) {
  if (!lastSentAt) {
    return { allowed: true, secondsRemaining: 0 };
  }
  const elapsedMs = Date.now() - new Date(lastSentAt).getTime();
  if (elapsedMs >= OTP_CONFIG.COOLDOWN_MS) {
    return { allowed: true, secondsRemaining: 0 };
  }
  const secondsRemaining = Math.ceil((OTP_CONFIG.COOLDOWN_MS - elapsedMs) / 1e3);
  return { allowed: false, secondsRemaining };
}
function evaluateOtpAttempt(candidateOtp, storedHash, expiresAt, currentAttempts = 0) {
  const attempts = currentAttempts || 0;
  if (attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
    return {
      isValid: false,
      isExpired: false,
      isExhausted: true,
      remainingAttempts: 0,
      reason: "Maximum verification attempts exceeded. Please request a new code."
    };
  }
  if (!expiresAt || new Date(expiresAt).getTime() < Date.now()) {
    return {
      isValid: false,
      isExpired: true,
      isExhausted: false,
      remainingAttempts: Math.max(0, OTP_CONFIG.MAX_ATTEMPTS - attempts),
      reason: "The verification code has expired. Please request a new code."
    };
  }
  const isMatch = verifyOtpHash(candidateOtp, storedHash);
  if (isMatch) {
    return {
      isValid: true,
      isExpired: false,
      isExhausted: false,
      remainingAttempts: OTP_CONFIG.MAX_ATTEMPTS - attempts
    };
  }
  const newAttempts = attempts + 1;
  const remaining = Math.max(0, OTP_CONFIG.MAX_ATTEMPTS - newAttempts);
  return {
    isValid: false,
    isExpired: false,
    isExhausted: newAttempts >= OTP_CONFIG.MAX_ATTEMPTS,
    remainingAttempts: remaining,
    reason: remaining > 0 ? `Incorrect code. ${remaining} attempt(s) remaining.` : "Maximum attempts exceeded. Please request a new verification code."
  };
}

// src/server/auth/rateLimiter.ts
var MemoryRateLimiter = class {
  constructor(windowMs, maxRequests, keyPrefix = "rl") {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.keyPrefix = keyPrefix;
    this.records = /* @__PURE__ */ new Map();
    setInterval(() => this.cleanup(), 5 * 60 * 1e3).unref();
  }
  getKey(identifier) {
    return `${this.keyPrefix}:${identifier.toLowerCase().trim()}`;
  }
  check(identifier) {
    const key = this.getKey(identifier);
    const now = Date.now();
    const record = this.records.get(key);
    if (!record || now >= record.resetAt) {
      this.records.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1, resetInSeconds: Math.ceil(this.windowMs / 1e3) };
    }
    if (record.count >= this.maxRequests) {
      const resetInSeconds2 = Math.max(1, Math.ceil((record.resetAt - now) / 1e3));
      return { allowed: false, remaining: 0, resetInSeconds: resetInSeconds2 };
    }
    record.count += 1;
    const remaining = this.maxRequests - record.count;
    const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1e3));
    return { allowed: true, remaining, resetInSeconds };
  }
  reset(identifier) {
    this.records.delete(this.getKey(identifier));
  }
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now >= record.resetAt) {
        this.records.delete(key);
      }
    }
  }
};
var authIpLimiter = new MemoryRateLimiter(5 * 60 * 1e3, 20, "auth_ip");
var otpEmailLimiter = new MemoryRateLimiter(10 * 60 * 1e3, 5, "otp_email");
var passwordResetLimiter = new MemoryRateLimiter(15 * 60 * 1e3, 4, "pw_reset");
function createRateLimitMiddleware(limiter, keyExtractor, errorMessage = "Too many requests. Please slow down and try again later.") {
  return (req, res, next) => {
    if (process.env.NODE_ENV === "test" && req.headers["x-test-bypass-ratelimit"]) {
      return next();
    }
    const key = keyExtractor(req);
    const { allowed, remaining, resetInSeconds } = limiter.check(key);
    res.setHeader("X-RateLimit-Remaining", remaining.toString());
    res.setHeader("X-RateLimit-Reset", resetInSeconds.toString());
    if (!allowed) {
      return res.status(429).json({
        error: "RATE_LIMIT_EXCEEDED",
        message: `${errorMessage} (Retry in ${resetInSeconds}s)`,
        retryAfterSeconds: resetInSeconds
      });
    }
    next();
  };
}

// src/server/routes/auth.ts
var router = Router();
function sanitizeUser(user) {
  return {
    userId: user.userId,
    email: user.normalizedEmail,
    name: user.name,
    role: user.role,
    accountStatus: user.accountStatus,
    emailVerified: Boolean(user.emailVerified),
    businessCategory: user.businessCategory,
    businessStage: user.businessStage,
    location: user.location,
    language: user.language,
    createdAt: user.createdAt
  };
}
router.post(
  "/register",
  createRateLimitMiddleware(authIpLimiter, (req) => req.ip || "ip", "Too many registration requests from this network."),
  async (req, res) => {
    try {
      const { email, password, name, businessCategory, location, language = "hi" } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "A valid email address is required." });
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long." });
      }
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Full name is required." });
      }
      const normalizedEmail = email.toLowerCase().trim();
      if (!isMongoConfigured()) {
        return res.status(503).json({
          error: "MongoDB Atlas is not configured. Please supply MONGODB_URI in your environment variables."
        });
      }
      await connectMongo();
      const existing = await User.findOne({ normalizedEmail });
      if (existing) {
        return res.status(409).json({ error: "An account with this email address already exists." });
      }
      const passwordHash = await bcrypt2.hash(password, 10);
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const isInitialAdmin = checkIsInitialAdmin(normalizedEmail);
      const role = isInitialAdmin ? "ADMIN" : "USER";
      const otpPkg = createOtpPackage();
      const newUser = await User.create({
        userId,
        normalizedEmail,
        passwordHash,
        name: name.trim(),
        role,
        accountStatus: "ACTIVE",
        emailVerified: isInitialAdmin,
        // Bootstrap admin is auto-verified
        otpHash: isInitialAdmin ? void 0 : otpPkg.hashedOtp,
        otpExpiresAt: isInitialAdmin ? void 0 : otpPkg.expiresAt,
        otpAttempts: 0,
        otpLastSentAt: isInitialAdmin ? void 0 : /* @__PURE__ */ new Date(),
        otpPurpose: isInitialAdmin ? void 0 : "VERIFY_EMAIL",
        businessCategory: businessCategory || "textiles_tailoring",
        businessStage: "starting",
        location: location || "India",
        language: ["hi", "en", "mr", "bn", "ta", "te", "gu", "kn"].includes(language) ? language : "hi",
        sheetsSynced: false,
        lastLoginAt: /* @__PURE__ */ new Date()
      });
      if (SheetsClient.isConfigured()) {
        SheetsClient.syncUser({
          userId,
          normalizedEmail,
          registeredAt: newUser.createdAt.toISOString(),
          accountStatus: "ACTIVE",
          emailVerified: newUser.emailVerified
        }).then(async (syncRes) => {
          if (syncRes.success) {
            newUser.sheetsSynced = true;
            newUser.sheetsSyncedAt = /* @__PURE__ */ new Date();
            await newUser.save();
          }
        }).catch((syncErr) => {
          console.warn("Background Sheets sync deferred:", syncErr?.message || syncErr);
        });
      }
      if (isInitialAdmin) {
        const token = signToken({
          userId: newUser.userId,
          email: newUser.normalizedEmail,
          role: newUser.role,
          name: newUser.name
        });
        setAuthCookie(res, token);
        return res.status(201).json({
          success: true,
          requireVerification: false,
          user: sanitizeUser(newUser)
        });
      }
      const emailContent = generateOtpEmail({
        otp: otpPkg.plainOtp,
        recipientName: newUser.name,
        purpose: "VERIFY_EMAIL",
        expiryMinutes: 5
      });
      const brevoResult = await BrevoClient.sendTransactionalEmail({
        to: [{ email: newUser.normalizedEmail, name: newUser.name }],
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text,
        tags: ["sakhibiz-verify-email"]
      });
      const isDevOrTest = process.env.NODE_ENV !== "production";
      return res.status(201).json({
        success: true,
        requireVerification: true,
        email: newUser.normalizedEmail,
        message: "Account created. Please check your email for the 6-digit verification code.",
        delivery: {
          provider: "brevo",
          status: brevoResult.success ? "queued" : "deferred",
          messageId: brevoResult.messageId,
          diagnostics: brevoResult.diagnostics,
          // Exposed ONLY in test/dev environments for test runner validation
          ...isDevOrTest && { devOtpPreview: otpPkg.plainOtp }
        }
      });
    } catch (err) {
      console.error("Registration failure:", err?.message || err);
      return res.status(500).json({ error: "An unexpected error occurred during registration." });
    }
  }
);
router.post(
  "/verify-email",
  createRateLimitMiddleware(authIpLimiter, (req) => req.ip || "ip", "Too many verification attempts."),
  async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || typeof email !== "string" || !otp || typeof otp !== "string") {
        return res.status(400).json({ error: "Email and 6-digit verification code are required." });
      }
      const normalizedEmail = email.toLowerCase().trim();
      const candidateOtp = otp.toString().trim();
      if (!isMongoConfigured()) {
        return res.status(503).json({ error: "MongoDB Atlas is not configured." });
      }
      await connectMongo();
      const user = await User.findOne({ normalizedEmail }).select("+otpHash");
      if (!user) {
        return res.status(400).json({ error: "Invalid verification request." });
      }
      if (user.emailVerified) {
        const token2 = signToken({
          userId: user.userId,
          email: user.normalizedEmail,
          role: user.role,
          name: user.name
        });
        setAuthCookie(res, token2);
        return res.status(200).json({
          success: true,
          message: "Email is already verified.",
          alreadyVerified: true,
          user: sanitizeUser(user)
        });
      }
      if (user.otpPurpose !== "VERIFY_EMAIL") {
        return res.status(400).json({
          error: "INVALID_PURPOSE",
          message: "No active email verification request found. Please request a new code."
        });
      }
      const evalResult = evaluateOtpAttempt(
        candidateOtp,
        user.otpHash,
        user.otpExpiresAt,
        user.otpAttempts
      );
      if (!evalResult.isValid) {
        user.otpAttempts = (user.otpAttempts || 0) + 1;
        if (evalResult.isExhausted) {
          user.otpHash = void 0;
        }
        await user.save();
        return res.status(400).json({
          error: "INVALID_OTP",
          message: evalResult.reason,
          remainingAttempts: evalResult.remainingAttempts,
          isExhausted: evalResult.isExhausted,
          isExpired: evalResult.isExpired
        });
      }
      user.emailVerified = true;
      user.otpHash = void 0;
      user.otpExpiresAt = void 0;
      user.otpAttempts = 0;
      user.otpPurpose = void 0;
      user.lastLoginAt = /* @__PURE__ */ new Date();
      await user.save();
      if (SheetsClient.isConfigured()) {
        SheetsClient.syncUser({
          userId: user.userId,
          normalizedEmail: user.normalizedEmail,
          registeredAt: user.createdAt.toISOString(),
          accountStatus: user.accountStatus,
          emailVerified: true
        }).catch((err) => console.warn("Sheets update deferred:", err?.message || err));
      }
      const token = signToken({
        userId: user.userId,
        email: user.normalizedEmail,
        role: user.role,
        name: user.name
      });
      setAuthCookie(res, token);
      return res.status(200).json({
        success: true,
        message: "Email verified successfully! Welcome to SakhiBiz.",
        user: sanitizeUser(user)
      });
    } catch (err) {
      console.error("Email verification error:", err?.message || err);
      return res.status(500).json({ error: "Failed to verify email address." });
    }
  }
);
router.post(
  "/resend-otp",
  createRateLimitMiddleware(otpEmailLimiter, (req) => req.body?.email || req.ip || "key", "Too many code requests."),
  async (req, res) => {
    try {
      const { email, purpose = "VERIFY_EMAIL" } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Valid email address is required." });
      }
      const targetPurpose = purpose === "RESET_PASSWORD" ? "RESET_PASSWORD" : "VERIFY_EMAIL";
      const normalizedEmail = email.toLowerCase().trim();
      if (!isMongoConfigured()) {
        return res.status(503).json({ error: "MongoDB Atlas is not configured." });
      }
      await connectMongo();
      const user = await User.findOne({ normalizedEmail }).select("+otpHash");
      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If an account exists with this email, a new verification code has been sent."
        });
      }
      if (targetPurpose === "VERIFY_EMAIL" && user.emailVerified) {
        return res.status(200).json({
          success: true,
          message: "This email is already verified. You may proceed to sign in.",
          alreadyVerified: true
        });
      }
      const bypass = req.headers["x-test-bypass-ratelimit"] === "1";
      if (!bypass) {
        const cooldown = checkResendCooldown(user.otpLastSentAt);
        if (!cooldown.allowed) {
          return res.status(429).json({
            error: "COOLDOWN_ACTIVE",
            message: `Please wait ${cooldown.secondsRemaining} seconds before requesting a new code.`,
            secondsRemaining: cooldown.secondsRemaining
          });
        }
      }
      const otpPkg = createOtpPackage();
      user.otpHash = otpPkg.hashedOtp;
      user.otpExpiresAt = otpPkg.expiresAt;
      user.otpAttempts = 0;
      user.otpLastSentAt = /* @__PURE__ */ new Date();
      user.otpPurpose = targetPurpose;
      await user.save();
      const emailContent = generateOtpEmail({
        otp: otpPkg.plainOtp,
        recipientName: user.name,
        purpose: targetPurpose,
        expiryMinutes: 5
      });
      const brevoResult = await BrevoClient.sendTransactionalEmail({
        to: [{ email: user.normalizedEmail, name: user.name }],
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text,
        tags: [targetPurpose === "RESET_PASSWORD" ? "sakhibiz-reset-password" : "sakhibiz-verify-email"]
      });
      const isDevOrTest = process.env.NODE_ENV !== "production";
      return res.status(200).json({
        success: true,
        message: "A new verification code has been sent to your email.",
        delivery: {
          provider: "brevo",
          status: brevoResult.success ? "queued" : "deferred",
          messageId: brevoResult.messageId,
          diagnostics: brevoResult.diagnostics,
          ...isDevOrTest && { devOtpPreview: otpPkg.plainOtp }
        }
      });
    } catch (err) {
      console.error("Resend OTP error:", err?.message || err);
      return res.status(500).json({ error: "Failed to resend verification code." });
    }
  }
);
router.post(
  "/forgot-password",
  createRateLimitMiddleware(passwordResetLimiter, (req) => req.body?.email || req.ip || "key", "Too many password reset requests."),
  async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "A valid email address is required." });
      }
      const normalizedEmail = email.toLowerCase().trim();
      if (!isMongoConfigured()) {
        return res.status(503).json({ error: "MongoDB Atlas is not configured." });
      }
      await connectMongo();
      const user = await User.findOne({ normalizedEmail }).select("+otpHash");
      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If an account exists with this email, a 6-digit password reset code has been sent."
        });
      }
      const bypass = req.headers["x-test-bypass-ratelimit"] === "1";
      if (!bypass && user.otpPurpose === "RESET_PASSWORD") {
        const cooldown = checkResendCooldown(user.otpLastSentAt);
        if (!cooldown.allowed) {
          return res.status(429).json({
            error: "COOLDOWN_ACTIVE",
            message: `Please wait ${cooldown.secondsRemaining} seconds before requesting another code.`,
            secondsRemaining: cooldown.secondsRemaining
          });
        }
      }
      const otpPkg = createOtpPackage();
      user.otpHash = otpPkg.hashedOtp;
      user.otpExpiresAt = otpPkg.expiresAt;
      user.otpAttempts = 0;
      user.otpLastSentAt = /* @__PURE__ */ new Date();
      user.otpPurpose = "RESET_PASSWORD";
      await user.save();
      const emailContent = generateOtpEmail({
        otp: otpPkg.plainOtp,
        recipientName: user.name,
        purpose: "RESET_PASSWORD",
        expiryMinutes: 5
      });
      const brevoResult = await BrevoClient.sendTransactionalEmail({
        to: [{ email: user.normalizedEmail, name: user.name }],
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text,
        tags: ["sakhibiz-reset-password"]
      });
      const isDevOrTest = process.env.NODE_ENV !== "production";
      return res.status(200).json({
        success: true,
        message: "If an account exists with this email, a 6-digit password reset code has been sent.",
        delivery: {
          provider: "brevo",
          status: brevoResult.success ? "queued" : "deferred",
          messageId: brevoResult.messageId,
          diagnostics: brevoResult.diagnostics,
          ...isDevOrTest && { devOtpPreview: otpPkg.plainOtp }
        }
      });
    } catch (err) {
      console.error("Forgot password error:", err?.message || err);
      return res.status(500).json({ error: "Failed to process password reset request." });
    }
  }
);
router.post(
  "/reset-password",
  createRateLimitMiddleware(authIpLimiter, (req) => req.ip || "ip", "Too many reset attempts."),
  async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: "Email, verification code, and new password are required." });
      }
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long." });
      }
      const normalizedEmail = email.toLowerCase().trim();
      const candidateOtp = otp.toString().trim();
      if (!isMongoConfigured()) {
        return res.status(503).json({ error: "MongoDB Atlas is not configured." });
      }
      await connectMongo();
      const user = await User.findOne({ normalizedEmail }).select("+passwordHash +otpHash");
      if (!user) {
        return res.status(400).json({ error: "Invalid password reset request." });
      }
      if (user.otpPurpose !== "RESET_PASSWORD") {
        return res.status(400).json({
          error: "INVALID_PURPOSE",
          message: "No active password reset request found. Please request a new code."
        });
      }
      const evalResult = evaluateOtpAttempt(
        candidateOtp,
        user.otpHash,
        user.otpExpiresAt,
        user.otpAttempts
      );
      if (!evalResult.isValid) {
        user.otpAttempts = (user.otpAttempts || 0) + 1;
        if (evalResult.isExhausted) {
          user.otpHash = void 0;
        }
        await user.save();
        return res.status(400).json({
          error: "INVALID_OTP",
          message: evalResult.reason,
          remainingAttempts: evalResult.remainingAttempts,
          isExhausted: evalResult.isExhausted,
          isExpired: evalResult.isExpired
        });
      }
      user.passwordHash = await bcrypt2.hash(newPassword, 10);
      user.emailVerified = true;
      user.otpHash = void 0;
      user.otpExpiresAt = void 0;
      user.otpAttempts = 0;
      user.otpPurpose = void 0;
      await user.save();
      clearAuthCookie(res);
      return res.status(200).json({
        success: true,
        message: "Password reset successfully! Please sign in with your new password."
      });
    } catch (err) {
      console.error("Reset password error:", err?.message || err);
      return res.status(500).json({ error: "Failed to reset password." });
    }
  }
);
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (!isMongoConfigured()) {
      return res.status(503).json({
        error: "MongoDB Atlas is not configured. Please supply MONGODB_URI in your environment variables."
      });
    }
    try {
      await connectMongo();
    } catch (dbErr) {
      return res.status(503).json({
        error: "Database service is currently unavailable. Please check MONGODB_URI connectivity."
      });
    }
    const user = await User.findOne({ normalizedEmail }).select("+passwordHash");
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    if (user.accountStatus === "SUSPENDED") {
      return res.status(403).json({
        error: "Your account has been suspended. Please contact the administrator."
      });
    }
    const isInitialAdmin = checkIsInitialAdmin(normalizedEmail);
    if (isInitialAdmin) {
      if (user.role !== "ADMIN") user.role = "ADMIN";
      if (!user.emailVerified) user.emailVerified = true;
    }
    if (!user.emailVerified) {
      return res.status(403).json({
        error: "EMAIL_NOT_VERIFIED",
        message: "Your email address is not verified. Please verify using the 6-digit code.",
        email: user.normalizedEmail
      });
    }
    user.lastLoginAt = /* @__PURE__ */ new Date();
    await user.save();
    const token = signToken({
      userId: user.userId,
      email: user.normalizedEmail,
      role: user.role,
      name: user.name
    });
    setAuthCookie(res, token);
    return res.status(200).json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (err) {
    console.error("Login failure:", err?.message || err);
    return res.status(500).json({ error: "An unexpected error occurred during login." });
  }
});
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({ success: true, message: "Logged out successfully." });
});
router.get("/me", requireAuth(), async (req, res) => {
  const user = req.user;
  const payload = req.tokenPayload;
  if (user) {
    return res.status(200).json({
      user: sanitizeUser(user)
    });
  }
  return res.status(200).json({
    user: {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      accountStatus: "ACTIVE",
      emailVerified: true,
      businessCategory: "textiles_tailoring",
      businessStage: "starting",
      location: "India",
      language: "hi"
    }
  });
});
router.put("/profile", requireAuth(), async (req, res) => {
  try {
    const { name, businessCategory, businessStage, location, language } = req.body;
    const userId = req.tokenPayload.userId;
    if (!isMongoConfigured()) {
      return res.status(503).json({ error: "MongoDB Atlas is not configured." });
    }
    await connectMongo();
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    if (name) user.name = name.trim();
    if (businessCategory) user.businessCategory = businessCategory;
    if (businessStage) user.businessStage = businessStage;
    if (location) user.location = location.trim();
    if (language && ["hi", "en", "mr", "bn", "ta", "te", "gu", "kn"].includes(language)) {
      user.language = language;
    }
    await user.save();
    return res.status(200).json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to update profile." });
  }
});
router.get("/brevo-diagnostics", async (req, res) => {
  try {
    const config = BrevoClient.getConfig();
    if (!config.isConfigured) {
      return res.status(200).json({
        configured: false,
        senderEmail: config.senderEmail,
        senderName: config.senderName,
        issue: "BREVO_API_KEY environment variable is missing or empty.",
        recommendation: "Add BREVO_API_KEY to your server-side environment variables."
      });
    }
    const [sendersRes, accountRes] = await Promise.all([
      BrevoClient.getSendersList(),
      BrevoClient.getAccountInfo()
    ]);
    const isSenderAuthorized = sendersRes.isSenderAuthorized;
    const matchingSender = sendersRes.senders.find(
      (s) => s.email.toLowerCase().trim() === config.senderEmail
    );
    return res.status(200).json({
      configured: true,
      keyPreview: config.keyPreview,
      senderEmail: config.senderEmail,
      senderName: config.senderName,
      senderStatus: {
        isAuthorizedInBrevo: isSenderAuthorized,
        senderExists: !!matchingSender,
        active: matchingSender?.active || false
      },
      account: {
        plan: accountRes.account?.plan,
        credits: accountRes.account?.plan?.map((p) => ({ type: p.type, credits: p.credits }))
      },
      analysis: {
        apiConnection: sendersRes.success ? "HEALTHY" : "FAILED",
        senderAuthorization: isSenderAuthorized ? "VERIFIED" : "UNAUTHORIZED_OR_PENDING",
        diagnosticSummary: isSenderAuthorized ? "Brevo API key is valid and sender address is authorized." : `Sender address ${config.senderEmail} is NOT verified in Brevo dashboard. Transactional emails will be rejected by Brevo.`
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to execute Brevo diagnostics." });
  }
});
var auth_default = router;

// src/server/routes/courses.ts
import { Router as Router2 } from "express";
var router2 = Router2();
router2.get("/", async (req, res) => {
  try {
    const courses = await SheetsClient.listCourses(false);
    return res.status(200).json({ success: true, courses });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to retrieve courses." });
  }
});
router2.get("/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    const courseData = await SheetsClient.getCourse(courseId);
    if (!courseData || !courseData.course) {
      return res.status(404).json({ error: "Course not found." });
    }
    return res.status(200).json({ success: true, ...courseData });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to retrieve course detail." });
  }
});
router2.post("/:courseId/enroll", requireAuth(), async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = req.tokenPayload;
    const result = await SheetsClient.recordEnrollment({
      userId: user.userId,
      normalizedEmail: user.email,
      courseId,
      status: "ENROLLED"
    });
    return res.status(200).json({
      success: true,
      enrollment: {
        courseId,
        userId: user.userId,
        enrolledAt: (/* @__PURE__ */ new Date()).toISOString(),
        status: "ENROLLED"
      },
      sheetsResult: result
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to record enrollment." });
  }
});
var courses_default = router2;

// src/server/routes/admin.ts
import { Router as Router3 } from "express";
init_db();
var router3 = Router3();
router3.get("/stats", requireAuth(["ADMIN", "MODERATOR"]), async (req, res) => {
  try {
    let mongoStats = {
      totalUsers: 0,
      activeUsers: 0,
      suspendedUsers: 0,
      verifiedUsers: 0,
      adminCount: 0,
      moderatorCount: 0
    };
    if (isMongoConfigured()) {
      try {
        await connectMongo();
        const [total, active, suspended, verified, admins, mods] = await Promise.all([
          User.countDocuments(),
          User.countDocuments({ accountStatus: "ACTIVE" }),
          User.countDocuments({ accountStatus: "SUSPENDED" }),
          User.countDocuments({ emailVerified: true }),
          User.countDocuments({ role: "ADMIN" }),
          User.countDocuments({ role: "MODERATOR" })
        ]);
        mongoStats = {
          totalUsers: total,
          activeUsers: active,
          suspendedUsers: suspended,
          verifiedUsers: verified,
          adminCount: admins,
          moderatorCount: mods
        };
      } catch (dbErr) {
        console.warn("MongoDB stats query deferred to fallback stats:", dbErr);
      }
    }
    const sheetsStats = SheetsClient.isConfigured() ? await SheetsClient.getStats() : null;
    const isModerator = req.tokenPayload.role === "MODERATOR";
    const statsPayload = isModerator ? {
      totalRegisteredUsers: void 0,
      activeUsers: void 0,
      suspendedUsers: void 0,
      verifiedUsers: void 0,
      adminCount: void 0,
      moderatorCount: void 0,
      publishedCoursesCount: sheetsStats?.totalCourses || 4,
      totalLessonsCount: sheetsStats?.totalLessons || 12,
      totalEnrollments: sheetsStats?.totalEnrollments || 0,
      dailyMailQuotaRemaining: void 0
    } : {
      totalRegisteredUsers: mongoStats.totalUsers,
      activeUsers: mongoStats.activeUsers,
      suspendedUsers: mongoStats.suspendedUsers,
      verifiedUsers: mongoStats.verifiedUsers,
      adminCount: mongoStats.adminCount,
      moderatorCount: mongoStats.moderatorCount,
      publishedCoursesCount: sheetsStats?.totalCourses || 4,
      totalLessonsCount: sheetsStats?.totalLessons || 12,
      totalEnrollments: sheetsStats?.totalEnrollments || 0,
      dailyMailQuotaRemaining: sheetsStats?.dailyMailQuotaRemaining ?? "N/A"
    };
    return res.status(200).json({
      success: true,
      userRole: req.tokenPayload.role,
      mongoConnected: isMongoConfigured(),
      sheetsConnected: SheetsClient.isConfigured(),
      geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
      stats: statsPayload
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to fetch admin stats." });
  }
});
router3.get("/courses", requireAuth(["ADMIN", "MODERATOR"]), async (_req, res) => {
  try {
    const courses = await SheetsClient.listCourses(true);
    return res.status(200).json({ success: true, courses });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to list courses." });
  }
});
router3.post("/courses", requireAuth(["ADMIN", "MODERATOR"]), async (req, res) => {
  try {
    const { title, description, category, language, thumbnailUrl, published } = req.body;
    if (!title) return res.status(400).json({ error: "Course title is required." });
    const actor = req.tokenPayload;
    const courseId = `CRS-${Date.now()}`;
    const result = await SheetsClient.createCourse({
      courseId,
      title,
      description: description || "",
      category: category || "pricing_profit",
      language: language || "hi",
      thumbnailUrl: thumbnailUrl || "",
      published: published !== void 0 ? !!published : true,
      createdBy: `${actor.name} (${actor.role})`
    });
    await SheetsClient.logActivity({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: "CREATE_COURSE",
      targetId: courseId,
      details: { title, category }
    });
    return res.status(201).json({ success: true, courseId, result });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to create course." });
  }
});
router3.put("/courses/:courseId", requireAuth(["ADMIN", "MODERATOR"]), async (req, res) => {
  try {
    const { courseId } = req.params;
    const actor = req.tokenPayload;
    const result = await SheetsClient.updateCourse(courseId, req.body);
    await SheetsClient.logActivity({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: "UPDATE_COURSE",
      targetId: courseId
    });
    return res.status(200).json({ success: true, courseId, result });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to update course." });
  }
});
router3.delete("/courses/:courseId", requireAuth(["ADMIN"]), async (req, res) => {
  try {
    const { courseId } = req.params;
    const actor = req.tokenPayload;
    const result = await SheetsClient.deleteCourse(courseId);
    await SheetsClient.logActivity({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: "DELETE_COURSE",
      targetId: courseId
    });
    return res.status(200).json({ success: true, courseId, result });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to delete course." });
  }
});
router3.post("/lessons", requireAuth(["ADMIN", "MODERATOR"]), async (req, res) => {
  try {
    const { courseId, title, description, order, videoUrl, duration, published } = req.body;
    if (!courseId || !title) {
      return res.status(400).json({ error: "courseId and lesson title are required." });
    }
    const driveMeta = videoUrl ? parseGoogleDriveVideo(videoUrl) : { driveFileId: "", embedUrl: "" };
    const lessonId = `LSN-${Date.now()}`;
    const actor = req.tokenPayload;
    const result = await SheetsClient.createLesson({
      lessonId,
      courseId,
      title,
      description: description || "",
      order: parseInt(order, 10) || 1,
      driveFileId: driveMeta.driveFileId,
      videoUrl: videoUrl || "",
      duration: duration || "15 min",
      published: published !== void 0 ? !!published : true
    });
    await SheetsClient.logActivity({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: "CREATE_LESSON",
      targetId: lessonId,
      details: { courseId, title }
    });
    return res.status(201).json({ success: true, lessonId, driveMeta, result });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to create lesson." });
  }
});
router3.put("/lessons/:lessonId", requireAuth(["ADMIN", "MODERATOR"]), async (req, res) => {
  try {
    const { lessonId } = req.params;
    const data = { ...req.body };
    if (data.videoUrl) {
      const driveMeta = parseGoogleDriveVideo(data.videoUrl);
      data.driveFileId = driveMeta.driveFileId;
    }
    const result = await SheetsClient.updateLesson(lessonId, data);
    return res.status(200).json({ success: true, lessonId, result });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to update lesson." });
  }
});
router3.delete("/lessons/:lessonId", requireAuth(["ADMIN"]), async (req, res) => {
  try {
    const { lessonId } = req.params;
    const result = await SheetsClient.deleteLesson(lessonId);
    return res.status(200).json({ success: true, lessonId, result });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to delete lesson." });
  }
});
router3.post("/drive/parse", requireAuth(["ADMIN", "MODERATOR"]), (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required." });
  const meta = parseGoogleDriveVideo(url);
  return res.status(200).json({ success: true, meta });
});
router3.get("/users", requireAuth(["ADMIN"]), async (req, res) => {
  try {
    if (!isMongoConfigured()) {
      return res.status(503).json({ error: "MongoDB Atlas is not configured." });
    }
    await connectMongo();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = (req.query.search || "").trim();
    const roleFilter = req.query.role || "";
    const statusFilter = req.query.status || "";
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { normalizedEmail: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } }
      ];
    }
    if (roleFilter && ["ADMIN", "MODERATOR", "USER"].includes(roleFilter)) {
      filter.role = roleFilter;
    }
    if (statusFilter && ["ACTIVE", "SUSPENDED"].includes(statusFilter)) {
      filter.accountStatus = statusFilter;
    }
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select("-passwordHash"),
      User.countDocuments(filter)
    ]);
    return res.status(200).json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to retrieve users." });
  }
});
router3.put("/users/:userId/role", requireAuth(["ADMIN"]), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const currentAdmin = req.tokenPayload;
    if (!role || !["ADMIN", "MODERATOR", "USER"].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified." });
    }
    if (!isMongoConfigured()) {
      return res.status(503).json({ error: "MongoDB Atlas is not configured." });
    }
    await connectMongo();
    const targetUser = await User.findOne({ userId });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }
    if (targetUser.role === "ADMIN" && role !== "ADMIN") {
      const activeAdminCount = await User.countDocuments({ role: "ADMIN", accountStatus: "ACTIVE" });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          error: "Action blocked: Cannot revoke or demote the last active Administrator."
        });
      }
    }
    const previousRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();
    await SheetsClient.logActivity({
      actorUserId: currentAdmin.userId,
      actorRole: currentAdmin.role,
      action: "UPDATE_USER_ROLE",
      targetId: userId,
      details: { previousRole, newRole: role, targetEmail: targetUser.normalizedEmail }
    });
    return res.status(200).json({
      success: true,
      userId,
      role: targetUser.role,
      message: `User role updated from ${previousRole} to ${role}.`
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to update user role." });
  }
});
router3.put("/users/:userId/status", requireAuth(["ADMIN"]), async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    const currentAdmin = req.tokenPayload;
    if (!status || !["ACTIVE", "SUSPENDED"].includes(status)) {
      return res.status(400).json({ error: "Invalid account status specified." });
    }
    if (currentAdmin.userId === userId && status === "SUSPENDED") {
      return res.status(400).json({ error: "You cannot suspend your own administrative account." });
    }
    await connectMongo();
    const targetUser = await User.findOne({ userId });
    if (!targetUser) return res.status(404).json({ error: "User not found." });
    if (targetUser.role === "ADMIN" && status === "SUSPENDED") {
      const activeAdminCount = await User.countDocuments({ role: "ADMIN", accountStatus: "ACTIVE" });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ error: "Cannot suspend the last active Administrator." });
      }
    }
    targetUser.accountStatus = status;
    await targetUser.save();
    SheetsClient.syncUser({
      userId: targetUser.userId,
      normalizedEmail: targetUser.normalizedEmail,
      registeredAt: targetUser.createdAt.toISOString(),
      accountStatus: status,
      emailVerified: targetUser.emailVerified
    }).catch((e) => console.warn("Sheets status update error:", e));
    return res.status(200).json({
      success: true,
      userId,
      accountStatus: targetUser.accountStatus
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to update user status." });
  }
});
router3.post("/emails/preview", requireAuth(["ADMIN"]), async (req, res) => {
  try {
    const { recipientGroup = "all" } = req.body;
    const preview = await SheetsClient.previewEmail(recipientGroup);
    return res.status(200).json(preview);
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to preview email." });
  }
});
router3.post("/emails/send", requireAuth(["ADMIN"]), async (req, res) => {
  try {
    const { subject, body, recipientGroup = "all" } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ error: "Subject and email body are required." });
    }
    const actor = req.tokenPayload;
    const campaignId = `CAMP-${Date.now()}`;
    const result = await SheetsClient.sendEmailAnnouncement({
      campaignId,
      subject,
      body,
      recipientGroup
    });
    await SheetsClient.logActivity({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: "SEND_EMAIL_CAMPAIGN",
      targetId: campaignId,
      details: { subject, recipientGroup, sentCount: result?.sentCount }
    });
    return res.status(200).json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to dispatch email campaign." });
  }
});
router3.get("/emails/logs", requireAuth(["ADMIN"]), async (_req, res) => {
  try {
    const logs = await SheetsClient.getEmailLogs();
    return res.status(200).json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to retrieve email logs." });
  }
});
router3.get("/logs", requireAuth(["ADMIN"]), async (_req, res) => {
  try {
    const logs = await SheetsClient.getActivityLogs();
    return res.status(200).json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to retrieve activity logs." });
  }
});
var admin_default = router3;

// src/server/routes/adminAi.ts
import { Router as Router4 } from "express";
init_keyStore();
init_keyManager();

// src/server/models/ActivityLog.ts
import mongoose4, { Schema as Schema3 } from "mongoose";
var ActivityLogSchema = new Schema3(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    actorUserId: {
      type: String,
      required: true,
      index: true
    },
    actorRole: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    targetId: {
      type: String
    },
    details: {
      type: Schema3.Types.Mixed
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);
var ActivityLog = mongoose4.models.ActivityLog || mongoose4.model("ActivityLog", ActivityLogSchema);

// src/server/routes/adminAi.ts
import crypto4 from "crypto";
var router4 = Router4();
router4.use(requireAuth(["ADMIN"]));
function sanitizeKey(k) {
  return {
    id: k.id,
    provider: k.provider,
    maskedKey: k.maskedKey,
    keyFingerprint: k.keyFingerprint,
    status: k.status,
    enabled: k.enabled,
    projectId: k.projectId,
    orgId: k.orgId,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
    lastUsedAt: k.lastUsedAt,
    lastSuccessAt: k.lastSuccessAt,
    lastCheckedAt: k.lastCheckedAt,
    lastErrorCategory: k.lastErrorCategory,
    lastErrorMessage: k.lastErrorMessage,
    cooldownUntil: k.cooldownUntil,
    failureCount: k.failureCount,
    successCount: k.successCount
  };
}
router4.get("/overview", async (_req, res) => {
  try {
    const [allKeys, groqConfig, geminiConfig, metrics] = await Promise.all([
      AiKeyStore.getAllKeys(),
      AiKeyStore.getProviderConfig("groq"),
      AiKeyStore.getProviderConfig("gemini"),
      AiKeyManager.getAdminMetrics()
    ]);
    return res.status(200).json({
      success: true,
      keys: allKeys.map(sanitizeKey),
      configs: {
        groq: groqConfig,
        gemini: geminiConfig
      },
      metrics
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to fetch AI settings" });
  }
});
router4.post("/keys", async (req, res) => {
  try {
    const { provider, rawKeys, projectId, orgId } = req.body;
    if (!provider || provider !== "groq" && provider !== "gemini") {
      return res.status(400).json({ error: 'Valid provider ("groq" or "gemini") is required.' });
    }
    if (!rawKeys || typeof rawKeys !== "string" || rawKeys.trim().length === 0) {
      return res.status(400).json({ error: "rawKeys string is required." });
    }
    const result = await AiKeyStore.addKeys(provider, rawKeys, {
      projectId,
      orgId
    });
    try {
      await ActivityLog.create({
        eventId: `audit-ai-keys-add-${Date.now()}-${crypto4.randomBytes(4).toString("hex")}`,
        actorUserId: req.tokenPayload.userId,
        actorRole: req.tokenPayload.role,
        action: "AI_KEYS_ADD",
        targetId: provider,
        details: {
          provider,
          addedCount: result.added,
          skippedCount: result.skipped,
          projectId
        }
      });
    } catch {
    }
    return res.status(200).json({
      success: true,
      added: result.added,
      skipped: result.skipped,
      keys: result.keys.map(sanitizeKey)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to add API keys" });
  }
});
router4.patch("/keys/:keyId", async (req, res) => {
  try {
    const { keyId } = req.params;
    const { enabled, status, projectId, orgId } = req.body;
    const updates = {};
    if (typeof enabled === "boolean") {
      updates.enabled = enabled;
      if (!enabled) {
        updates.status = "DISABLED";
      } else if (status) {
        updates.status = status;
      } else {
        updates.status = "ACTIVE";
      }
    }
    if (status && ["ACTIVE", "FAILED", "TEMPORARILY_UNAVAILABLE", "DISABLED", "NEEDS_CONFIGURATION"].includes(status)) {
      updates.status = status;
    }
    if (projectId !== void 0) updates.projectId = projectId;
    if (orgId !== void 0) updates.orgId = orgId;
    const updated = await AiKeyStore.updateKeyStatus(keyId, updates);
    if (!updated) {
      return res.status(404).json({ error: "Key not found" });
    }
    return res.status(200).json({ success: true, key: sanitizeKey(updated) });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to update key" });
  }
});
router4.delete("/keys/:keyId", async (req, res) => {
  try {
    const { keyId } = req.params;
    const deleted = await AiKeyStore.deleteKey(keyId);
    if (!deleted) {
      return res.status(404).json({ error: "Key not found" });
    }
    try {
      await ActivityLog.create({
        eventId: `audit-ai-keys-del-${Date.now()}-${crypto4.randomBytes(4).toString("hex")}`,
        actorUserId: req.tokenPayload.userId,
        actorRole: req.tokenPayload.role,
        action: "AI_KEY_DELETE",
        targetId: keyId
      });
    } catch {
    }
    return res.status(200).json({ success: true, message: "Key removed successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to delete key" });
  }
});
router4.post("/keys/:keyId/test", async (req, res) => {
  try {
    const { keyId } = req.params;
    const testResult = await AiKeyManager.testKeyConnectivity(keyId);
    return res.status(200).json({
      success: testResult.success,
      latencyMs: testResult.latencyMs,
      message: testResult.message,
      modelUsed: testResult.modelUsed
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Connectivity test error" });
  }
});
router4.put("/config/:provider", async (req, res) => {
  try {
    const { provider } = req.params;
    if (provider !== "groq" && provider !== "gemini") {
      return res.status(400).json({ error: "Invalid provider" });
    }
    const {
      preferredModel,
      maxRequestsPerMinute,
      maxDailyRequests,
      retryBudget,
      timeoutMs
    } = req.body;
    const updates = {};
    if (preferredModel && typeof preferredModel === "string") {
      updates.preferredModel = preferredModel.trim();
    }
    if (typeof maxRequestsPerMinute === "number" && maxRequestsPerMinute > 0) {
      updates.maxRequestsPerMinute = maxRequestsPerMinute;
    }
    if (typeof maxDailyRequests === "number" && maxDailyRequests > 0) {
      updates.maxDailyRequests = maxDailyRequests;
    }
    if (typeof retryBudget === "number" && retryBudget >= 1 && retryBudget <= 5) {
      updates.retryBudget = retryBudget;
    }
    if (typeof timeoutMs === "number" && timeoutMs >= 2e3 && timeoutMs <= 3e4) {
      updates.timeoutMs = timeoutMs;
    }
    const updatedConfig = await AiKeyStore.updateProviderConfig(provider, updates);
    return res.status(200).json({ success: true, config: updatedConfig });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to update provider configuration" });
  }
});
var adminAi_default = router4;

// api/ai/chat.ts
var SAKHI_SYSTEM_INSTRUCTION = `
You are "Sakhi" (\u0938\u0916\u0940 - Business Mentor & Friend), an empathetic, knowledgeable, and practical business mentor for rural and semi-urban Indian women micro-entrepreneurs on the SakhiBiz platform.
Target audience: Women running or starting small ventures like tailoring shops, homemade papad/pickles, handicraft sarees, small grocery stalls (kirana), beauty parlors, dairy farming, poultry, and home bakeries.

Guidelines:
1. Language: Answer in the language the user speaks. If they write in Hindi (Devanagari or Hinglish), respond in warm, simple Hindi (Devanagari). If in English, respond in clear, easy English.
2. Tone: Warm, encouraging, respectful (use '\u0906\u092A', '\u0926\u0940\u0926\u0940' where appropriate), practical, and never intimidating.
3. Keep advice clear, actionable, and grounded in real-world Indian micro-business scenarios (e.g. calculation with rupees \u20B9, using WhatsApp Business, managing daily khata / cashbook).
4. Emphasize digital financial safety: remind them never to share OTPs or enter their UPI PIN to receive money.
5. Important Disclaimer: If the user asks about loans, government schemes, or taxation, provide helpful general guidance and remind them to verify official details through government portals (such as udyamregistration.gov.in or mudra.org.in) or local bank branches.
`;
var LANGUAGE_META = {
  hi: { name: "Hindi", script: "Devanagari", greeting: "\u0928\u092E\u0938\u094D\u0924\u0947 \u0926\u0940\u0926\u0940!" },
  en: { name: "English", script: "English/Latin", greeting: "Hello!" },
  mr: { name: "Marathi", script: "Devanagari (\u092E\u0930\u093E\u0920\u0940)", greeting: "\u0928\u092E\u0938\u094D\u0915\u093E\u0930 \u0924\u093E\u0908!" },
  bn: { name: "Bengali", script: "Bengali script (\u09AC\u09BE\u0982\u09B2\u09BE)", greeting: "\u09A8\u09AE\u09B8\u09CD\u0995\u09BE\u09B0 \u09A6\u09BF\u09A6\u09BF!" },
  ta: { name: "Tamil", script: "Tamil script (\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD)", greeting: "\u0BB5\u0BA3\u0B95\u0BCD\u0B95\u0BAE\u0BCD \u0B85\u0B95\u0BCD\u0B95\u0BBE!" },
  te: { name: "Telugu", script: "Telugu script (\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41)", greeting: "\u0C28\u0C2E\u0C38\u0C4D\u0C15\u0C3E\u0C30\u0C02 \u0C05\u0C15\u0C4D\u0C15\u0C3E!" },
  gu: { name: "Gujarati", script: "Gujarati script (\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0)", greeting: "\u0AA8\u0AAE\u0AB8\u0ACD\u0AA4\u0AC7 \u0AAC\u0AB9\u0AC7\u0AA8!" },
  kn: { name: "Kannada", script: "Kannada script (\u0C95\u0CA8\u0CCD\u0CA8\u0CA1)", greeting: "\u0CA8\u0CAE\u0CB8\u0CCD\u0C95\u0CBE\u0CB0 \u0C85\u0C95\u0CCD\u0C95!" }
};
function getRegionalFallback(message, language) {
  const query = message.toLowerCase();
  const langMeta = LANGUAGE_META[language] || LANGUAGE_META["hi"];
  if (language === "hi") {
    if (query.includes("\u092E\u0941\u0928\u093E\u092B\u093E") || query.includes("\u0932\u093E\u092D") || query.includes("profit") || query.includes("\u0915\u0940\u092E\u0924") || query.includes("cost") || query.includes("\u092E\u0942\u0932\u094D\u092F")) {
      return `\u0928\u092E\u0938\u094D\u0924\u0947 \u0926\u0940\u0926\u0940! \u0938\u0939\u0940 \u092E\u0941\u0928\u093E\u092B\u093E \u0928\u093F\u0915\u093E\u0932\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u092F\u0939 \u0938\u0930\u0932 \u0928\u093F\u092F\u092E \u092F\u093E\u0926 \u0930\u0916\u0947\u0902:

1. **\u0915\u0941\u0932 \u0932\u093E\u0917\u0924 (Total Cost)** = \u0915\u091A\u094D\u091A\u093E \u092E\u093E\u0932 + \u0906\u092A\u0915\u0940 \u092E\u0947\u0939\u0928\u0924 (\u0936\u094D\u0930\u092E) + \u092A\u0948\u0915\u093F\u0902\u0917 \u0914\u0930 \u0906\u0928\u0947-\u091C\u093E\u0928\u0947 \u0915\u093E \u0916\u0930\u094D\u091A\u0964
2. **\u092C\u093F\u0915\u094D\u0930\u0940 \u092E\u0942\u0932\u094D\u092F (Selling Price)** = \u0915\u0941\u0932 \u0932\u093E\u0917\u0924 + \u0906\u092A\u0915\u093E \u0924\u092F \u092E\u0941\u0928\u093E\u092B\u093E (\u0915\u092E \u0938\u0947 \u0915\u092E 25% \u0938\u0947 40%)\u0964
3. **\u0938\u093E\u0935\u0927\u093E\u0928\u0940:** \u0915\u092D\u0940 \u092D\u0940 \u0905\u092A\u0928\u0940 \u0916\u0941\u0926 \u0915\u0940 \u092E\u0947\u0939\u0928\u0924 (\u0938\u092E\u092F) \u0915\u094B \u092E\u0941\u092B\u093C\u094D\u0924 \u0928 \u0938\u092E\u091D\u0947\u0902! \u0909\u0938\u0947 \u092D\u0940 \u0932\u093E\u0917\u0924 \u092E\u0947\u0902 \u091C\u093C\u0930\u0942\u0930 \u091C\u094B\u0921\u093C\u0947\u0902\u0964

\u0906\u092A \u0939\u092E\u093E\u0930\u0947 'Business Tools' \u092E\u0947\u0902 \u091C\u093E\u0915\u0930 **Profit Calculator** \u0915\u093E \u092D\u0940 \u0907\u0938\u094D\u0924\u0947\u092E\u093E\u0932 \u0915\u0930 \u0938\u0915\u0924\u0940 \u0939\u0948\u0902!`;
    }
    if (query.includes("upi") || query.includes("otp") || query.includes("\u0927\u094B\u0916\u093E") || query.includes("scam") || query.includes("\u092A\u093F\u0928") || query.includes("\u0938\u0941\u0930\u0915\u094D\u0937\u093E")) {
      return `\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0915\u093E \u0938\u092C\u0938\u0947 \u092C\u0921\u093C\u093E \u0938\u094D\u0935\u0930\u094D\u0923\u093F\u092E \u0928\u093F\u092F\u092E (Golden Rule):

\u26A0\uFE0F **\u092A\u0948\u0938\u0947 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0915\u092D\u0940 \u092D\u0940 UPI PIN \u0921\u093E\u0932\u0928\u0947 \u0915\u0940 \u091C\u093C\u0930\u0942\u0930\u0924 \u0928\u0939\u0940\u0902 \u0939\u094B\u0924\u0940!** UPI PIN \u0938\u093F\u0930\u094D\u092B \u0924\u092D\u0940 \u0921\u093E\u0932\u093E \u091C\u093E\u0924\u093E \u0939\u0948 \u091C\u092C \u0906\u092A \u0915\u093F\u0938\u0940 \u0915\u094B \u092A\u0948\u0938\u0947 \u092D\u0947\u091C \u0930\u0939\u0940 \u0939\u094B\u0902\u0964

1. \u0915\u093F\u0938\u0940 \u092D\u0940 \u0905\u0928\u091C\u093E\u0928 \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0915\u094B \u0905\u092A\u0928\u093E OTP, \u092C\u0948\u0902\u0915 \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u092F\u093E UPI PIN \u0915\u092D\u0940 \u0928 \u092C\u0924\u093E\u090F\u0902\u0964
2. \u092F\u0926\u093F \u0915\u094B\u0908 \u092B\u094B\u0928 \u092A\u0930 \u0915\u0939\u0947 \u0915\u093F "\u092E\u0948\u0902\u0928\u0947 \u0917\u0932\u0924\u0940 \u0938\u0947 \u092A\u0948\u0938\u0947 \u092D\u0947\u091C \u0926\u093F\u090F, \u0932\u093F\u0902\u0915 \u092A\u0930 \u0915\u094D\u0932\u093F\u0915 \u0915\u0930\u094B", \u0924\u094B \u0924\u0941\u0930\u0902\u0924 \u0938\u093E\u0935\u0927\u093E\u0928 \u0939\u094B \u091C\u093E\u090F\u0902 \u0914\u0930 \u092C\u0948\u0902\u0915 \u0938\u094D\u091F\u0947\u091F\u092E\u0947\u0902\u091F \u091A\u0947\u0915 \u0915\u0930\u0947\u0902\u0964`;
    }
    if (query.includes("whatsapp") || query.includes("\u0935\u094D\u0939\u093E\u091F\u094D\u0938\u090F\u092A") || query.includes("\u0917\u094D\u0930\u093E\u0939\u0915") || query.includes("\u092E\u093E\u0930\u094D\u0915\u0947\u091F\u093F\u0902\u0917") || query.includes("\u092A\u094D\u0930\u091A\u093E\u0930")) {
      return `\u0935\u094D\u0939\u093E\u091F\u094D\u0938\u090F\u092A \u0938\u0947 \u0935\u094D\u092F\u093E\u092A\u093E\u0930 \u092C\u0922\u093C\u093E\u0928\u0947 \u0915\u0947 3 \u0906\u0938\u093E\u0928 \u0924\u0930\u0940\u0915\u0947:

1. **WhatsApp Business \u0910\u092A \u0915\u093E \u0907\u0938\u094D\u0924\u0947\u092E\u093E\u0932 \u0915\u0930\u0947\u0902:** \u0907\u0938\u092E\u0947\u0902 \u0906\u092A \u0905\u092A\u0928\u0947 \u0938\u093E\u092E\u093E\u0928 (\u091C\u0948\u0938\u0947 \u0938\u0942\u091F, \u0906\u091A\u093E\u0930, \u0939\u0938\u094D\u0924\u0936\u093F\u0932\u094D\u092A) \u0915\u093E \u0938\u0941\u0902\u0926\u0930 \u0915\u0948\u091F\u0932\u0949\u0917 (Catalog) \u092C\u0928\u093E \u0938\u0915\u0924\u0940 \u0939\u0948\u0902\u0964
2. **\u0938\u094D\u091F\u0947\u091F\u0938 \u0905\u092A\u0921\u0947\u091F:** \u0930\u094B\u091C\u093C \u0938\u0941\u092C\u0939 10-11 \u092C\u091C\u0947 \u0928\u090F \u0938\u093E\u092E\u093E\u0928 \u0915\u0940 2-3 \u0938\u093E\u092B \u0924\u0938\u094D\u0935\u0940\u0930\u0947\u0902 \u0915\u0940\u092E\u0924 \u0914\u0930 \u092C\u094D\u092F\u094C\u0930\u0947 \u0915\u0947 \u0938\u093E\u0925 \u0932\u0917\u093E\u090F\u0902\u0964
3. **\u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0915\u0940 \u0932\u093F\u0938\u094D\u091F \u092C\u0928\u093E\u090F\u0902:** \u092A\u0941\u0930\u093E\u0928\u0947 \u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0915\u094B \u0928\u090F \u0911\u092B\u0930\u094D\u0938 \u0915\u0940 \u0938\u0942\u091A\u0928\u093E \u0926\u0947\u0902 \u0914\u0930 \u0909\u0928\u0915\u0940 \u0930\u093E\u092F \u092A\u0942\u091B\u0947\u0902\u0964`;
    }
    if (query.includes("\u092E\u0941\u0926\u094D\u0930\u093E") || query.includes("\u0932\u094B\u0928") || query.includes("loan") || query.includes("\u092F\u094B\u091C\u0928\u093E") || query.includes("scheme") || query.includes("\u0938\u0939\u093E\u092F\u0924\u093E")) {
      return `\u092E\u0939\u093F\u0932\u093E \u0909\u0926\u094D\u092F\u092E\u093F\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u092A\u094D\u0930\u092E\u0941\u0916 \u0938\u0930\u0915\u093E\u0930\u0940 \u092F\u094B\u091C\u0928\u093E\u090F\u0902:

1. **\u092A\u094D\u0930\u0927\u093E\u0928\u092E\u0902\u0924\u094D\u0930\u0940 \u092E\u0941\u0926\u094D\u0930\u093E \u092F\u094B\u091C\u0928\u093E (PMMY):**
   - \u0936\u093F\u0936\u0941 \u0932\u094B\u0928: \u20B950,000 \u0924\u0915 (\u0928\u092F\u093E \u0915\u093E\u092E \u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F)
   - \u0915\u093F\u0936\u094B\u0930 \u0932\u094B\u0928: \u20B950,000 \u0938\u0947 \u20B95 \u0932\u093E\u0916 \u0924\u0915
2. **\u0909\u0926\u094D\u092F\u092E \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 (Udyam):** udyamregistration.gov.in \u092A\u0930 \u092E\u0941\u092B\u094D\u0924 \u092E\u0947\u0902 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902, \u0907\u0938\u0938\u0947 \u0938\u0930\u0915\u093E\u0930\u0940 \u092F\u094B\u091C\u0928\u093E\u0913\u0902 \u092E\u0947\u0902 \u092A\u094D\u0930\u093E\u0925\u092E\u093F\u0915\u0924\u093E \u092E\u093F\u0932\u0924\u0940 \u0939\u0948\u0964

\u0928\u094B\u091F: \u0915\u093F\u0938\u0940 \u092D\u0940 \u0926\u0932\u093E\u0932 \u0915\u094B \u092A\u0948\u0938\u0947 \u0928 \u0926\u0947\u0902, \u0938\u0940\u0927\u0947 \u0905\u092A\u0928\u0947 \u0928\u091C\u0926\u0940\u0915\u0940 \u092C\u0948\u0902\u0915 \u0936\u093E\u0916\u093E \u092F\u093E \u0915\u0949\u092E\u0928 \u0938\u0930\u094D\u0935\u093F\u0938 \u0938\u0947\u0902\u091F\u0930 (CSC) \u091C\u093E\u090F\u0902\u0964`;
    }
    return `\u0928\u092E\u0938\u094D\u0924\u0947 \u0926\u0940\u0926\u0940! \u0906\u092A\u0915\u093E \u0938\u0935\u093E\u0932 \u092C\u0939\u0941\u0924 \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u0939\u0948\u0964

\u090F\u0915 \u0938\u092B\u0932 \u0935\u094D\u092F\u0935\u0938\u093E\u092F \u0915\u0947 \u0932\u093F\u090F \u0924\u0940\u0928 \u092C\u093E\u0924\u0947\u0902 \u0939\u092E\u0947\u0936\u093E \u0927\u094D\u092F\u093E\u0928 \u092E\u0947\u0902 \u0930\u0916\u0947\u0902:
1. **\u0926\u0948\u0928\u093F\u0915 \u0939\u093F\u0938\u093E\u092C-\u0915\u093F\u0924\u093E\u092C:** \u0930\u094B\u091C \u0915\u0940 \u0915\u092E\u093E\u0908 \u0914\u0930 \u0916\u0930\u094D\u091A\u0947 \u0915\u094B \u090F\u0915 \u0921\u093E\u092F\u0930\u0940 \u092F\u093E \u0939\u092E\u093E\u0930\u0947 Expense Tracker \u092E\u0947\u0902 \u0932\u093F\u0916\u0947\u0902\u0964
2. **\u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0938\u0947 \u092E\u0940\u0920\u093E \u0935\u094D\u092F\u0935\u0939\u093E\u0930:** \u0938\u0902\u0924\u0941\u0937\u094D\u091F \u0917\u094D\u0930\u093E\u0939\u0915 \u0939\u0940 4 \u0928\u090F \u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0915\u094B \u0932\u0947\u0915\u0930 \u0906\u0924\u093E \u0939\u0948\u0964
3. **\u0921\u093F\u091C\u093F\u091F\u0932 \u091F\u0942\u0932\u094D\u0938 \u0915\u093E \u0909\u092A\u092F\u094B\u0917:** \u092A\u0947\u092E\u0947\u0902\u091F \u0915\u0947 \u0932\u093F\u090F \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 QR \u0915\u094B\u0921 \u0914\u0930 \u092A\u094D\u0930\u091A\u093E\u0930 \u0915\u0947 \u0932\u093F\u090F \u0935\u094D\u0939\u093E\u091F\u094D\u0938\u090F\u092A \u0915\u0948\u091F\u0932\u0949\u0917 \u0905\u092A\u0928\u093E\u090F\u0902\u0964

\u0915\u094D\u092F\u093E \u0906\u092A \u0915\u093F\u0938\u0940 \u0916\u093E\u0938 \u0935\u093F\u0937\u092F (\u091C\u0948\u0938\u0947 \u0915\u0940\u092E\u0924 \u0924\u092F \u0915\u0930\u0928\u093E, \u092E\u093E\u0930\u094D\u0915\u0947\u091F\u093F\u0902\u0917 \u092F\u093E \u0938\u0941\u0930\u0915\u094D\u0937\u093E) \u0915\u0947 \u092C\u093E\u0930\u0947 \u092E\u0947\u0902 \u0935\u093F\u0938\u094D\u0924\u093E\u0930 \u0938\u0947 \u091C\u093E\u0928\u0928\u093E \u091A\u093E\u0939\u0924\u0940 \u0939\u0948\u0902?`;
  } else if (language === "mr") {
    return `${langMeta.greeting} \u0935\u094D\u092F\u0935\u0938\u093E\u092F \u0935\u093E\u0922\u0935\u0923\u094D\u092F\u093E\u0938\u093E\u0920\u0940 \u0906\u0923\u093F \u0928\u092B\u093E \u092E\u093F\u0933\u0935\u0923\u094D\u092F\u093E\u0938\u093E\u0920\u0940 \u092F\u093E \u0969 \u0917\u094B\u0937\u094D\u091F\u0940 \u0932\u0915\u094D\u0937\u093E\u0924 \u0920\u0947\u0935\u093E:
1. **\u0915\u093F\u0902\u092E\u0924 \u0920\u0930\u0935\u0923\u0947:** \u0915\u091A\u094D\u091A\u093E \u092E\u093E\u0932 + \u0924\u0941\u092E\u091A\u0940 \u092E\u0947\u0939\u0928\u0924 + \u0935\u093E\u0939\u0924\u0942\u0915 \u0916\u0930\u094D\u091A \u091C\u094B\u0921\u0942\u0928 \u092F\u094B\u0917\u094D\u092F \u0928\u092B\u093E \u091C\u094B\u0921\u093E.
2. **\u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0935\u094D\u092F\u0935\u0939\u093E\u0930:** \u092A\u0948\u0938\u0947 \u0938\u094D\u0935\u0940\u0915\u093E\u0930\u0923\u094D\u092F\u093E\u0938\u093E\u0920\u0940 \u0915\u0927\u0940\u0939\u0940 UPI PIN \u091F\u093E\u0915\u0942 \u0928\u0915\u093E.
3. **\u0915\u0938\u094D\u091F\u092E\u0930 \u0938\u0902\u092C\u0902\u0927:** \u0917\u094D\u0930\u093E\u0939\u0915\u093E\u0902\u0936\u0940 \u0928\u092E\u094D\u0930 \u0938\u0902\u0935\u093E\u0926 \u0906\u0923\u093F \u0935\u0947\u0933\u0947\u0935\u0930 \u0938\u0947\u0935\u093E.
\u0924\u0941\u092E\u094D\u0939\u093E\u0932\u093E \u0915\u094B\u0923\u0924\u094D\u092F\u093E \u0935\u093F\u0937\u092F\u093E\u0935\u0930 \u0905\u0927\u093F\u0915 \u092E\u0926\u0924 \u0939\u0935\u0940 \u0906\u0939\u0947?`;
  } else if (language === "bn") {
    return `${langMeta.greeting} \u0986\u09AA\u09A8\u09BE\u09B0 \u09AC\u09CD\u09AF\u09AC\u09B8\u09BE\u09B0 \u0989\u09A8\u09CD\u09A8\u09A4\u09BF\u09B0 \u099C\u09A8\u09CD\u09AF \u09E9\u099F\u09BF \u0997\u09C1\u09B0\u09C1\u09A4\u09CD\u09AC\u09AA\u09C2\u09B0\u09CD\u09A3 \u09A8\u09BF\u09AF\u09BC\u09AE:
\u09E7. **\u09B8\u09A0\u09BF\u0995 \u09B2\u09BE\u09AD:** \u0995\u09BE\u0981\u099A\u09BE\u09AE\u09BE\u09B2\u09C7\u09B0 \u0996\u09B0\u099A\u09C7\u09B0 \u09B8\u0999\u09CD\u0997\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u09A8\u09BF\u099C\u09B8\u09CD\u09AC \u09B6\u09CD\u09B0\u09AE \u0993 \u09AA\u09CD\u09AF\u09BE\u0995\u09BF\u0982 \u0996\u09B0\u099A \u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8\u0964
\u09E8. **\u09A8\u09BF\u09B0\u09BE\u09AA\u09A6 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8:** \u099F\u09BE\u0995\u09BE \u09AA\u09BE\u0993\u09AF\u09BC\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u0995\u0996\u09A8\u09CB UPI PIN \u09A6\u09BF\u09A4\u09C7 \u09B9\u09AF\u09BC \u09A8\u09BE\u0964
\u09E9. **\u09A1\u09BF\u099C\u09BF\u099F\u09BE\u09B2 \u09AA\u09CD\u09B0\u099A\u09BE\u09B0:** WhatsApp Business-\u098F \u09AA\u09A3\u09CD\u09AF\u09C7\u09B0 \u0995\u09CD\u09AF\u09BE\u099F\u09BE\u09B2\u0997 \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09C1\u09A8\u0964
\u0986\u09AA\u09A8\u09BE\u09B0 \u0995\u09CB\u09A8 \u09AC\u09BF\u09B7\u09AF\u09BC\u09C7 \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8 \u0986\u099B\u09C7 \u099C\u09BE\u09A8\u09BE\u09A8\u0964`;
  } else if (language === "ta") {
    return `${langMeta.greeting} \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BA4\u0BCA\u0BB4\u0BBF\u0BB2\u0BC8 \u0BB5\u0BC6\u0BB1\u0BCD\u0BB1\u0BBF\u0B95\u0BB0\u0BAE\u0BBE\u0B95 \u0BA8\u0B9F\u0BA4\u0BCD\u0BA4 3 \u0BAE\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BAF \u0B95\u0BC1\u0BB1\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD:
1. **\u0BB5\u0BBF\u0BB2\u0BC8 \u0BA8\u0BBF\u0BB0\u0BCD\u0BA3\u0BAF\u0BAE\u0BCD:** \u0BAE\u0BC2\u0BB2\u0BAA\u0BCD\u0BAA\u0BCA\u0BB0\u0BC1\u0BB3\u0BCD \u0B9A\u0BC6\u0BB2\u0BB5\u0BC1\u0B9F\u0BA9\u0BCD \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B89\u0BB4\u0BC8\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BCD\u0B95\u0BBE\u0BA9 \u0B95\u0B9F\u0BCD\u0B9F\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8\u0BAF\u0BC1\u0BAE\u0BCD \u0B9A\u0BC7\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.
2. **\u0BAA\u0BBE\u0BA4\u0BC1\u0B95\u0BBE\u0BAA\u0BCD\u0BAA\u0BC1:** \u0BAA\u0BA3\u0BAE\u0BCD \u0BAA\u0BC6\u0BB1 \u0B92\u0BB0\u0BC1\u0BAA\u0BCB\u0BA4\u0BC1\u0BAE\u0BCD UPI PIN \u0B90 \u0B89\u0BB3\u0BCD\u0BB3\u0BBF\u0B9F \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BBE\u0BAE\u0BCD.
3. **\u0B9F\u0BBF\u0B9C\u0BBF\u0B9F\u0BCD\u0B9F\u0BB2\u0BCD \u0BB5\u0BBF\u0BB1\u0BCD\u0BAA\u0BA9\u0BC8:** WhatsApp Business \u0B95\u0BC7\u0B9F\u0BCD\u0BB2\u0BBE\u0B95\u0BCD \u0BAE\u0BC2\u0BB2\u0BAE\u0BCD \u0BAA\u0BC1\u0BA4\u0BBF\u0BAF \u0BB5\u0BBE\u0B9F\u0BBF\u0B95\u0BCD\u0B95\u0BC8\u0BAF\u0BBE\u0BB3\u0BB0\u0BCD\u0B95\u0BB3\u0BC8 \u0B85\u0B9F\u0BC8\u0BAF\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD.
\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0B8E\u0BA9\u0BCD\u0BA9 \u0B89\u0BA4\u0BB5\u0BBF \u0BA4\u0BC7\u0BB5\u0BC8?`;
  } else if (language === "te") {
    return `${langMeta.greeting} \u0C2E\u0C40 \u0C35\u0C4D\u0C2F\u0C3E\u0C2A\u0C3E\u0C30 \u0C35\u0C3F\u0C1C\u0C2F\u0C3E\u0C28\u0C3F\u0C15\u0C3F 3 \u0C2E\u0C41\u0C16\u0C4D\u0C2F\u0C2E\u0C48\u0C28 \u0C38\u0C42\u0C24\u0C4D\u0C30\u0C3E\u0C32\u0C41:
1. **\u0C38\u0C30\u0C48\u0C28 \u0C32\u0C3E\u0C2D\u0C02:** \u0C2E\u0C41\u0C21\u0C3F \u0C38\u0C30\u0C41\u0C15\u0C41\u0C32\u0C24\u0C4B \u0C2A\u0C3E\u0C1F\u0C41 \u0C2E\u0C40 \u0C36\u0C4D\u0C30\u0C2E \u0C16\u0C30\u0C4D\u0C1A\u0C41\u0C28\u0C41 \u0C15\u0C42\u0C21\u0C3E \u0C32\u0C46\u0C15\u0C4D\u0C15\u0C3F\u0C02\u0C1A\u0C02\u0C21\u0C3F.
2. **\u0C2D\u0C26\u0C4D\u0C30\u0C24:** \u0C21\u0C2C\u0C4D\u0C2C\u0C41\u0C32\u0C41 \u0C38\u0C4D\u0C35\u0C40\u0C15\u0C30\u0C3F\u0C02\u0C1A\u0C21\u0C3E\u0C28\u0C3F\u0C15\u0C3F \u0C0E\u0C2A\u0C4D\u0C2A\u0C41\u0C21\u0C42 UPI PIN \u0C0E\u0C02\u0C1F\u0C30\u0C4D \u0C1A\u0C47\u0C2F\u0C35\u0C26\u0C4D\u0C26\u0C41.
3. **\u0C2E\u0C3E\u0C30\u0C4D\u0C15\u0C46\u0C1F\u0C3F\u0C02\u0C17\u0C4D:** WhatsApp Business \u0C26\u0C4D\u0C35\u0C3E\u0C30\u0C3E \u0C2E\u0C40 \u0C09\u0C24\u0C4D\u0C2A\u0C24\u0C4D\u0C24\u0C41\u0C32\u0C28\u0C41 \u0C2A\u0C4D\u0C30\u0C1A\u0C3E\u0C30\u0C02 \u0C1A\u0C47\u0C2F\u0C02\u0C21\u0C3F.
\u0C2E\u0C40\u0C15\u0C41 \u0C0F \u0C05\u0C02\u0C36\u0C02\u0C32\u0C4B \u0C38\u0C39\u0C3E\u0C2F\u0C02 \u0C15\u0C3E\u0C35\u0C3E\u0C32\u0C3F?`;
  } else if (language === "gu") {
    return `${langMeta.greeting} \u0AB5\u0ACD\u0AAF\u0AB5\u0AB8\u0ABE\u0AAF\u0AAE\u0ABE\u0A82 \u0AAA\u0ACD\u0AB0\u0A97\u0AA4\u0ABF \u0A85\u0AA8\u0AC7 \u0AA8\u0AAB\u0ABE \u0AAE\u0ABE\u0A9F\u0AC7 3 \u0AB8\u0AC1\u0AB5\u0AB0\u0ACD\u0AA3 \u0AA8\u0ABF\u0AAF\u0AAE\u0ACB:
1. **\u0A95\u0ABF\u0A82\u0AAE\u0AA4 \u0A85\u0AA8\u0AC7 \u0AA8\u0AAB\u0ACB:** \u0A95\u0ABE\u0A9A\u0ABE \u0AAE\u0ABE\u0AB2 \u0AB8\u0ABE\u0AA5\u0AC7 \u0AA4\u0AAE\u0ABE\u0AB0\u0AC0 \u0AAE\u0AB9\u0AC7\u0AA8\u0AA4 \u0A85\u0AA8\u0AC7 \u0AAA\u0AC7\u0A95\u0ABF\u0A82\u0A97 \u0A96\u0AB0\u0ACD\u0A9A \u0AB9\u0A82\u0AAE\u0AC7\u0AB6\u0ABE \u0A89\u0AAE\u0AC7\u0AB0\u0ACB.
2. **\u0AA1\u0ABF\u0A9C\u0ABF\u0A9F\u0AB2 \u0AB8\u0AC1\u0AB0\u0A95\u0ACD\u0AB7\u0ABE:** \u0AAA\u0AC8\u0AB8\u0ABE \u0AAE\u0AC7\u0AB3\u0AB5\u0AB5\u0ABE \u0AAE\u0ABE\u0A9F\u0AC7 \u0A95\u0ACD\u0AAF\u0ABE\u0AB0\u0AC7\u0AAF UPI PIN \u0AA8\u0ABE\u0A96\u0AB5\u0ACB \u0AAA\u0AA1\u0AA4\u0ACB \u0AA8\u0AA5\u0AC0.
3. **\u0A97\u0ACD\u0AB0\u0ABE\u0AB9\u0A95 \u0AB8\u0AC7\u0AB5\u0ABE:** \u0AB5\u0ACB\u0A9F\u0ACD\u0AB8\u0A8F\u0AAA \u0AAC\u0ABF\u0A9D\u0AA8\u0AC7\u0AB8 \u0A95\u0AC7\u0A9F\u0AC7\u0AB2\u0ACB\u0A97 \u0AAC\u0AA8\u0ABE\u0AB5\u0AC0 \u0A97\u0ACD\u0AB0\u0ABE\u0AB9\u0A95\u0ACB \u0AB8\u0AC1\u0AA7\u0AC0 \u0AAA\u0AB9\u0ACB\u0A82\u0A9A\u0ACB.
\u0AA4\u0AAE\u0AA8\u0AC7 \u0A95\u0AAF\u0ABE \u0AB5\u0ABF\u0AB7\u0AAF\u0AAE\u0ABE\u0A82 \u0AB8\u0AB9\u0ABE\u0AAF \u0A9C\u0ACB\u0A88\u0A8F \u0A9B\u0AC7?`;
  } else if (language === "kn") {
    return `${langMeta.greeting} \u0CA8\u0CBF\u0CAE\u0CCD\u0CAE \u0CB5\u0CCD\u0CAF\u0CB5\u0CB9\u0CBE\u0CB0\u0CA6 \u0CAC\u0CC6\u0CB3\u0CB5\u0CA3\u0CBF\u0C97\u0CC6\u0C97\u0CC6 3 \u0CAE\u0CC1\u0C96\u0CCD\u0CAF \u0CB8\u0CC2\u0CA4\u0CCD\u0CB0\u0C97\u0CB3\u0CC1:
1. **\u0CAC\u0CC6\u0CB2\u0CC6 \u0CA8\u0CBF\u0C97\u0CA6\u0CBF:** \u0C95\u0C9A\u0CCD\u0C9A\u0CBE \u0CB8\u0CBE\u0CAE\u0C97\u0CCD\u0CB0\u0CBF\u0C97\u0CB3 \u0C9C\u0CCA\u0CA4\u0CC6\u0C97\u0CC6 \u0CA8\u0CBF\u0CAE\u0CCD\u0CAE \u0CB6\u0CCD\u0CB0\u0CAE\u0CA6 \u0CB5\u0CC6\u0C9A\u0CCD\u0C9A\u0CB5\u0CA8\u0CCD\u0CA8\u0CC2 \u0CB8\u0CC7\u0CB0\u0CBF\u0CB8\u0CBF \u0CB2\u0CC6\u0C95\u0CCD\u0C95 \u0CB9\u0CBE\u0C95\u0CBF.
2. **\u0CA1\u0CBF\u0C9C\u0CBF\u0C9F\u0CB2\u0CCD \u0CB8\u0CC1\u0CB0\u0C95\u0CCD\u0CB7\u0CA4\u0CC6:** \u0CB9\u0CA3 \u0CB8\u0CCD\u0CB5\u0CC0\u0C95\u0CB0\u0CBF\u0CB8\u0CB2\u0CC1 \u0C8E\u0C82\u0CA6\u0CBF\u0C97\u0CC2 UPI PIN \u0CA8\u0CAE\u0CC2\u0CA6\u0CBF\u0CB8\u0CAC\u0CC7\u0CA1\u0CBF.
3. **\u0CAE\u0CBE\u0CB0\u0CCD\u0C95\u0CC6\u0C9F\u0CBF\u0C82\u0C97\u0CCD:** WhatsApp Business \u0C95\u0CCD\u0CAF\u0CBE\u0C9F\u0CB2\u0CBE\u0C97\u0CCD \u0CAE\u0CC2\u0CB2\u0C95 \u0CAA\u0CCD\u0CB0\u0C9A\u0CBE\u0CB0 \u0CAE\u0CBE\u0CA1\u0CBF.
\u0CA8\u0CBF\u0CAE\u0C97\u0CC6 \u0CAF\u0CBE\u0CB5 \u0CB5\u0CBF\u0CB7\u0CAF\u0CA6\u0CB2\u0CCD\u0CB2\u0CBF \u0CAE\u0CBE\u0CB9\u0CBF\u0CA4\u0CBF \u0CAC\u0CC7\u0C95\u0CC1?`;
  } else {
    if (query.includes("profit") || query.includes("price") || query.includes("cost") || query.includes("margin")) {
      return `Hello! Here is the golden formula to calculate your profit:

1. **Total Cost** = Raw Materials + Your Labor/Time + Packaging & Transport.
2. **Selling Price** = Total Cost + Your Desired Margin (usually 25% to 40%).
3. **Key tip:** Never treat your own time as free! Always include reasonable labor charges in the cost.

Try our interactive **Profit Calculator** in the Business Toolkit tab!`;
    }
    if (query.includes("upi") || query.includes("otp") || query.includes("safety") || query.includes("scam") || query.includes("pin")) {
      return `The #1 Golden Rule of Digital Safety:

\u26A0\uFE0F **You NEVER need to enter your UPI PIN to RECEIVE money.** Entering a UPI PIN always deducts money from your account.

1. Never share OTP or UPI PIN with anyone, even if they claim to be from the bank.
2. Beware of fake payment screenshots. Always verify incoming money in your bank SMS or soundbox.`;
    }
    return `Welcome to SakhiBiz! As your digital mentor, I am here to help you grow your venture.

Core micro-business foundations:
1. Maintain a daily ledger of income and expenses.
2. Offer fair, profitable pricing that respects your time.
3. Use secure digital payment methods like UPI QR.

How can I help you today? Ask about pricing, marketing, safe payments, or government schemes!`;
  }
}
async function parseBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => {
      resolve({});
    });
  });
}
async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }
  try {
    const body = await parseBody(req);
    const { message, language = "hi", history = [] } = body;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "A valid message string is required." });
    }
    if (message.length > 1500) {
      return res.status(400).json({ error: "Message exceeds 1500 characters limit." });
    }
    const validLanguages = ["hi", "en", "mr", "bn", "ta", "te", "gu", "kn"];
    const cleanLang = validLanguages.includes(language) ? language : "hi";
    const langMeta = LANGUAGE_META[cleanLang] || LANGUAGE_META["hi"];
    try {
      const { AiKeyManager: AiKeyManager2 } = await Promise.resolve().then(() => (init_keyManager(), keyManager_exports));
      const systemPrompt = `
${SAKHI_SYSTEM_INSTRUCTION}
Target Language: ${langMeta.name} (${langMeta.script})
Always respond concisely (under 180 words), step-by-step, with practical examples in fluent, natural, culturally warm ${langMeta.name} using ${langMeta.script}. Address the learner warmly with a traditional greeting (${langMeta.greeting}).
`.trim();
      const formattedHistory = Array.isArray(history) ? history.slice(-6).filter((item) => typeof item?.text === "string" && item.text.trim().length > 0).map((item) => ({
        role: item.role === "user" ? "user" : "assistant",
        text: item.text.slice(0, 400)
      })) : [];
      const completion = await AiKeyManager2.generateCompletion({
        preferredProvider: "groq",
        systemPrompt,
        userPrompt: message.trim(),
        history: formattedHistory,
        temperature: 0.5,
        maxTokens: 600
      });
      return res.status(200).json({
        reply: completion.text || `${langMeta.greeting} ${getRegionalFallback(message, cleanLang)}`,
        source: `${completion.provider}:${completion.model}`,
        language: cleanLang,
        retries: completion.retries
      });
    } catch (aiErr) {
      console.warn(
        "AI generation failed or unavailable across providers, using regional knowledge engine:",
        aiErr?.message || aiErr
      );
      return res.status(200).json({
        reply: getRegionalFallback(message, cleanLang),
        source: "regional_knowledge_engine",
        language: cleanLang
      });
    }
  } catch (err) {
    console.error("SakhiBiz AI handler error:", err?.message || "unexpected error");
    return res.status(500).json({
      error: "An internal error occurred processing the chat request."
    });
  }
}

// api/ai/simplify-lesson.ts
async function parseBody2(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => {
      resolve({});
    });
  });
}
async function handler2(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }
  try {
    const body = await parseBody2(req);
    const { topic, context, language = "hi" } = body;
    const validLanguages = ["hi", "en", "mr", "bn", "ta", "te", "gu", "kn"];
    const cleanLang = validLanguages.includes(language) ? language : "hi";
    const LANGUAGE_NAMES = {
      hi: { name: "Hindi", script: "Devanagari script" },
      en: { name: "English", script: "Simple English" },
      mr: { name: "Marathi", script: "Devanagari script (\u092E\u0930\u093E\u0920\u0940)" },
      bn: { name: "Bengali", script: "Bengali script (\u09AC\u09BE\u0982\u09B2\u09BE)" },
      ta: { name: "Tamil", script: "Tamil script (\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD)" },
      te: { name: "Telugu", script: "Telugu script (\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41)" },
      gu: { name: "Gujarati", script: "Gujarati script (\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0)" },
      kn: { name: "Kannada", script: "Kannada script (\u0C95\u0CA8\u0CCD\u0CA8\u0CA1)" }
    };
    const langInfo = LANGUAGE_NAMES[cleanLang] || LANGUAGE_NAMES["hi"];
    try {
      const { AiKeyManager: AiKeyManager2 } = await Promise.resolve().then(() => (init_keyManager(), keyManager_exports));
      const prompt = `
You are Sakhi, a patient educator for rural and semi-urban Indian women entrepreneurs.
Explain this business concept in very simple, storytelling everyday terms with a relatable rural micro-business example (e.g. tailoring, making snacks, selling dairy or textiles).

Concept: "${typeof topic === "string" ? topic.slice(0, 200) : ""}"
Context: "${typeof context === "string" ? context.slice(0, 500) : ""}"
Target Language: ${langInfo.name} (${langInfo.script})

Format:
- 1 clear headline
- Simple real-life grassroots micro-business example
- 3 key practical bullet points
- 1 practical takeaway
Respond entirely and fluently in ${langInfo.name} using ${langInfo.script}. Keep under 150 words.
`;
      const completion = await AiKeyManager2.generateCompletion({
        preferredProvider: "gemini",
        userPrompt: prompt,
        temperature: 0.4,
        maxTokens: 500
      });
      if (completion?.text) {
        return res.status(200).json({
          simplifiedContent: completion.text,
          source: `${completion.provider}:${completion.model}`,
          language: cleanLang,
          retries: completion.retries
        });
      }
    } catch (e) {
      console.warn("AI simplification deferred to curated regional fallback:", e?.message || "unknown error");
    }
    let simplified = "";
    if (cleanLang === "hi") {
      simplified = `**\u0938\u0930\u0932 \u0936\u092C\u094D\u0926\u094B\u0902 \u092E\u0947\u0902 \u0938\u092E\u091D\u0947\u0902: ${topic || "\u092F\u0939 \u0935\u094D\u092F\u093E\u0935\u0938\u093E\u092F\u093F\u0915 \u0928\u093F\u092F\u092E"}**

**\u0909\u0926\u093E\u0939\u0930\u0923:** \u092E\u093E\u0928 \u0932\u0940\u091C\u093F\u090F \u0938\u0941\u0928\u0940\u0924\u093E \u0926\u0940\u0926\u0940 \u090F\u0915 \u0915\u0941\u0930\u094D\u0924\u0940 \u0938\u093F\u0932\u0924\u0940 \u0939\u0948\u0902\u0964 \u0915\u092A\u0921\u093C\u0947 \u0915\u093E \u0916\u0930\u094D\u091A \u20B9200 \u0939\u0941\u0906 \u0914\u0930 \u0927\u093E\u0917\u0947-\u092C\u091F\u0928 \u0915\u093E \u20B920\u0964 \u092F\u0926\u093F \u0935\u0947 \u0905\u092A\u0928\u0940 3 \u0918\u0902\u091F\u0947 \u0915\u0940 \u0938\u093F\u0932\u093E\u0908 \u092E\u0947\u0939\u0928\u0924 \u0915\u0947 \u20B9100 \u0928 \u091C\u094B\u0921\u093C\u0947\u0902, \u0924\u094B \u0935\u0947 \u0905\u0938\u0932 \u092E\u0947\u0902 \u0918\u093E\u091F\u0947 \u092E\u0947\u0902 \u0930\u0939\u0947\u0902\u0917\u0940! \u091C\u092C \u0935\u0947 \u0915\u0941\u0932 \u0932\u093E\u0917\u0924 \u20B9320 \u092E\u0947\u0902 \u20B980 \u0905\u092A\u0928\u093E \u092E\u0941\u0928\u093E\u092B\u093E \u091C\u094B\u0921\u093C\u0915\u0930 \u20B9400 \u092E\u0947\u0902 \u092C\u0947\u091A\u0947\u0902\u0917\u0940, \u0924\u092D\u0940 \u0909\u0928\u0915\u093E \u0935\u094D\u092F\u093E\u092A\u093E\u0930 \u0924\u0930\u0915\u094D\u0915\u0940 \u0915\u0930\u0947\u0917\u093E\u0964

- **\u092E\u0941\u0916\u094D\u092F \u0938\u0940\u0916 1:** \u0905\u092A\u0928\u093E \u0938\u092E\u092F \u0915\u092D\u0940 \u092E\u0941\u092B\u093C\u094D\u0924 \u092E\u0924 \u092E\u093E\u0928\u093F\u090F\u0964
- **\u092E\u0941\u0916\u094D\u092F \u0938\u0940\u0916 2:** \u0939\u0930 \u091B\u094B\u091F\u0947 \u0916\u0930\u094D\u091A\u0947 (\u092C\u093F\u091C\u0932\u0940, \u0927\u093E\u0917\u093E, \u0915\u093F\u0930\u093E\u092F\u093E) \u0915\u094B \u091C\u094B\u0921\u093C\u0947\u0902\u0964
- **\u092E\u0941\u0916\u094D\u092F \u0938\u0940\u0916 3:** \u0939\u093F\u0938\u093E\u092C \u0938\u093E\u092B\u093C \u0930\u0916\u0947\u0902 \u0924\u093E\u0915\u093F \u092E\u0939\u0940\u0928\u0947 \u0915\u0947 \u0905\u0902\u0924 \u092E\u0947\u0902 \u092C\u091A\u0924 \u0926\u093F\u0916\u0947\u0964`;
    } else if (cleanLang === "mr") {
      simplified = `**\u0938\u094B\u092A\u094D\u092F\u093E \u092D\u093E\u0937\u0947\u0924 \u0938\u092E\u091C\u093E: ${topic || "\u0935\u094D\u092F\u093E\u0935\u0938\u093E\u092F\u093F\u0915 \u0928\u093F\u092F\u092E"}**

**\u0909\u0926\u093E\u0939\u0930\u0923:** \u0938\u092E\u091C\u093E \u0905\u0928\u093F\u0924\u093E \u0924\u093E\u0908 \u0915\u0941\u0930\u094D\u0924\u0940 \u0936\u093F\u0935\u0924\u093E\u0924. \u0915\u093E\u092A\u0921\u093E\u091A\u093E \u0916\u0930\u094D\u091A \u20B9\u0968\u0966\u0966 \u0906\u0923\u093F \u0927\u093E\u0917\u093E \u20B9\u0968\u0966 \u091D\u093E\u0932\u093E. \u091C\u0930 \u0924\u094D\u092F\u093E\u0902\u0928\u0940 \u0938\u094D\u0935\u0924\u0903\u091A\u094D\u092F\u093E \u0936\u094D\u0930\u092E\u093E\u091A\u0947 \u20B9\u0967\u0966\u0966 \u0927\u0930\u0932\u0947 \u0928\u093E\u0939\u0940\u0924, \u0924\u0930 \u0924\u094D\u092F\u093E \u0924\u094B\u091F\u094D\u092F\u093E\u0924 \u0930\u093E\u0939\u0924\u0940\u0932! \u091C\u0947\u0935\u094D\u0939\u093E \u0924\u094D\u092F\u093E \u090F\u0915\u0942\u0923 \u0916\u0930\u094D\u091A \u20B9\u0969\u0968\u0966 \u0935\u0930 \u20B9\u096E\u0966 \u0928\u092B\u093E \u091C\u094B\u0921\u0942\u0928 \u20B9\u096A\u0966\u0966 \u0932\u093E \u0935\u093F\u0915\u0924\u0940\u0932, \u0924\u0947\u0935\u094D\u0939\u093E\u091A \u0916\u0930\u0940 \u0915\u092E\u093E\u0908 \u0939\u094B\u0908\u0932.

- **\u092E\u0941\u0916\u094D\u092F \u0938\u0942\u0924\u094D\u0930 \u0967:** \u0938\u094D\u0935\u0924\u0903\u091A\u0940 \u092E\u0947\u0939\u0928\u0924 \u0915\u0927\u0940\u0939\u0940 \u092E\u094B\u092B\u0924 \u0927\u0930\u0942 \u0928\u0915\u093E.
- **\u092E\u0941\u0916\u094D\u092F \u0938\u0942\u0924\u094D\u0930 \u0968:** \u092A\u094D\u0930\u0924\u094D\u092F\u0947\u0915 \u0932\u0939\u093E\u0928 \u0916\u0930\u094D\u091A \u0939\u093F\u0936\u094B\u092C\u093E\u0924 \u0928\u094B\u0902\u0926\u0935\u093E.
- **\u092E\u0941\u0916\u094D\u092F \u0938\u0942\u0924\u094D\u0930 \u0969:** \u0926\u0948\u0928\u0902\u0926\u093F\u0928 \u0928\u094B\u0902\u0926 \u0920\u0947\u0935\u093E.`;
    } else if (cleanLang === "bn") {
      simplified = `**\u09B8\u09B9\u099C \u0995\u09A5\u09BE\u09AF\u09BC \u09AC\u09C1\u099D\u09C1\u09A8: ${topic || "\u09AC\u09CD\u09AF\u09AC\u09B8\u09BE\u09AF\u09BC\u09BF\u0995 \u09A8\u09BF\u09AF\u09BC\u09AE"}**

**\u0989\u09A6\u09BE\u09B9\u09B0\u09A3:** \u09AE\u09A8\u09C7 \u0995\u09B0\u09C1\u09A8 \u0985\u09A8\u09BF\u09A4\u09BE \u09A6\u09BF\u09A6\u09BF \u0986\u099A\u09BE\u09B0 \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09C7\u09A8\u0964 \u09AE\u09B6\u09B2\u09BE \u0993 \u0995\u09BE\u0981\u099A\u09BE\u09AE\u09BE\u09B2\u09C7\u09B0 \u0996\u09B0\u099A \u20B9\u09E8\u09E6\u09E6\u0964 \u0995\u09BF\u09A8\u09CD\u09A4\u09C1 \u09AF\u09A6\u09BF \u09A8\u09BF\u099C\u09C7\u09B0 \u09E9 \u0998\u09A3\u09CD\u099F\u09BE\u09B0 \u09AA\u09B0\u09BF\u09B6\u09CD\u09B0\u09AE\u09C7\u09B0 \u09AE\u09C2\u09B2\u09CD\u09AF \u09A8\u09BE \u09A7\u09B0\u09C7\u09A8, \u09A4\u09AC\u09C7 \u09AA\u09CD\u09B0\u0995\u09C3\u09A4 \u09B2\u09BE\u09AD \u09A6\u09C7\u0996\u09BE \u09AF\u09BE\u09AC\u09C7 \u09A8\u09BE\u0964 \u0995\u09BE\u0981\u099A\u09BE\u09AE\u09BE\u09B2 \u0993 \u09B6\u09CD\u09B0\u09AE \u09AE\u09BF\u09B2\u09BF\u09AF\u09BC\u09C7 \u20B9\u09E9\u09E8\u09E6 \u0996\u09B0\u099A \u09A7\u09B0\u09C7 \u09A4\u09BE\u09B0 \u0989\u09AA\u09B0 \u20B9\u09EE\u09E6 \u09B2\u09BE\u09AD \u09AF\u09CB\u0997 \u0995\u09B0\u09C7 \u20B9\u09EA\u09E6\u09E6 \u09AE\u09C2\u09B2\u09CD\u09AF\u09C7 \u09AC\u09BF\u0995\u09CD\u09B0\u09BF \u0995\u09B0\u09BE\u0987 \u09B8\u09A0\u09BF\u0995 \u09A8\u09BF\u09AF\u09BC\u09AE\u0964

- **\u09AE\u09C2\u09B2 \u09B6\u09BF\u0995\u09CD\u09B7\u09BE \u09E7:** \u09A8\u09BF\u099C\u09C7\u09B0 \u09B8\u09AE\u09AF\u09BC \u0993 \u09AA\u09B0\u09BF\u09B6\u09CD\u09B0\u09AE\u09C7\u09B0 \u09B8\u09A0\u09BF\u0995 \u09AE\u09C2\u09B2\u09CD\u09AF \u09A6\u09BF\u09A8\u0964
- **\u09AE\u09C2\u09B2 \u09B6\u09BF\u0995\u09CD\u09B7\u09BE \u09E8:** \u09AA\u09CD\u09B0\u09A4\u09BF\u099F\u09BF \u099B\u09CB\u099F \u0996\u09B0\u099A \u0996\u09BE\u09A4\u09BE\u09AF\u09BC \u09B2\u09BF\u0996\u09C7 \u09B0\u09BE\u0996\u09C1\u09A8\u0964
- **\u09AE\u09C2\u09B2 \u09B6\u09BF\u0995\u09CD\u09B7\u09BE \u09E9:** \u09A8\u09BF\u09AF\u09BC\u09AE\u09BF\u09A4 \u09A1\u09BF\u099C\u09BF\u099F\u09BE\u09B2 \u09AE\u09BE\u09A7\u09CD\u09AF\u09AE\u09C7 \u09AC\u09BF\u0995\u09CD\u09B0\u09BF \u09AC\u09BE\u09A1\u09BC\u09BE\u09A8\u0964`;
    } else if (cleanLang === "ta") {
      simplified = `**\u0B8E\u0BB3\u0BBF\u0BAF \u0BAE\u0BC1\u0BB1\u0BC8\u0BAF\u0BBF\u0BB2\u0BCD \u0BAA\u0BC1\u0BB0\u0BBF\u0BA8\u0BCD\u0BA4\u0BC1\u0B95\u0BCA\u0BB3\u0BCD\u0BB3\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: ${topic || "\u0BB5\u0BA3\u0BBF\u0B95 \u0BB5\u0BBF\u0BA4\u0BBF"}**

**\u0B89\u0BA4\u0BBE\u0BB0\u0BA3\u0BAE\u0BCD:** \u0B85\u0BA9\u0BBF\u0BA4\u0BBE \u0B85\u0B95\u0BCD\u0B95\u0BBE \u0BA4\u0BC8\u0BAF\u0BB2\u0BCD \u0BA4\u0BC8\u0B95\u0BCD\u0B95\u0BBF\u0BB1\u0BBE\u0BB0\u0BCD. \u0BA4\u0BC1\u0BA3\u0BBF \u0B9A\u0BC6\u0BB2\u0BB5\u0BC1 \u20B9200 \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BA8\u0BC2\u0BB2\u0BCD \u0B9A\u0BC6\u0BB2\u0BB5\u0BC1 \u20B920. \u0BA4\u0BA9\u0BCD \u0B89\u0BB4\u0BC8\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u20B9100 \u0B9A\u0BC7\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BBE\u0BB5\u0BBF\u0B9F\u0BCD\u0B9F\u0BBE\u0BB2\u0BCD \u0B85\u0BA4\u0BC1 \u0BA8\u0BB7\u0BCD\u0B9F\u0BAE\u0BC7! \u0BAE\u0BCA\u0BA4\u0BCD\u0BA4 \u0B9A\u0BC6\u0BB2\u0BB5\u0BC1 \u20B9320 \u0B89\u0B9F\u0BA9\u0BCD \u20B980 \u0BB2\u0BBE\u0BAA\u0BAE\u0BCD \u0B9A\u0BC7\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BC1 \u20B9400\u0B95\u0BCD\u0B95\u0BC1 \u0BB5\u0BBF\u0BB1\u0BCD\u0BB1\u0BBE\u0BB2\u0BCD \u0BA4\u0BBE\u0BA9\u0BCD \u0BA4\u0BCA\u0BB4\u0BBF\u0BB2\u0BCD \u0BB5\u0BB3\u0BB0\u0BC1\u0BAE\u0BCD.

- **\u0BAE\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BAF \u0B95\u0BC1\u0BB1\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1 1:** \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B89\u0BB4\u0BC8\u0BAA\u0BCD\u0BAA\u0BC8 \u0B87\u0BB2\u0BB5\u0B9A\u0BAE\u0BBE\u0B95 \u0B95\u0BB0\u0BC1\u0BA4\u0BBE\u0BA4\u0BC0\u0BB0\u0BCD\u0B95\u0BB3\u0BCD.
- **\u0BAE\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BAF \u0B95\u0BC1\u0BB1\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1 2:** \u0B9A\u0BBF\u0BB1\u0BC1 \u0B9A\u0BC6\u0BB2\u0BB5\u0BC1\u0B95\u0BB3\u0BC8\u0BAF\u0BC1\u0BAE\u0BCD \u0B95\u0BA3\u0B95\u0BCD\u0B95\u0BBF\u0BB2\u0BCD \u0B9A\u0BC7\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.
- **\u0BAE\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BAF \u0B95\u0BC1\u0BB1\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1 3:** \u0BA4\u0BBF\u0BA9\u0B9A\u0BB0\u0BBF \u0B95\u0BA3\u0B95\u0BCD\u0B95\u0BC8 \u0B9A\u0BB0\u0BBF\u0BAF\u0BBE\u0B95 \u0BAA\u0BB0\u0BBE\u0BAE\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.`;
    } else if (cleanLang === "te") {
      simplified = `**\u0C38\u0C41\u0C32\u0C2D\u0C02\u0C17\u0C3E \u0C05\u0C30\u0C4D\u0C25\u0C02 \u0C1A\u0C47\u0C38\u0C41\u0C15\u0C4B\u0C02\u0C21\u0C3F: ${topic || "\u0C35\u0C4D\u0C2F\u0C3E\u0C2A\u0C3E\u0C30 \u0C38\u0C42\u0C24\u0C4D\u0C30\u0C02"}**

**\u0C09\u0C26\u0C3E\u0C39\u0C30\u0C23:** \u0C05\u0C28\u0C3F\u0C24 \u0C05\u0C15\u0C4D\u0C15 \u0C2C\u0C1F\u0C4D\u0C1F\u0C32\u0C41 \u0C15\u0C41\u0C21\u0C41\u0C24\u0C41\u0C02\u0C26\u0C3F. \u0C15\u0C4D\u0C32\u0C3E\u0C24\u0C4D \u0C16\u0C30\u0C4D\u0C1A\u0C41 \u20B9200, \u0C26\u0C3E\u0C30\u0C3E\u0C32\u0C41 \u20B920. \u0C24\u0C28 3 \u0C17\u0C02\u0C1F\u0C32 \u0C15\u0C37\u0C4D\u0C1F\u0C3E\u0C28\u0C3F\u0C15\u0C3F \u20B9100 \u0C15\u0C32\u0C2A\u0C15\u0C2A\u0C4B\u0C24\u0C47 \u0C28\u0C37\u0C4D\u0C1F\u0C2E\u0C47 \u0C35\u0C38\u0C4D\u0C24\u0C41\u0C02\u0C26\u0C3F! \u0C2E\u0C4A\u0C24\u0C4D\u0C24\u0C02 \u0C16\u0C30\u0C4D\u0C1A\u0C41 \u20B9320 \u0C2A\u0C48 \u20B980 \u0C32\u0C3E\u0C2D\u0C02 \u0C15\u0C32\u0C3F\u0C2A\u0C3F \u20B9400\u0C15\u0C41 \u0C05\u0C2E\u0C4D\u0C2E\u0C3F\u0C24\u0C47\u0C28\u0C47 \u0C35\u0C4D\u0C2F\u0C3E\u0C2A\u0C3E\u0C30\u0C02 \u0C35\u0C43\u0C26\u0C4D\u0C27\u0C3F \u0C1A\u0C46\u0C02\u0C26\u0C41\u0C24\u0C41\u0C02\u0C26\u0C3F.

- **\u0C2E\u0C41\u0C16\u0C4D\u0C2F \u0C38\u0C42\u0C24\u0C4D\u0C30\u0C02 1:** \u0C2E\u0C40 \u0C36\u0C4D\u0C30\u0C2E\u0C28\u0C41 \u0C09\u0C1A\u0C3F\u0C24\u0C02\u0C17\u0C3E \u0C2D\u0C3E\u0C35\u0C3F\u0C02\u0C1A\u0C35\u0C26\u0C4D\u0C26\u0C41.
- **\u0C2E\u0C41\u0C16\u0C4D\u0C2F \u0C38\u0C42\u0C24\u0C4D\u0C30\u0C02 2:** \u0C2A\u0C4D\u0C30\u0C24\u0C3F \u0C1A\u0C3F\u0C28\u0C4D\u0C28 \u0C16\u0C30\u0C4D\u0C1A\u0C41\u0C28\u0C41 \u0C32\u0C46\u0C15\u0C4D\u0C15\u0C3F\u0C02\u0C1A\u0C02\u0C21\u0C3F.
- **\u0C2E\u0C41\u0C16\u0C4D\u0C2F \u0C38\u0C42\u0C24\u0C4D\u0C30\u0C02 3:** \u0C32\u0C3E\u0C2D\u0C3E\u0C28\u0C4D\u0C28\u0C3F \u0C38\u0C4D\u0C2A\u0C37\u0C4D\u0C1F\u0C02\u0C17\u0C3E \u0C28\u0C3F\u0C30\u0C4D\u0C23\u0C2F\u0C3F\u0C02\u0C1A\u0C02\u0C21\u0C3F.`;
    } else if (cleanLang === "gu") {
      simplified = `**\u0AB8\u0AB0\u0AB3 \u0AB6\u0AAC\u0ACD\u0AA6\u0ACB\u0AAE\u0ABE\u0A82 \u0AB8\u0AAE\u0A9C\u0ACB: ${topic || "\u0AB5\u0ACD\u0AAF\u0ABE\u0AAA\u0ABE\u0AB0 \u0AA8\u0ABF\u0AAF\u0AAE"}**

**\u0A89\u0AA6\u0ABE\u0AB9\u0AB0\u0AA3:** \u0AAE\u0ABE\u0AA8\u0AC0 \u0AB2\u0ACB \u0A95\u0AC7 \u0A85\u0AA8\u0ABF\u0AA4\u0ABE \u0AAC\u0AB9\u0AC7\u0AA8 \u0A95\u0AC1\u0AB0\u0ACD\u0AA4\u0AC0 \u0AB8\u0AC0\u0AB5\u0AC7 \u0A9B\u0AC7. \u0A95\u0ABE\u0AAA\u0AA1\u0AA8\u0ACB \u0A96\u0AB0\u0ACD\u0A9A \u20B9200 \u0A85\u0AA8\u0AC7 \u0AA6\u0ACB\u0AB0\u0ABE-\u0AAC\u0A9F\u0AA8\u0AA8\u0ACB \u20B920 \u0AA5\u0AAF\u0ACB. \u0A9C\u0ACB \u0AA4\u0AC7\u0A93 \u0AAA\u0ACB\u0AA4\u0ABE\u0AA8\u0AC0 3 \u0A95\u0AB2\u0ABE\u0A95\u0AA8\u0AC0 \u0AAE\u0AB9\u0AC7\u0AA8\u0AA4\u0AA8\u0ABE \u20B9100 \u0AA8 \u0A89\u0AAE\u0AC7\u0AB0\u0AC7, \u0AA4\u0ACB \u0AA4\u0AC7\u0A93 \u0AA8\u0AC1\u0A95\u0AB8\u0ABE\u0AA8\u0AAE\u0ABE\u0A82 \u0AB0\u0AB9\u0AC7\u0AB6\u0AC7! \u0A9C\u0ACD\u0AAF\u0ABE\u0AB0\u0AC7 \u0A95\u0AC1\u0AB2 \u0AAA\u0AA1\u0AA4\u0AB0 \u20B9320 \u0AAE\u0ABE\u0A82 \u20B980 \u0AA8\u0AAB\u0ACB \u0A89\u0AAE\u0AC7\u0AB0\u0AC0\u0AA8\u0AC7 \u20B9400 \u0AAE\u0ABE\u0A82 \u0AB5\u0AC7\u0A9A\u0AB6\u0AC7, \u0AA4\u0ACD\u0AAF\u0ABE\u0AB0\u0AC7 \u0A9C \u0AB8\u0ABE\u0A9A\u0ACB \u0AA8\u0AAB\u0ACB \u0AA5\u0AB6\u0AC7.

- **\u0AAE\u0AC1\u0A96\u0ACD\u0AAF \u0AB6\u0AC0\u0A96 1:** \u0AA4\u0AAE\u0ABE\u0AB0\u0AC0 \u0AAE\u0AB9\u0AC7\u0AA8\u0AA4\u0AA8\u0AC7 \u0A95\u0ACD\u0AAF\u0ABE\u0AB0\u0AC7\u0AAF \u0AAE\u0AAB\u0AA4 \u0AA8 \u0A97\u0AA3\u0ACB.
- **\u0AAE\u0AC1\u0A96\u0ACD\u0AAF \u0AB6\u0AC0\u0A96 2:** \u0AA6\u0AB0\u0AC7\u0A95 \u0AA8\u0ABE\u0AA8\u0ABE \u0A96\u0AB0\u0ACD\u0A9A\u0AA8\u0AC0 \u0AA8\u0ACB\u0A82\u0AA7 \u0AB0\u0ABE\u0A96\u0ACB.
- **\u0AAE\u0AC1\u0A96\u0ACD\u0AAF \u0AB6\u0AC0\u0A96 3:** \u0AB0\u0ACB\u0A9C\u0ABF\u0A82\u0AA6\u0ACB \u0AB9\u0ABF\u0AB8\u0ABE\u0AAC \u0A9A\u0ACB\u0A96\u0ACD\u0A96\u0ACB \u0AB0\u0ABE\u0A96\u0ACB.`;
    } else if (cleanLang === "kn") {
      simplified = `**\u0CB8\u0CB0\u0CB3\u0CB5\u0CBE\u0C97\u0CBF \u0C85\u0CB0\u0CCD\u0CA5\u0CAE\u0CBE\u0CA1\u0CBF\u0C95\u0CCA\u0CB3\u0CCD\u0CB3\u0CBF: ${topic || "\u0CB5\u0CCD\u0CAF\u0CB5\u0CB9\u0CBE\u0CB0 \u0CB8\u0CC2\u0CA4\u0CCD\u0CB0"}**

**\u0C89\u0CA6\u0CBE\u0CB9\u0CB0\u0CA3\u0CC6:** \u0C85\u0CA8\u0CBF\u0CA4\u0CBE \u0C85\u0C95\u0CCD\u0C95 \u0CAC\u0C9F\u0CCD\u0C9F\u0CC6 \u0CB9\u0CCA\u0CB2\u0CBF\u0CAF\u0CC1\u0CA4\u0CCD\u0CA4\u0CBE\u0CB0\u0CC6. \u0CAC\u0C9F\u0CCD\u0C9F\u0CC6 \u0C96\u0CB0\u0CCD\u0C9A\u0CC1 \u20B9200 \u0CAE\u0CA4\u0CCD\u0CA4\u0CC1 \u0CA6\u0CBE\u0CB0 \u20B920. \u0CA4\u0CAE\u0CCD\u0CAE 3 \u0C97\u0C82\u0C9F\u0CC6\u0C97\u0CB3 \u0CB6\u0CCD\u0CB0\u0CAE\u0C95\u0CCD\u0C95\u0CC6 \u20B9100 \u0CB8\u0CC7\u0CB0\u0CBF\u0CB8\u0CA6\u0CBF\u0CA6\u0CCD\u0CA6\u0CB0\u0CC6 \u0CA8\u0CB7\u0CCD\u0C9F\u0CB5\u0CBE\u0C97\u0CC1\u0CA4\u0CCD\u0CA4\u0CA6\u0CC6! \u0C92\u0C9F\u0CCD\u0C9F\u0CC1 \u0CB5\u0CC6\u0C9A\u0CCD\u0C9A \u20B9320 \u0C95\u0CCD\u0C95\u0CC6 \u20B980 \u0CB2\u0CBE\u0CAD \u0CB8\u0CC7\u0CB0\u0CBF\u0CB8\u0CBF \u20B9400 \u0C95\u0CCD\u0C95\u0CC6 \u0CAE\u0CBE\u0CB0\u0CBE\u0C9F \u0CAE\u0CBE\u0CA1\u0CBF\u0CA6\u0CB0\u0CC6 \u0CAE\u0CBE\u0CA4\u0CCD\u0CB0 \u0CA8\u0CBF\u0C9C\u0CB5\u0CBE\u0CA6 \u0CB2\u0CBE\u0CAD \u0CA6\u0CCA\u0CB0\u0CC6\u0CAF\u0CC1\u0CA4\u0CCD\u0CA4\u0CA6\u0CC6.

- **\u0CAE\u0CC1\u0C96\u0CCD\u0CAF \u0C85\u0C82\u0CB6 1:** \u0CA8\u0CBF\u0CAE\u0CCD\u0CAE \u0CB6\u0CCD\u0CB0\u0CAE\u0CB5\u0CA8\u0CCD\u0CA8\u0CC1 \u0C89\u0C9A\u0CBF\u0CA4\u0CB5\u0CC6\u0C82\u0CA6\u0CC1 \u0CA4\u0CBF\u0CB3\u0CBF\u0CAF\u0CAC\u0CC7\u0CA1\u0CBF.
- **\u0CAE\u0CC1\u0C96\u0CCD\u0CAF \u0C85\u0C82\u0CB6 2:** \u0C8E\u0CB2\u0CCD\u0CB2\u0CBE \u0CB8\u0CA3\u0CCD\u0CA3 \u0C96\u0CB0\u0CCD\u0C9A\u0CC1\u0C97\u0CB3\u0CA8\u0CCD\u0CA8\u0CC1 \u0CB2\u0CC6\u0C95\u0CCD\u0C95 \u0CB9\u0CBE\u0C95\u0CBF.
- **\u0CAE\u0CC1\u0C96\u0CCD\u0CAF \u0C85\u0C82\u0CB6 3:** \u0CAA\u0CCD\u0CB0\u0CA4\u0CBF\u0CA6\u0CBF\u0CA8\u0CB5\u0CC2 \u0C96\u0CB0\u0CCD\u0C9A\u0CC1-\u0CB5\u0CC6\u0C9A\u0CCD\u0C9A\u0CA6 \u0CB2\u0CC6\u0C95\u0CCD\u0C95 \u0C87\u0CB0\u0CBF\u0CB8\u0CBF.`;
    } else {
      simplified = `**In Simple Terms: ${topic || "Business Concept"}**

**Real-life Example:** If Anita makes a batch of homemade pickles, her raw spices and jars cost \u20B9300. If she spends 4 hours of hard work but charges \u20B90 for her labor, she isn't making real profit! When she counts \u20B9150 for her labor and adds a \u20B9100 profit margin, selling the batch for \u20B9550 gives her true growth.

- **Key Takeaway 1:** Your time and effort have real monetary value.
- **Key Takeaway 2:** Always account for small overheads like oil, packaging, and travel.
- **Key Takeaway 3:** Maintain a written daily record.`;
    }
    return res.status(200).json({
      simplifiedContent: simplified,
      source: "curated-regional-guide",
      language: cleanLang
    });
  } catch (err) {
    return res.status(500).json({
      error: "An internal error occurred simplifying the lesson."
    });
  }
}

// api/feedback.ts
async function parseBody3(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => {
      resolve({});
    });
  });
}
async function handler3(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }
  try {
    const body = await parseBody3(req);
    const { name, message } = body;
    if (!name || !message) {
      return res.status(400).json({ error: "Name and message are required." });
    }
    return res.status(200).json({
      success: true,
      message: "Feedback received successfully. Our team will review your suggestions!",
      id: `FB-${Date.now()}`
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error processing feedback." });
  }
}

// src/server/app.ts
init_db();
init_keyStore();
dotenv3.config();
var app = express();
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(["/api/auth", "/auth"], auth_default);
app.use(["/api/courses", "/courses"], courses_default);
app.use(["/api/admin/ai", "/admin/ai"], adminAi_default);
app.use(["/api/admin", "/admin"], admin_default);
app.all(["/api/ai/chat", "/ai/chat"], (req, res) => handler(req, res));
app.all(["/api/ai/simplify-lesson", "/ai/simplify-lesson"], (req, res) => handler2(req, res));
app.all(["/api/feedback", "/feedback"], (req, res) => handler3(req, res));
app.post(["/api/ai/live/session", "/ai/live/session"], async (req, res) => {
  try {
    const { geminiLiveSessionManager: geminiLiveSessionManager2 } = await Promise.resolve().then(() => (init_keyManager(), keyManager_exports));
    const { targetLanguage = "hi" } = req.body || {};
    const session = await geminiLiveSessionManager2.createSession({ targetLanguage });
    return res.status(200).json({ success: true, ...session, fallbackAudio: "hindi_original" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, fallbackAudio: "hindi_original" });
  }
});
app.post(["/api/ai/live/reconnect", "/ai/live/reconnect"], async (req, res) => {
  try {
    const { geminiLiveSessionManager: geminiLiveSessionManager2 } = await Promise.resolve().then(() => (init_keyManager(), keyManager_exports));
    const { sessionId, error } = req.body || {};
    if (!sessionId) return res.status(400).json({ success: false, error: "sessionId required" });
    const result = await geminiLiveSessionManager2.reconnectSession(sessionId, error);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, audioTrack: "hindi_original" });
  }
});
app.get(["/api/health", "/health"], async (req, res) => {
  const geminiConfigured = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0 && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" || (await AiKeyStore.getEligibleKeys("gemini")).length > 0);
  const groqConfigured = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0 || (await AiKeyStore.getEligibleKeys("groq")).length > 0);
  return res.status(200).json({
    status: "healthy",
    platform: "SakhiBiz Production Platform",
    services: {
      mongoAtlasConfigured: isMongoConfigured(),
      googleSheetsConfigured: isSheetsConfigured(),
      geminiAiConfigured: geminiConfigured,
      groqAiConfigured: groqConfigured,
      initialAdminConfigured: !!process.env.INITIAL_ADMIN_EMAIL
    },
    environment: process.env.NODE_ENV || "development",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var app_default = app;
export {
  app_default as default
};
