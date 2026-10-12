import dotenv from 'dotenv';
dotenv.config();

export interface BrevoRecipient {
  email: string;
  name?: string;
}

export interface BrevoSendOptions {
  to: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  tags?: string[];
}

export interface BrevoSendResult {
  success: boolean;
  messageId?: string;
  statusCode?: number;
  error?: string;
  errorCode?: string;
  diagnostics?: string;
}

export interface BrevoSenderInfo {
  id: number;
  name: string;
  email: string;
  active: boolean;
  ips?: { ip: string; domain: string; weight: number }[];
}

export interface BrevoAccountInfo {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  plan: { type: string; creditsType: string; credits: number }[];
  relay?: { enabled: boolean; data?: any };
}

export interface BrevoDeliveryEvent {
  email: string;
  date: string;
  subject: string;
  messageId: string;
  event: 'delivered' | 'opened' | 'first_opening' | 'clicks' | 'bounces' | 'hard_bounces' | 'soft_bounces' | 'blocked' | 'spam' | 'unsubscribed' | 'deferred';
  reason?: string;
}

export class BrevoClient {
  private static readonly API_BASE = 'https://api.brevo.com/v3';

  /**
   * Safely inspect configured Brevo environment parameters without exposing secret key
   */
  public static getConfig() {
    const rawKey = process.env.BREVO_API_KEY || '';
    const hasKey = typeof rawKey === 'string' && rawKey.trim().length > 10;
    const keyPreview = hasKey
      ? `${rawKey.trim().substring(0, 7)}...${rawKey.trim().slice(-4)}`
      : 'NONE';

    return {
      isConfigured: hasKey,
      keyPreview,
      senderName: (process.env.BREVO_SENDER_NAME || 'Authentication of SakhiBiz').trim(),
      senderEmail: (process.env.BREVO_SENDER_EMAIL || 'authentication@sakhibiz.xyz').toLowerCase().trim(),
    };
  }

  /**
   * Send a transactional email via Brevo REST API v3
   */
  public static async sendTransactionalEmail(options: BrevoSendOptions): Promise<BrevoSendResult> {
    const config = this.getConfig();

    if (!config.isConfigured) {
      console.warn('[Brevo] BREVO_API_KEY is not configured in server environment.');
      return {
        success: false,
        statusCode: 503,
        error: 'Brevo API key is not configured on the server (BREVO_API_KEY missing).',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        diagnostics: 'Please add BREVO_API_KEY to your server-side environment variables.',
      };
    }

    const apiKey = process.env.BREVO_API_KEY!.trim();
    const payload = {
      sender: {
        name: config.senderName,
        email: config.senderEmail,
      },
      to: options.to.map((recipient) => ({
        email: recipient.email.toLowerCase().trim(),
        name: recipient.name || 'Recipient',
      })),
      subject: options.subject,
      htmlContent: options.htmlContent,
      textContent: options.textContent || undefined,
      tags: options.tags || ['sakhibiz-auth'],
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

      const response = await fetch(`${this.API_BASE}/smtp/email`, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseBody: any = {};
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = { raw: responseText };
      }

      if (response.status === 201 || (response.ok && responseBody.messageId)) {
        const messageId = responseBody.messageId || 'ACCEPTED_NO_ID';
        console.log(`[Brevo] Transactional email queued successfully: HTTP 201, messageId=${messageId}`);
        return {
          success: true,
          messageId,
          statusCode: response.status,
          diagnostics: `Email accepted by Brevo API. Enqueued with messageId: ${messageId}`,
        };
      }

      // Handle Brevo specific error classifications
      const errCode = responseBody.code || `HTTP_${response.status}`;
      const errMsg = responseBody.message || responseText || 'Unknown Brevo API error';

      let diagnosticNote = 'Brevo rejected the transactional dispatch.';
      if (response.status === 401) {
        diagnosticNote = 'HTTP 401 Unauthorized: The BREVO_API_KEY is invalid or lacks transactional email permissions.';
      } else if (response.status === 400 && responseBody.code === 'unauthorized_sender') {
        diagnosticNote = `HTTP 400 unauthorized_sender: The sender email "${config.senderEmail}" is not verified in your Brevo account under Senders & IPs.`;
      } else if (response.status === 400) {
        diagnosticNote = `HTTP 400 Bad Request: Check recipient email validity and payload parameters (${errMsg}).`;
      } else if (response.status === 402) {
        diagnosticNote = 'HTTP 402 Payment Required: Transactional email credit limit reached in your Brevo account.';
      } else if (response.status === 403) {
        diagnosticNote = 'HTTP 403 Forbidden: Transactional email sending is disabled or under review for this Brevo account.';
      }

      console.error(`[Brevo API Error] Status: ${response.status}, Code: ${errCode}, Message: ${errMsg}`);
      return {
        success: false,
        statusCode: response.status,
        errorCode: errCode,
        error: errMsg,
        diagnostics: diagnosticNote,
      };
    } catch (networkErr: any) {
      const isTimeout = networkErr.name === 'AbortError';
      const msg = isTimeout ? 'Brevo API request timed out (12s)' : networkErr.message || 'Network error';
      console.error('[Brevo Network Error]:', msg);
      return {
        success: false,
        statusCode: isTimeout ? 504 : 500,
        errorCode: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        error: msg,
        diagnostics: 'Failed to establish connection to https://api.brevo.com.',
      };
    }
  }

  /**
   * Diagnostic: Fetch verified senders list from Brevo
   * Verifies if admin@sakhibiz.xyz exists and is verified
   */
  public static async getSendersList(): Promise<{
    success: boolean;
    senders: BrevoSenderInfo[];
    isSenderAuthorized: boolean;
    error?: string;
  }> {
    const config = this.getConfig();
    if (!config.isConfigured) {
      return { success: false, senders: [], isSenderAuthorized: false, error: 'BREVO_API_KEY is not configured.' };
    }

    try {
      const response = await fetch(`${this.API_BASE}/senders`, {
        method: 'GET',
        headers: {
          'api-key': process.env.BREVO_API_KEY!.trim(),
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errBody = await response.text();
        return {
          success: false,
          senders: [],
          isSenderAuthorized: false,
          error: `HTTP ${response.status}: ${errBody}`,
        };
      }

      const data = await response.json();
      const senders: BrevoSenderInfo[] = Array.isArray(data.senders) ? data.senders : [];
      const match = senders.find(
        (s) => s.email.toLowerCase().trim() === config.senderEmail && s.active === true
      );

      return {
        success: true,
        senders,
        isSenderAuthorized: !!match,
      };
    } catch (err: any) {
      return {
        success: false,
        senders: [],
        isSenderAuthorized: false,
        error: err.message || 'Failed to fetch senders from Brevo',
      };
    }
  }

  /**
   * Diagnostic: Check Brevo account plan, credits, and transactional activation
   */
  public static async getAccountInfo(): Promise<{
    success: boolean;
    account?: BrevoAccountInfo;
    error?: string;
  }> {
    const config = this.getConfig();
    if (!config.isConfigured) {
      return { success: false, error: 'BREVO_API_KEY is not configured.' };
    }

    try {
      const response = await fetch(`${this.API_BASE}/account`, {
        method: 'GET',
        headers: {
          'api-key': process.env.BREVO_API_KEY!.trim(),
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errBody = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errBody}` };
      }

      const data = await response.json();
      return { success: true, account: data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch account info from Brevo' };
    }
  }

  /**
   * Diagnostic: Query actual email delivery events (delivered, bounced, spam, blocked)
   * Essential to distinguish API acceptance from actual inbox delivery!
   */
  public static async getDeliveryEvents(recipientEmail?: string, limit = 10): Promise<{
    success: boolean;
    events: BrevoDeliveryEvent[];
    error?: string;
  }> {
    const config = this.getConfig();
    if (!config.isConfigured) {
      return { success: false, events: [], error: 'BREVO_API_KEY is not configured.' };
    }

    try {
      const url = new URL(`${this.API_BASE}/smtp/statistics/events`);
      url.searchParams.set('limit', limit.toString());
      if (recipientEmail) {
        url.searchParams.set('email', recipientEmail.toLowerCase().trim());
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'api-key': process.env.BREVO_API_KEY!.trim(),
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errBody = await response.text();
        return { success: false, events: [], error: `HTTP ${response.status}: ${errBody}` };
      }

      const data = await response.json();
      return { success: true, events: data.events || [] };
    } catch (err: any) {
      return { success: false, events: [], error: err.message || 'Failed to fetch delivery events' };
    }
  }
}
