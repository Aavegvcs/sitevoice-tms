import { Controller, Get } from '@nestjs/common';
import { CurrentAbility } from '../auth/current-user.decorator';
import type { AppAbility } from '../casl/casl-ability.factory';
import { RequirePermission } from '../casl/policies.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @RequirePermission('read', 'Dashboard')
  summary(@CurrentAbility() ability: AppAbility) {
    return this.dashboard.summary(ability);
  }
}
