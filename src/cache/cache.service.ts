import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly enableCache: boolean;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.enableCache = this.configService.get('redis.enableCache') !== false;
  }

  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enableCache) {
      return null;
    }

    try {
      const value = await this.cacheManager.get<T>(key);
      return value || null;
    } catch (error) {
      this.logger.warn(`Cache get error for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional, uses default if not provided)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.enableCache) {
      return;
    }

    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.warn(`Cache set error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete value from cache
   * @param key - Cache key
   */
  async del(key: string): Promise<void> {
    if (!this.enableCache) {
      return;
    }

    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(`Cache delete error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Clear all cache (if supported by the store)
   */
  async reset(): Promise<void> {
    if (!this.enableCache) {
      return;
    }

    try {
      // Check if reset method exists (not all stores support it)
      if (typeof (this.cacheManager as any).reset === 'function') {
        await (this.cacheManager as any).reset();
      } else {
        this.logger.warn('Cache reset not supported by current store');
      }
    } catch (error) {
      this.logger.warn(`Cache reset error: ${error.message}`);
    }
  }

  /**
   * Generate cache key from parameters
   * @param prefix - Key prefix
   * @param params - Parameters to include in key
   * @returns Generated cache key
   */
  generateKey(prefix: string, ...params: (string | number)[]): string {
    const paramString = params
      .map((p) => String(p).replace(/[^a-zA-Z0-9]/g, '_'))
      .join(':');
    return `${prefix}:${paramString}`;
  }
}

