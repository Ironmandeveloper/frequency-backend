import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { MyfxbookController } from './myfxbook.controller';
import { MyfxbookService } from './myfxbook.service';
import { MyfxbookCronService } from './myfxbook-cron.service';

@Module({
  imports: [HttpModule, ScheduleModule.forRoot()],
  controllers: [MyfxbookController],
  providers: [MyfxbookService, MyfxbookCronService],
  exports: [MyfxbookService],
})
export class MyfxbookModule {}

