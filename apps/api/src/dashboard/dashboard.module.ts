import { Module } from '@nestjs/common';
import { TicketsModule } from '../tickets/tickets.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TicketsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
