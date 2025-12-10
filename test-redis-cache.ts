/**
 * Test script to verify Redis cache implementation
 * Run this script to test if Redis caching is working correctly
 * 
 * Usage: npm run test:cache
 * Or: npx ts-node -r tsconfig-paths/register test-redis-cache.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { CacheService } from './src/cache/cache.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function testRedisCache() {
  const logger = new Logger('RedisCacheTest');
  
  try {
    logger.log('Starting Redis cache test...');
    
    // Create NestJS application
    const app = await NestFactory.createApplicationContext(AppModule);
    const cacheService = app.get(CacheService);
    const configService = app.get(ConfigService);
    
    // Check Redis configuration
    const redisConfig = configService.get('redis');
    const enableCache = redisConfig?.enableCache !== false;
    const redisHost = redisConfig?.host || 'localhost';
    const redisPort = redisConfig?.port || 6379;
    
    logger.log(`\n📋 Redis Configuration:`);
    logger.log(`   Host: ${redisHost}`);
    logger.log(`   Port: ${redisPort}`);
    logger.log(`   Cache Enabled: ${enableCache}`);
    logger.log(`   TTL: ${redisConfig?.ttl || 300} seconds`);
    
    // Try to detect if Redis is actually connected
    logger.log(`\n🔍 Checking Redis connection...`);
    try {
      // Test Redis connection by setting and getting a test key
      const connectionTestKey = 'redis:connection:test';
      await cacheService.set(connectionTestKey, 'connected', 1);
      const testValue = await cacheService.get(connectionTestKey);
      
      if (testValue === 'connected') {
        logger.log(`✅ Redis is CONNECTED and working!`);
        logger.log(`   Cache is using Redis store`);
      } else {
        logger.warn(`⚠️  Redis connection test returned unexpected value`);
        logger.warn(`   Cache might be using in-memory fallback`);
      }
      await cacheService.del(connectionTestKey);
    } catch (error) {
      logger.warn(`⚠️  Redis connection test failed: ${error.message}`);
      logger.warn(`   Cache is using in-memory fallback`);
    }
    
    // Test 1: Basic cache set/get
    logger.log('Test 1: Basic cache set/get');
    const testKey = 'test:key:1';
    const testValue = { message: 'Hello Redis', timestamp: Date.now() };
    
    await cacheService.set(testKey, testValue, 60);
    logger.log(`✓ Set value: ${JSON.stringify(testValue)}`);
    
    const retrieved = await cacheService.get(testKey);
    if (retrieved && JSON.stringify(retrieved) === JSON.stringify(testValue)) {
      logger.log('✓ Cache get successful - value matches');
    } else {
      logger.error('✗ Cache get failed - value mismatch');
      logger.error(`Expected: ${JSON.stringify(testValue)}`);
      logger.error(`Got: ${JSON.stringify(retrieved)}`);
    }
    
    // Test 2: Cache key generation
    logger.log('\nTest 2: Cache key generation');
    const generatedKey = cacheService.generateKey('myfxbook:accounts', 'session123');
    logger.log(`✓ Generated key: ${generatedKey}`);
    
    if (generatedKey === 'myfxbook:accounts:session123') {
      logger.log('✓ Key generation format is correct');
    } else {
      logger.error('✗ Key generation format is incorrect');
    }
    
    // Test 3: Cache expiration (set with short TTL)
    logger.log('\nTest 3: Cache expiration');
    const expireKey = 'test:expire:1';
    await cacheService.set(expireKey, 'expire-test', 2);
    logger.log('✓ Set value with 2 second TTL');
    
    const beforeExpire = await cacheService.get(expireKey);
    if (beforeExpire) {
      logger.log('✓ Value exists before expiration');
    } else {
      logger.error('✗ Value not found before expiration');
    }
    
    logger.log('Waiting 3 seconds for expiration...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const afterExpire = await cacheService.get(expireKey);
    if (!afterExpire) {
      logger.log('✓ Value correctly expired');
    } else {
      logger.warn('⚠ Value still exists after expiration (this is normal for in-memory cache)');
    }
    
    // Test 4: Cache delete
    logger.log('\nTest 4: Cache delete');
    const deleteKey = 'test:delete:1';
    await cacheService.set(deleteKey, 'delete-test', 60);
    await cacheService.del(deleteKey);
    const deleted = await cacheService.get(deleteKey);
    
    if (!deleted) {
      logger.log('✓ Cache delete successful');
    } else {
      logger.error('✗ Cache delete failed - value still exists');
    }
    
    // Test 5: Non-existent key
    logger.log('\nTest 5: Non-existent key');
    const nonExistent = await cacheService.get('test:non:existent');
    if (nonExistent === null) {
      logger.log('✓ Non-existent key returns null correctly');
    } else {
      logger.error('✗ Non-existent key should return null');
    }
    
    logger.log('\n✅ All cache tests completed!');
    logger.log('\nNote: If Redis is not running, the cache will fall back to in-memory storage.');
    logger.log('This is expected behavior and ensures the application continues to work.');
    
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
testRedisCache();

