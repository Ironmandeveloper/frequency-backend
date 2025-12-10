import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: async (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        const enableCache = redisConfig?.enableCache !== false;

        if (!enableCache) {
          // Return in-memory cache if Redis is disabled
          return {
            ttl: redisConfig?.ttl || 30,
          };
        }

        try {
          const store = await redisStore({
            socket: {
              host: redisConfig?.host || 'localhost',
              port: redisConfig?.port || 6379,
            },
            password: redisConfig?.password,
          });

          return {
            store: store as any,
            ttl: redisConfig?.ttl || 30, // Default 30 seconds
          };
        } catch (error) {
          // Fallback to in-memory cache if Redis connection fails
          console.warn('Redis connection failed, falling back to in-memory cache:', error.message);
          return {
            ttl: redisConfig?.ttl || 30,
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheModule {}

