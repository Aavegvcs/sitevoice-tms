import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';

const userSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  createdAt: true,
  role: { select: { id: true, name: true } },
  sites: { select: { site: { select: { id: true, code: true, name: true } } } },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function present(u: UserRow) {
  const { sites, ...rest } = u;
  return { ...rest, sites: sites.map((s) => s.site) };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({ select: userSelect, orderBy: { name: 'asc' } });
    return users.map(present);
  }

  async create(dto: CreateUserDto) {
    await this.assertRoleAndSites(dto.roleId, dto.siteIds);
    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          passwordHash: await bcrypt.hash(dto.password, 10),
          roleId: dto.roleId,
          sites: { create: (dto.siteIds ?? []).map((siteId) => ({ siteId })) },
        },
        select: userSelect,
      });
      return present(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A user with this email already exists');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    // Stops an Admin from locking themselves out of the system.
    if (id === actor.id && (dto.isActive === false || (dto.roleId && dto.roleId !== existing.roleId))) {
      throw new BadRequestException('You cannot deactivate yourself or change your own role');
    }
    if (dto.roleId || dto.siteIds) await this.assertRoleAndSites(dto.roleId, dto.siteIds);

    const revokeSessions = dto.password !== undefined || dto.isActive === false;
    const user = await this.prisma.$transaction(async (tx) => {
      if (dto.siteIds) {
        await tx.userSite.deleteMany({ where: { userId: id } });
        await tx.userSite.createMany({ data: dto.siteIds.map((siteId) => ({ userId: id, siteId })) });
      }
      if (revokeSessions) {
        await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      return tx.user.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          roleId: dto.roleId,
          isActive: dto.isActive,
          passwordHash: dto.password ? await bcrypt.hash(dto.password, 10) : undefined,
        },
        select: userSelect,
      });
    });
    return present(user);
  }

  private async assertRoleAndSites(roleId?: string, siteIds?: string[]) {
    if (roleId && !(await this.prisma.role.findUnique({ where: { id: roleId } }))) {
      throw new BadRequestException('Unknown role');
    }
    if (siteIds?.length) {
      const found = await this.prisma.site.count({ where: { id: { in: siteIds } } });
      if (found !== new Set(siteIds).size) throw new BadRequestException('One or more sites do not exist');
    }
  }
}
