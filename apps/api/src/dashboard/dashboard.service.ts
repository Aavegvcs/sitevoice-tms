import { Injectable } from '@nestjs/common';
import { Prisma, Priority, TicketStatus, TicketType } from '@prisma/client';
import { AppAbility } from '../casl/casl-ability.factory';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';

const STATUSES = Object.values(TicketStatus);
const TYPES = Object.values(TicketType);
const PRIORITIES = Object.values(Priority);

function zeroed<T extends string>(keys: T[]) {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
  ) {}

  /** Counts only over tickets the user may read: own tickets for a client, allotted sites for a manager. */
  async summary(ability: AppAbility) {
    const where: Prisma.TicketWhereInput = this.tickets.visibleWhere(ability);

    const [byStatus, byType, byPriority, bySiteStatus, recent] = await Promise.all([
      this.prisma.ticket.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.ticket.groupBy({ by: ['type'], where, _count: { _all: true } }),
      this.prisma.ticket.groupBy({ by: ['priority'], where, _count: { _all: true } }),
      this.prisma.ticket.groupBy({ by: ['siteId', 'status'], where, _count: { _all: true } }),
      this.prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          refNo: true,
          title: true,
          status: true,
          priority: true,
          type: true,
          updatedAt: true,
          site: { select: { id: true, code: true, name: true } },
        },
      }),
    ]);

    const status = zeroed(STATUSES);
    byStatus.forEach((r) => (status[r.status] = r._count._all));
    const type = zeroed(TYPES);
    byType.forEach((r) => (type[r.type] = r._count._all));
    const priority = zeroed(PRIORITIES);
    byPriority.forEach((r) => (priority[r.priority] = r._count._all));

    const siteIds = [...new Set(bySiteStatus.map((r) => r.siteId))];
    const sites = await this.prisma.site.findMany({
      where: { id: { in: siteIds } },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
    const bySite = sites.map((site) => {
      const counts = zeroed(STATUSES);
      bySiteStatus.filter((r) => r.siteId === site.id).forEach((r) => (counts[r.status] = r._count._all));
      return { site, total: Object.values(counts).reduce((a, b) => a + b, 0), byStatus: counts };
    });

    return {
      total: Object.values(status).reduce((a, b) => a + b, 0),
      byStatus: status,
      byType: type,
      byPriority: priority,
      bySite,
      recent,
    };
  }
}
