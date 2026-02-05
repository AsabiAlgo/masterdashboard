/**
 * Credential Store
 *
 * Secure storage for SSH credentials with encryption at rest.
 * Uses AES-256-GCM for encryption with a master password derived key.
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { createChildLogger } from '../utils/logger.js';
import type { SSHAuthMethod } from '@masterdashboard/shared';

const logger = createChildLogger('credential-store');

interface StoredCredential {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: SSHAuthMethod;
  encryptedPassword?: string;
  encryptedPrivateKey?: string;
  createdAt: string;
  updatedAt: string;
}

interface SaveCredentialInput {
  id?: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: SSHAuthMethod;
  password?: string;
  privateKey?: string;
}

interface RetrievedCredential {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: SSHAuthMethod;
  password?: string;
  privateKey?: string;
}

interface CredentialSummary {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: SSHAuthMethod;
  createdAt: string;
  updatedAt: string;
}

export class CredentialStore {
  private readonly storePath: string;
  private encryptionKey: Buffer | null = null;
  private initialized = false;

  constructor(storePath: string) {
    this.storePath = storePath;
  }

  /**
   * Initialize the store with a master password
   */
  async initialize(masterPassword: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Derive encryption key from master password using scrypt
    const salt = 'masterdashboard-credential-salt';
    this.encryptionKey = crypto.scryptSync(masterPassword, salt, 32);
    this.initialized = true;

    // Ensure store directory exists
    await fs.mkdir(path.dirname(this.storePath), { recursive: true });

    logger.info('Credential store initialized');
  }

  /**
   * Encrypt a string using AES-256-GCM
   */
  private encrypt(plaintext: string): string {
    if (!this.encryptionKey) {
      throw new Error('Credential store not initialized');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted (all hex encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypt a string encrypted with AES-256-GCM
   */
  private decrypt(encryptedText: string): string {
    if (!this.encryptionKey) {
      throw new Error('Credential store not initialized');
    }

    const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Save a credential to the store
   */
  async save(credential: SaveCredentialInput): Promise<CredentialSummary> {
    if (!this.initialized) {
      throw new Error('Credential store not initialized');
    }

    const credentials = await this.loadAll();
    const now = new Date().toISOString();

    const stored: StoredCredential = {
      id: credential.id ?? crypto.randomUUID(),
      name: credential.name,
      host: credential.host,
      port: credential.port,
      username: credential.username,
      authMethod: credential.authMethod,
      createdAt: now,
      updatedAt: now,
    };

    // Encrypt sensitive data
    if (credential.password) {
      stored.encryptedPassword = this.encrypt(credential.password);
    }
    if (credential.privateKey) {
      stored.encryptedPrivateKey = this.encrypt(credential.privateKey);
    }

    // Update existing or add new
    const existingIndex = credentials.findIndex((c) => c.id === stored.id);
    if (existingIndex >= 0) {
      const existingCred = credentials[existingIndex];
      if (existingCred) {
        stored.createdAt = existingCred.createdAt;
      }
      credentials[existingIndex] = stored;
    } else {
      credentials.push(stored);
    }

    await this.saveAll(credentials);
    logger.info({ id: stored.id, name: stored.name }, 'Credential saved');

    return {
      id: stored.id,
      name: stored.name,
      host: stored.host,
      port: stored.port,
      username: stored.username,
      authMethod: stored.authMethod,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };
  }

  /**
   * Get a credential by ID (with decrypted sensitive data)
   */
  async get(id: string): Promise<RetrievedCredential | null> {
    if (!this.initialized) {
      throw new Error('Credential store not initialized');
    }

    const credentials = await this.loadAll();
    const stored = credentials.find((c) => c.id === id);

    if (!stored) {
      return null;
    }

    const retrieved: RetrievedCredential = {
      id: stored.id,
      name: stored.name,
      host: stored.host,
      port: stored.port,
      username: stored.username,
      authMethod: stored.authMethod,
    };

    // Decrypt sensitive data
    if (stored.encryptedPassword) {
      retrieved.password = this.decrypt(stored.encryptedPassword);
    }
    if (stored.encryptedPrivateKey) {
      retrieved.privateKey = this.decrypt(stored.encryptedPrivateKey);
    }

    return retrieved;
  }

  /**
   * List all credentials (without sensitive data)
   */
  async list(): Promise<CredentialSummary[]> {
    if (!this.initialized) {
      throw new Error('Credential store not initialized');
    }

    const credentials = await this.loadAll();

    return credentials.map((c) => ({
      id: c.id,
      name: c.name,
      host: c.host,
      port: c.port,
      username: c.username,
      authMethod: c.authMethod,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Delete a credential
   */
  async delete(id: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Credential store not initialized');
    }

    const credentials = await this.loadAll();
    const initialLength = credentials.length;
    const filtered = credentials.filter((c) => c.id !== id);

    if (filtered.length === initialLength) {
      return false; // Not found
    }

    await this.saveAll(filtered);
    logger.info({ id }, 'Credential deleted');
    return true;
  }

  /**
   * Load all credentials from file
   */
  private async loadAll(): Promise<StoredCredential[]> {
    try {
      const data = await fs.readFile(this.storePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, return empty array
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      logger.error({ error }, 'Failed to load credentials');
      return [];
    }
  }

  /**
   * Save all credentials to file
   */
  private async saveAll(credentials: StoredCredential[]): Promise<void> {
    await fs.mkdir(path.dirname(this.storePath), { recursive: true });
    await fs.writeFile(this.storePath, JSON.stringify(credentials, null, 2), 'utf8');
  }

  /**
   * Check if the store has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clear all credentials (use with caution)
   */
  async clear(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Credential store not initialized');
    }

    await this.saveAll([]);
    logger.info('All credentials cleared');
  }
}
