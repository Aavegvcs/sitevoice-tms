import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentAbility, CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth.types';
import type { AppAbility } from '../casl/casl-ability.factory';
import { RequirePermission } from '../casl/policies.guard';
import { CreateSiteDto, UpdateSiteDto } from './sites.dto';
import { SitesService } from './sites.service';

@Controller('sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get()
  @RequirePermission('read', 'Site')
  list(@CurrentUser() user: AuthUser, @CurrentAbility() ability: AppAbility) {
    return this.sites.list(user, ability);
  }

  @Post()
  @RequirePermission('manage', 'Site')
  create(@Body() dto: CreateSiteDto) {
    return this.sites.create(dto);
  }

  @Patch(':id')
  @RequirePermission('manage', 'Site')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSiteDto) {
    return this.sites.update(id, dto);
  }
}
