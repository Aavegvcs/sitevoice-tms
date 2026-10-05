import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { RequirePermission } from '../casl/policies.guard';
import { CreateRoleDto, SetPermissionsDto, UpdateRoleDto } from './roles.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermission('read', 'Role')
  list() {
    return this.roles.list();
  }

  @Get('catalog')
  @RequirePermission('read', 'Role')
  catalog() {
    return this.roles.catalog();
  }

  @Post()
  @RequirePermission('manage', 'Role')
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @Patch(':id')
  @RequirePermission('manage', 'Role')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(id, dto);
  }

  @Put(':id/permissions')
  @RequirePermission('manage', 'Role')
  setPermissions(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetPermissionsDto) {
    return this.roles.setPermissions(id, dto.permissions);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('manage', 'Role')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.remove(id);
  }
}
