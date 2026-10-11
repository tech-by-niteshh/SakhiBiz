import crypto from 'crypto';

const MASTER_SALT = 'sakhibiz-ai-key-salt-2026';

function getDerivedKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.JWT_SECRET ||
    'sakhibiz-server-side-ai-key-store-internal-secret-2026';
  return crypto.scryptSync(secret, MASTER_SALT, 32);
}

/**
 * Encrypts a sensitive API key using AES-256-GCM with authentication tag.
 * Output format: iv_hex:tag_hex:cipher_hex
 */
export function encryptApiKey(plainKey: string): string {
  if (!plainKey || typeof plainKey !== 'string') {
    throw new Error('Invalid key string for encryption');
  }

  const key = getDerivedKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plainKey.trim(), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an encrypted key payload.
 */
export function decryptApiKey(encryptedPayload: string): string {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') {
    throw new Error('Invalid encrypted payload');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted key format. Expected iv:tag:ciphertext');
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Masks an API key for safe frontend display and logging.
 * Shows only a minimal prefix and the last 4 characters.
 * Example: "gsk_••••••••...4a8f" or "AIza••••••••...9x2d"
 */
export function maskApiKey(key: string): string {
  if (!key || typeof key !== 'string') return '••••••••';
  const clean = key.trim();
  if (clean.length <= 8) {
    return `••••${clean.slice(-3)}`;
  }

  let prefix = '';
  if (clean.startsWith('gsk_')) {
    prefix = 'gsk_';
  } else if (clean.startsWith('AIzaSy')) {
    prefix = 'AIza';
  } else {
    prefix = clean.slice(0, 3);
  }

  const suffix = clean.slice(-4);
  return `${prefix}••••••••...${suffix}`;
}

/**
 * Generates an opaque deterministic hash fingerprint of an API key
 * to detect duplicate entries without storing or comparing plaintext.
 */
export function computeKeyFingerprint(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex').slice(0, 16);
}
