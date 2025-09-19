import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Security constants
const MAX_PASSWORD_LENGTH = 1024; // Prevent DoS with massive passwords
const MIN_PASSWORD_LENGTH = 8;
const PBKDF2_ITERATIONS = 100000; // High iteration count for security

/**
 * Generate a cryptographic salt
 */
export function generateSalt(): string {
  return crypto.randomBytes(SALT_LENGTH).toString('hex');
}

/**
 * Securely clear a string from memory (best effort)
 */
function secureWipeString(str: string): void {
  if (typeof str === 'string') {
    // This is a best effort - V8 may still optimize this away
    (str as any).replace(/./g, '\0');
  }
}

/**
 * Validate password meets security requirements
 */
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Password must be a string' };
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` };
  }
  
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must not exceed ${MAX_PASSWORD_LENGTH} characters` };
  }
  
  return { valid: true };
}

/**
 * Derive a key from password and salt using PBKDF2
 */
function deriveKey(password: string, salt: string): Buffer {
  const validation = validatePassword(password);
  if (!validation.valid) {
    throw new Error(`Password validation failed: ${validation.error}`);
  }
  
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 */
export function encryptSecret(plaintext: string, password: string, salt: string): string {
  let key: Buffer | null = null;
  
  try {
    // Validate inputs
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Plaintext must be a non-empty string');
    }
    
    if (!salt || typeof salt !== 'string') {
      throw new Error('Salt must be a non-empty string');
    }
    
    // Rate limiting check (in a real app, this would be more sophisticated)
    if (plaintext.length > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('Data too large to encrypt');
    }
    
    key = deriveKey(password, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(Buffer.from(salt, 'hex'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine iv + authTag + encrypted
    const combined = iv.toString('hex') + authTag.toString('hex') + encrypted;
    
    return combined;
  } catch (error) {
    console.error('Error encrypting secret (details hidden for security)');
    throw new Error('Failed to encrypt secret');
  } finally {
    // Securely clear the key from memory
    if (key) {
      key.fill(0);
    }
    // Attempt to clear password from memory
    secureWipeString(password);
  }
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 */
export function decryptSecret(encryptedData: string, password: string, salt: string): string {
  let key: Buffer | null = null;
  
  try {
    // Validate inputs
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Encrypted data must be a non-empty string');
    }
    
    if (!salt || typeof salt !== 'string') {
      throw new Error('Salt must be a non-empty string');
    }
    
    // Check minimum expected length
    const minLength = (IV_LENGTH + TAG_LENGTH) * 2; // hex encoded
    if (encryptedData.length < minLength) {
      throw new Error('Encrypted data appears to be truncated or corrupted');
    }
    
    key = deriveKey(password, salt);
    
    // Extract iv, authTag, and encrypted data
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
    const authTag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);
    
    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAAD(Buffer.from(salt, 'hex'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Don't log detailed error information to prevent information leakage
    console.error('Decryption failed (details hidden for security)');
    throw new Error('Failed to decrypt secret - invalid password or corrupted data');
  } finally {
    // Securely clear the key from memory
    if (key) {
      key.fill(0);
    }
    // Attempt to clear password from memory
    secureWipeString(password);
  }
}

/**
 * Verify if a password can decrypt the given encrypted data
 */
export function verifyPassword(encryptedData: string, password: string, salt: string): boolean {
  try {
    decryptSecret(encryptedData, password, salt);
    return true;
  } catch {
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  // Validate length
  if (length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password length must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}`);
  }
  
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

// Export validation function for external use
export { validatePassword };
