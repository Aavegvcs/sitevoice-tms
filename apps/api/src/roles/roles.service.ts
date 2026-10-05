import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PERMISSION_CATALOG, SCOPED_SUBJECT, isValidPermission } from '../casl/casl.catalog';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, PermissionInputDto, UpdateRoleDto } from './roles.dto';

const roleInclude = {
  permissions: { select: { action: true, subject: true, scope: true }, orderBy: [{ subject: 'asc' }, { action: 'asc' }] },
  _count: { select: { users: true } },
} satisfies Prisma.RoleInclude;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  catalog() {
    return Object.entries(PERMISSION_CATALOG).map(([subject, actions]) => ({
      subject,
      scoped: subject === SCOPED_SUBJECT,
      actions: Object.entries(actions).map(([action, label]) => ({ action, label })),
    }));
  }

  list() {
    return this.prisma.role.findMany({ include: roleInclude, orderBy: [{ isSystem: 'desc' }, { name: 'asc' }] });
  }

  async create(dto: CreateRoleDto) {
    const permissions = this.normalise(dto.permissions ?? []);
    try {
      return await this.prisma.role.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim(),
          permissions: { create: permissions },
        },
        include: roleInclude,
      });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.mustFind(id);
    if (role.isSystem && dto.name && dto.name.trim() !== role.name) {
      throw new BadRequestException('System roles cannot be renamed');
    }
    try {
      return await this.prisma.role.update({
        where: { id },
        data: { name: dto.name?.trim(), description: dto.description?.trim() },
        include: roleInclude,
      });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async setPermissions(id: string, input: PermissionInputDto[]) {
    const role = await this.mustFind(id);
    // The Admin role always keeps full access, so nobody can lock the system out of administration.
    if (role.isSystem && role.name === 'Admin') {
      throw new BadRequestException('The Admin role always has full access and cannot be changed');
    }
    const permissions = this.normalise(input);
    return this.prisma.$transaction(async (tx) => {
      await tx.permission.deleteMany({ where: { roleId: id } });
      await tx.permission.createMany({ data: permissions.map((p) => ({ ...p, roleId: id })) });
      return tx.role.findUniqueOrThrow({ where: { id }, include: roleInclude });
    });
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('System roles cannot be deleted');
    if (role._count.users > 0) throw new ConflictException('Reassign the users of this role before deleting it');
    await this.prisma.role.delete({ where: { id } });
  }

  /** Validates against the catalog, drops duplicates, and forces scope ALL on non-ticket subjects. */
  private normalise(input: PermissionInputDto[]) {
    const out = new Map<string, { action: string; subject: string; scope: 'ALL' | 'SITES' | 'OWN' }>();
    for (const p of input) {
      if (!isValidPermission(p.subject, p.action)) {
        throw new BadRequestException(`Unknown permission: ${p.action} on ${p.subject}`);
      }
      out.set(`${p.subject}:${p.action}`, {
        action: p.action,
        subject: p.subject,
        scope: p.subject === SCOPED_SUBJECT ? (p.scope ?? 'ALL') : 'ALL',
      });
    }
    return [...out.values()];
  }

  private async mustFind(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  private mapError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new ConflictException('A role with this name already exists');
    }
    return e;
  }
}
