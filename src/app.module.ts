import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { MyfxbookModule } from './myfxbook/myfxbook.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [ConfigModule, CacheModule, MyfxbookModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
