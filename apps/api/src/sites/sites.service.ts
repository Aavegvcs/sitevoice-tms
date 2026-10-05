import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppAbility } from '../casl/casl-ability.factory';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto, UpdateSiteDto } from './sites.dto';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Admins (manage Site) see every site; everyone else sees only the sites they are linked to. */
  list(user: AuthUser, ability: AppAbility) {
    const all = ability.can('manage', 'Site');
    return this.prisma.site.findMany({
      where: all ? {} : { id: { in: user.siteIds }, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateSiteDto) {
    try {
      return await this.prisma.site.create({ data: { ...dto, code: dto.code.trim().toUpperCase() } });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async update(id: string, dto: UpdateSiteDto) {
    try {
      return await this.prisma.site.update({
        where: { id },
        data: { ...dto, code: dto.code?.trim().toUpperCase() },
      });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  private mapError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') return new ConflictException('A site with this code already exists');
      if (e.code === 'P2025') return new NotFoundException('Site not found');
    }
    return e;
  }
}
