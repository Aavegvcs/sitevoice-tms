import { Module } from '@nestjs/common';
import { AttachmentStorage } from './storage';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, AttachmentStorage],
  exports: [TicketsService],
})
export class TicketsModule {}
