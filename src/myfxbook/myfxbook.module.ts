import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MyfxbookController } from './myfxbook.controller';
import { MyfxbookService } from './myfxbook.service';

@Module({
  imports: [HttpModule],
  controllers: [MyfxbookController],
  providers: [MyfxbookService],
  exports: [MyfxbookService],
})
export class MyfxbookModule {}

