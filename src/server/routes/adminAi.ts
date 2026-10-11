import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth';
import { AiKeyStore } from '../ai/keyStore';
import { AiKeyManager } from '../ai/keyManager';
import { AiProvider, KeyStatus } from '../ai/types';
import { ActivityLog } from '../models/ActivityLog';
import crypto from 'crypto';

const router = Router();

// Strictly enforce ADMIN role on all AI configuration routes
router.use(requireAuth(['ADMIN']));

/**
 * Sanitizes a ManagedApiKey object so NO secrets (plain or encrypted) are sent to the client.
 */
function sanitizeKey(k: any) {
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
    successCount: k.successCount,
  };
}

/**
 * GET /api/admin/ai/overview
 * Returns masked keys, provider configurations, and real-time metrics.
 */
router.get('/overview', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [allKeys, groqConfig, geminiConfig, metrics] = await Promise.all([
      AiKeyStore.getAllKeys(),
      AiKeyStore.getProviderConfig('groq'),
      AiKeyStore.getProviderConfig('gemini'),
      AiKeyManager.getAdminMetrics(),
    ]);

    return res.status(200).json({
      success: true,
      keys: allKeys.map(sanitizeKey),
      configs: {
        groq: groqConfig,
        gemini: geminiConfig,
      },
      metrics,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch AI settings' });
  }
});

/**
 * POST /api/admin/ai/keys
 * Add one or multiple API keys (separated by commas or newlines) for Groq or Gemini.
 */
router.post('/keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { provider, rawKeys, projectId, orgId } = req.body;

    if (!provider || (provider !== 'groq' && provider !== 'gemini')) {
      return res.status(400).json({ error: 'Valid provider ("groq" or "gemini") is required.' });
    }

    if (!rawKeys || typeof rawKeys !== 'string' || rawKeys.trim().length === 0) {
      return res.status(400).json({ error: 'rawKeys string is required.' });
    }

    const result = await AiKeyStore.addKeys(provider as AiProvider, rawKeys, {
      projectId,
      orgId,
    });

    // Audit log
    try {
      await ActivityLog.create({
        eventId: `audit-ai-keys-add-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        actorUserId: req.tokenPayload!.userId,
        actorRole: req.tokenPayload!.role,
        action: 'AI_KEYS_ADD',
        targetId: provider,
        details: {
          provider,
          addedCount: result.added,
          skippedCount: result.skipped,
          projectId,
        },
      });
    } catch {
      // Non-blocking audit error
    }

    return res.status(200).json({
      success: true,
      added: result.added,
      skipped: result.skipped,
      keys: result.keys.map(sanitizeKey),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to add API keys' });
  }
});

/**
 * PATCH /api/admin/ai/keys/:keyId
 * Enable/disable a key or modify status/project grouping.
 */
router.patch('/keys/:keyId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { keyId } = req.params;
    const { enabled, status, projectId, orgId } = req.body;

    const updates: any = {};
    if (typeof enabled === 'boolean') {
      updates.enabled = enabled;
      if (!enabled) {
        updates.status = 'DISABLED';
      } else if (status) {
        updates.status = status;
      } else {
        updates.status = 'ACTIVE';
      }
    }

    if (status && ['ACTIVE', 'FAILED', 'TEMPORARILY_UNAVAILABLE', 'DISABLED', 'NEEDS_CONFIGURATION'].includes(status)) {
      updates.status = status as KeyStatus;
    }

    if (projectId !== undefined) updates.projectId = projectId;
    if (orgId !== undefined) updates.orgId = orgId;

    const updated = await AiKeyStore.updateKeyStatus(keyId, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Key not found' });
    }

    return res.status(200).json({ success: true, key: sanitizeKey(updated) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update key' });
  }
});

/**
 * DELETE /api/admin/ai/keys/:keyId
 * Permanently remove an API key from the store.
 */
router.delete('/keys/:keyId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { keyId } = req.params;
    const deleted = await AiKeyStore.deleteKey(keyId);

    if (!deleted) {
      return res.status(404).json({ error: 'Key not found' });
    }

    try {
      await ActivityLog.create({
        eventId: `audit-ai-keys-del-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        actorUserId: req.tokenPayload!.userId,
        actorRole: req.tokenPayload!.role,
        action: 'AI_KEY_DELETE',
        targetId: keyId,
      });
    } catch {
      // Non-blocking
    }

    return res.status(200).json({ success: true, message: 'Key removed successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete key' });
  }
});

/**
 * POST /api/admin/ai/keys/:keyId/test
 * Test connectivity for an individual key.
 */
router.post('/keys/:keyId/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { keyId } = req.params;
    const testResult = await AiKeyManager.testKeyConnectivity(keyId);

    return res.status(200).json({
      success: testResult.success,
      latencyMs: testResult.latencyMs,
      message: testResult.message,
      modelUsed: testResult.modelUsed,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Connectivity test error' });
  }
});

/**
 * PUT /api/admin/ai/config/:provider
 * Update model selection and rate limit controls.
 */
router.put('/config/:provider', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { provider } = req.params;
    if (provider !== 'groq' && provider !== 'gemini') {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const {
      preferredModel,
      maxRequestsPerMinute,
      maxDailyRequests,
      retryBudget,
      timeoutMs,
    } = req.body;

    const updates: any = {};
    if (preferredModel && typeof preferredModel === 'string') {
      updates.preferredModel = preferredModel.trim();
    }
    if (typeof maxRequestsPerMinute === 'number' && maxRequestsPerMinute > 0) {
      updates.maxRequestsPerMinute = maxRequestsPerMinute;
    }
    if (typeof maxDailyRequests === 'number' && maxDailyRequests > 0) {
      updates.maxDailyRequests = maxDailyRequests;
    }
    if (typeof retryBudget === 'number' && retryBudget >= 1 && retryBudget <= 5) {
      updates.retryBudget = retryBudget;
    }
    if (typeof timeoutMs === 'number' && timeoutMs >= 2000 && timeoutMs <= 30000) {
      updates.timeoutMs = timeoutMs;
    }

    const updatedConfig = await AiKeyStore.updateProviderConfig(provider as AiProvider, updates);

    return res.status(200).json({ success: true, config: updatedConfig });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update provider configuration' });
  }
});

export default router;
