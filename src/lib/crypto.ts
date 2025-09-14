import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Generate a cryptographic salt
 */
export function generateSalt(): string {
  return crypto.randomBytes(SALT_LENGTH).toString('hex');
}

/**
 * Derive a key from password and salt using PBKDF2
 */
function deriveKey(password: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 */
export function encryptSecret(plaintext: string, password: string, salt: string): string {
  try {
    const key = deriveKey(password, salt);
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
    console.error('Error encrypting secret:', error);
    throw new Error('Failed to encrypt secret');
  }
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 */
export function decryptSecret(encryptedData: string, password: string, salt: string): string {
  try {
    const key = deriveKey(password, salt);
    
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
    console.error('Error decrypting secret:', error);
    throw new Error('Failed to decrypt secret - invalid password or corrupted data');
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
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}