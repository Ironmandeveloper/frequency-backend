import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { MyfxbookModule } from './myfxbook/myfxbook.module';

@Module({
  imports: [ConfigModule, MyfxbookModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
