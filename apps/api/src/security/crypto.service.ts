import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Algorithm, hash, verify } from '@node-rs/argon2';

export interface GeneratedTokenPair {
  rawToken: string;
  tokenHash: string;
}

const DUMMY_PASSWORD_SEED = 'PDSChain_Phase2_Dummy_Password_Seed#2026!';

@Injectable()
export class CryptoService {
  private readonly memoryCost: number;
  private readonly timeCost: number;
  private readonly parallelism: number;
  private dummyHashPromise: Promise<string> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.memoryCost = this.configService.get<number>('ARGON2_MEMORY_COST', 19456);
    this.timeCost = this.configService.get<number>('ARGON2_TIME_COST', 2);
    this.parallelism = this.configService.get<number>('ARGON2_PARALLELISM', 1);
  }

  /**
   * Normalizes an email address to lowercase trimmed canonical representation.
   */
  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Hashes a plaintext password using Argon2id with configured parameters.
   */
  async hashPassword(plainPassword: string): Promise<string> {
    return hash(plainPassword, {
      algorithm: 2 as Algorithm,
      memoryCost: this.memoryCost,
      timeCost: this.timeCost,
      parallelism: this.parallelism,
    });
  }

  /**
   * Verifies a plaintext password against an Argon2id password hash.
   */
  async verifyPassword(passwordHash: string, plainPassword: string): Promise<boolean> {
    if (!passwordHash || !plainPassword) {
      return false;
    }
    try {
      return await verify(passwordHash, plainPassword);
    } catch {
      return false;
    }
  }

  /**
   * Executes a dummy Argon2id verification when a login email does not exist,
   * mitigating timing-based account enumeration.
   */
  async verifyDummyPassword(plainPassword: string): Promise<void> {
    if (!this.dummyHashPromise) {
      this.dummyHashPromise = this.hashPassword(DUMMY_PASSWORD_SEED);
    }
    const dummyHash = await this.dummyHashPromise;
    await this.verifyPassword(dummyHash, plainPassword);
  }

  /**
   * Generates a cryptographically secure random hex token and its SHA-256 hash.
   */
  generateOpaqueToken(byteLength = 32): GeneratedTokenPair {
    const rawToken = randomBytes(byteLength).toString('hex');
    const tokenHash = this.hashOpaqueToken(rawToken);
    return { rawToken, tokenHash };
  }

  /**
   * Computes a deterministic SHA-256 hex digest of an opaque token.
   */
  hashOpaqueToken(rawToken: string): string {
    return createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }

  /**
   * Compares two SHA-256 hex digests in constant time.
   */
  constantTimeEqualHex(hexA: string, hexB: string): boolean {
    if (typeof hexA !== 'string' || typeof hexB !== 'string') {
      return false;
    }
    if (hexA.length !== hexB.length || hexA.length === 0) {
      return false;
    }
    try {
      const bufA = Buffer.from(hexA, 'utf8');
      const bufB = Buffer.from(hexB, 'utf8');
      if (bufA.length !== bufB.length) {
        return false;
      }
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}
