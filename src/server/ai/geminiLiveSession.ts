import { AiKeyStore } from './keyStore';
import { ManagedApiKey, ErrorCategory } from './types';
import { ProviderApiError } from './groqProvider';

export type LiveSessionStatus =
  | 'INITIALIZING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'FALLBACK_TO_ORIGINAL_AUDIO';

export interface LiveSessionState {
  sessionId: string;
  keyId: string;
  targetLanguage: string;
  status: LiveSessionStatus;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  lastConnectedAt?: string;
  lastError?: string;
  contextHistory: Array<{ role: 'user' | 'model'; text: string }>;
  fallbackAudioTrack: 'hindi_original';
}

export class GeminiLiveSessionManager {
  private sessions: Map<string, LiveSessionState> = new Map();

  /**
   * Initializes a dedicated, stateful Live API session.
   * Allocates an eligible key for the lifetime of the session. Never rotates mid-stream.
   */
  async createSession(options: {
    sessionId?: string;
    targetLanguage: string;
    initialContext?: Array<{ role: 'user' | 'model'; text: string }>;
  }): Promise<{ sessionId: string; keyId: string; maskedKey: string; status: LiveSessionStatus }> {
    const sessionId = options.sessionId || `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const eligibleKeys = await AiKeyStore.getEligibleKeys('gemini');

    if (eligibleKeys.length === 0) {
      // Gracefully fall back to original Hindi audio when no keys are available
      const fallbackState: LiveSessionState = {
        sessionId,
        keyId: 'none',
        targetLanguage: options.targetLanguage,
        status: 'FALLBACK_TO_ORIGINAL_AUDIO',
        reconnectAttempts: 0,
        maxReconnectAttempts: 3,
        contextHistory: options.initialContext || [],
        fallbackAudioTrack: 'hindi_original',
      };
      this.sessions.set(sessionId, fallbackState);

      return {
        sessionId,
        keyId: 'none',
        maskedKey: 'none',
        status: 'FALLBACK_TO_ORIGINAL_AUDIO',
      };
    }

    const key = eligibleKeys[0];
    const sessionState: LiveSessionState = {
      sessionId,
      keyId: key.id,
      targetLanguage: options.targetLanguage,
      status: 'CONNECTED',
      reconnectAttempts: 0,
      maxReconnectAttempts: 3,
      lastConnectedAt: new Date().toISOString(),
      contextHistory: options.initialContext || [],
      fallbackAudioTrack: 'hindi_original',
    };

    this.sessions.set(sessionId, sessionState);

    return {
      sessionId,
      keyId: key.id,
      maskedKey: key.maskedKey,
      status: 'CONNECTED',
    };
  }

  /**
   * Executes session restoration and reconnect strategy when a Live stream drops.
   * Restores context history and seamlessly rebinds to an eligible key if current key failed.
   */
  async reconnectSession(
    sessionId: string,
    error?: { category: ErrorCategory; message: string }
  ): Promise<{
    success: boolean;
    status: LiveSessionStatus;
    newKeyId?: string;
    audioTrack: 'live_translated' | 'hindi_original';
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Live session ${sessionId} not found`);
    }

    session.reconnectAttempts++;
    session.status = 'RECONNECTING';

    // If error was auth failure or quota exhaustion, isolate current key
    if (error && (error.category === 'AUTH_FAILURE' || error.category === 'RATE_LIMIT')) {
      const currentKey = await AiKeyStore.getKeyById(session.keyId);
      if (currentKey) {
        if (error.category === 'AUTH_FAILURE') {
          await AiKeyStore.updateKeyStatus(currentKey.id, {
            status: 'FAILED',
            lastErrorCategory: error.category,
            lastErrorMessage: error.message,
          });
        } else {
          await AiKeyStore.updateKeyStatus(currentKey.id, {
            status: 'TEMPORARILY_UNAVAILABLE',
            cooldownUntil: Date.now() + 30000,
            lastErrorCategory: error.category,
            lastErrorMessage: error.message,
          });
        }
      }
    }

    // Try finding another eligible Gemini key
    const eligibleKeys = await AiKeyStore.getEligibleKeys('gemini');
    const availableKey = eligibleKeys.find((k) => k.id !== session.keyId) || eligibleKeys[0];

    if (!availableKey || session.reconnectAttempts > session.maxReconnectAttempts) {
      // Reconnection exhausted: Fall back to original Hindi audio
      session.status = 'FALLBACK_TO_ORIGINAL_AUDIO';
      session.lastError = error?.message || 'Reconnect limit reached';

      return {
        success: false,
        status: 'FALLBACK_TO_ORIGINAL_AUDIO',
        audioTrack: 'hindi_original',
      };
    }

    // Successfully acquired key, restore session state and context
    session.keyId = availableKey.id;
    session.status = 'CONNECTED';
    session.lastConnectedAt = new Date().toISOString();

    return {
      success: true,
      status: 'CONNECTED',
      newKeyId: availableKey.id,
      audioTrack: 'live_translated',
    };
  }

  /**
   * Adds conversation turn or audio segment transcript to context history
   * to ensure full restoration upon reconnect.
   */
  appendContext(sessionId: string, turn: { role: 'user' | 'model'; text: string }) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.contextHistory.push(turn);
      if (session.contextHistory.length > 20) {
        session.contextHistory.shift();
      }
    }
  }

  getSession(sessionId: string): LiveSessionState | undefined {
    return this.sessions.get(sessionId);
  }

  terminateSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'DISCONNECTED';
      this.sessions.delete(sessionId);
    }
  }
}

export const geminiLiveSessionManager = new GeminiLiveSessionManager();
