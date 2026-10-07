import { subject } from '@casl/ability';
import { accessibleBy } from '@casl/prisma';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import { createReadStream, existsSync } from 'fs';
import { extname, join } from 'path';
import { AuthUser } from '../auth/auth.types';
import { AppAbility } from '../casl/casl-ability.factory';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangeStatusDto,
  CommentDto,
  CompleteTicketDto,
  CreateTicketDto,
  FollowUpDto,
  ListTicketsQuery,
  RejectCompletionDto,
  UpdateTicketDto,
} from './tickets.dto';
import { INLINE_TYPES, UPLOAD_DIR, decodeName, removeFiles } from './uploads';

type UploadedFile = Express.Multer.File;

const listSelect = {
  id: true,
  refNo: true,
  title: true,
  type: true,
  priority: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  acknowledgedAt: true,
  site: { select: { id: true, code: true, name: true } },
  raisedBy: { select: { id: true, name: true } },
} satisfies Prisma.TicketSelect;

const detailInclude = {
  site: { select: { id: true, code: true, name: true } },
  raisedBy: { select: { id: true, name: true } },
  acknowledgedBy: { select: { id: true, name: true } },
} satisfies Prisma.TicketInclude;

// Statuses that need an explanation, shown to the client in the log.
const NEEDS_REASON: TicketStatus[] = ['ON_HOLD'];

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- reads
  async list(q: ListTicketsQuery, ability: AppAbility) {
    const filters: Prisma.TicketWhereInput = {
      status: q.status,
      type: q.type,
      priority: q.priority,
      siteId: q.siteId,
      ...(q.q
        ? {
            OR: [
              { refNo: { contains: q.q, mode: 'insensitive' } },
              { title: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const where: Prisma.TicketWhereInput = { AND: [this.visibleWhere(ability), filters] };
    const [total, items] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        select: listSelect,
        orderBy: { updatedAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async detail(id: string, ability: AppAbility) {
    const ticket = await this.loadVisible(id, ability);
    const canInternal = this.can(ability, 'viewInternal', ticket);
    const visibility = canInternal ? {} : { internal: false };

    const [logs, attachments] = await Promise.all([
      this.prisma.ticketLog.findMany({
        where: { ticketId: id, ...visibility },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          internal: true,
          createdAt: true,
          actor: { select: { id: true, name: true, role: { select: { name: true } } } },
        },
      }),
      this.prisma.attachment.findMany({
        where: { ticketId: id, ...visibility },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          size: true,
          internal: true,
          createdAt: true,
          uploadedBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      ...ticket,
      logs,
      attachments: attachments.map((a) => ({ ...a, inline: extname(a.originalName).toLowerCase() in INLINE_TYPES })),
      // What the signed-in user may do right now; the UI shows exactly these controls.
      allowed: {
        update: this.can(ability, 'update', ticket),
        acknowledge: this.can(ability, 'acknowledge', ticket) && !ticket.acknowledgedAt,
        changeStatus: this.can(ability, 'changeStatus', ticket),
        complete: this.can(ability, 'complete', ticket) && ticket.status !== 'COMPLETED',
        // The client is being asked to confirm work that staff have marked as done.
        confirmCompletion: this.can(ability, 'complete', ticket) && ticket.status === 'AWAITING_CONFIRMATION',
        comment: this.can(ability, 'comment', ticket),
        followUp: this.can(ability, 'followUp', ticket),
        attach: this.can(ability, 'comment', ticket) || this.can(ability, 'followUp', ticket),
        viewInternal: canInternal,
      },
    };
  }

  // ---------------------------------------------------------------- writes
  async create(dto: CreateTicketDto, files: UploadedFile[], user: AuthUser, ability: AppAbility) {
    try {
      if (!this.can(ability, 'create', { siteId: dto.siteId, raisedById: user.id })) {
        throw new ForbiddenException('You cannot raise a ticket for this site');
      }
      const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
      if (!site || !site.isActive) throw new BadRequestException('Unknown or inactive site');

      return await this.prisma.$transaction(async (tx) => {
        const year = new Date().getFullYear();
        const counter = await tx.ticketCounter.upsert({
          where: { year },
          update: { last: { increment: 1 } },
          create: { year, last: 1 },
        });
        const ticket = await tx.ticket.create({
          data: {
            refNo: `TKT-${year}-${String(counter.last).padStart(4, '0')}`,
            title: dto.title.trim(),
            description: dto.description.trim(),
            type: dto.type,
            priority: dto.priority,
            siteId: dto.siteId,
            raisedById: user.id,
          },
        });
        await tx.ticketLog.create({
          data: { ticketId: ticket.id, actorId: user.id, action: 'CREATED', toStatus: 'PENDING' },
        });
        if (files.length) {
          await tx.attachment.createMany({ data: files.map((f) => this.attachmentRow(f, ticket.id, user.id, false)) });
        }
        return { id: ticket.id, refNo: ticket.refNo };
      });
    } catch (e) {
      removeFiles(files);
      throw e;
    }
  }

  async update(id: string, dto: UpdateTicketDto, user: AuthUser, ability: AppAbility) {
    const ticket = await this.loadVisible(id, ability);
    this.require(ability, 'update', ticket);

    const changes: string[] = [];
    const data: Prisma.TicketUpdateInput = {};
    if (dto.title !== undefined && dto.title.trim() !== ticket.title) {
      data.title = dto.title.trim();
      changes.push('title');
    }
    if (dto.description !== undefined && dto.description.trim() !== ticket.description) {
      data.description = dto.description.trim();
      changes.push('description');
    }
    if (dto.type !== undefined && dto.type !== ticket.type) {
      data.type = dto.type;
      changes.push(`type (${ticket.type} to ${dto.type})`);
    }
    if (dto.priority !== undefined && dto.priority !== ticket.priority) {
      data.priority = dto.priority;
      changes.push(`priority (${ticket.priority} to ${dto.priority})`);
    }
    if (!changes.length) return { id };

    await this.prisma.$transaction([
      this.prisma.ticket.update({ where: { id }, data }),
      this.prisma.ticketLog.create({
        data: { ticketId: id, actorId: user.id, action: 'DETAILS_UPDATED', note: `Updated ${changes.join(', ')}` },
      }),
    ]);
    return { id };
  }

  async acknowledge(id: string, user: AuthUser, ability: AppAbility) {
    const ticket = await this.loadVisible(id, ability);
    this.require(ability, 'acknowledge', ticket);

    await this.prisma.$transaction(async (tx) => {
      // Guarded update: two people acknowledging at once cannot both win.
      const res = await tx.ticket.updateMany({
        where: { id, acknowledgedAt: null },
        data: { acknowledgedAt: new Date(), acknowledgedById: user.id },
      });
      if (res.count === 0) throw new ConflictException('This ticket has already been acknowledged');
      await tx.ticketLog.create({ data: { ticketId: id, actorId: user.id, action: 'ACKNOWLEDGED' } });
    });
    return { id };
  }

  async changeStatus(id: string, dto: ChangeStatusDto, user: AuthUser, ability: AppAbility) {
    const ticket = await this.loadVisible(id, ability);
    this.require(ability, 'changeStatus', ticket);
    if (dto.status === 'COMPLETED') {
      throw new BadRequestException(
        'A ticket is completed only when the client confirms it. Set it to Awaiting confirmation instead',
      );
    }
    return this.applyStatus(ticket, dto.status, dto.note, user);
  }

  /** Only the client who raised the ticket can close it, once satisfied with the work. */
  async complete(id: string, dto: CompleteTicketDto, user: AuthUser, ability: AppAbility) {
    const ticket = await this.loadVisible(id, ability);
    this.require(ability, 'complete', ticket);
    return this.applyStatus(ticket, 'COMPLETED', dto.note, user);
  }

  /** The client is not satisfied with work marked as done: it goes back to In Progress with their reason. */
  async rejectCompletion(id: string, dto: RejectCompletionDto, user: AuthUser, ability: AppAbility) {
    const ticket = await this.loadVisible(id, ability);
    this.require(ability, 'complete', ticket);
    if (ticket.status !== 'AWAITING_CONFIRMATION') {
      throw new BadRequestException('This ticket is not waiting for your confirmation');
    }
    return this.applyStatus(ticket, 'IN_PROGRESS', dto.reason, user);
  }

  /** Tickets marked as done that this user is the one to confirm (a client's own tickets). */
  async awaitingConfirmation(ability: AppAbility) {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        AND: [
          this.visibleWhere(ability),
          (accessibleBy(ability as any, 'complete') as any).ofType('Ticket'),
          { status: 'AWAITING_CONFIRMATION' },
        ],
      },
      orderBy: { updatedAt: 'asc' },
      take: 20,
      select: {
        id: true,
        refNo: true,
        title: true,
        updatedAt: true,
        site: { select: { id: true, code: true, name: true } },
        logs: {
          where: { action: 'STATUS_CHANGED', toStatus: 'AWAITING_CONFIRMATION' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, note: true, actor: { select: { name: true } } },
        },
      },
    });
    return tickets.map(({ logs, ...t }) => ({
      ...t,
      requestedAt: logs[0]?.createdAt ?? t.updatedAt,
      requestedBy: logs[0]?.actor.name ?? null,
      note: logs[0]?.note ?? null,
    }));
  }

  async followUp(id: string, dto: FollowUpDto, user: AuthUser, ability: AppAbility) {
    const ticket = await this.loadVisible(id, ability);
    this.require(ability, 'followUp', ticket);
    await this.addLog(id, user.id, 'FOLLOW_UP', dto.message.trim(), false);
    return { id };
  }

  async comment(id: string, dto: CommentDto, user: AuthUser, ability: AppAbility) {
    const ticket = await this.loadVisible(id, ability);
    this.require(ability, 'comment', ticket);
    await this.addLog(id, user.id, 'COMMENT', dto.body.trim(), true);
    return { id };
  }

  async addAttachments(id: string, files: UploadedFile[], user: AuthUser, ability: AppAbility) {
    try {
      const ticket = await this.loadVisible(id, ability);
      const canComment = this.can(ability, 'comment', ticket);
      if (!canComment && !this.can(ability, 'followUp', ticket)) {
        throw new ForbiddenException('You do not have permission to add attachments');
      }
      if (!files.length) throw new BadRequestException('Attach at least one file');

      // Staff uploads are internal; a client's uploads are visible to everyone on the ticket.
      const internal = canComment;
      await this.prisma.$transaction([
        this.prisma.attachment.createMany({ data: files.map((f) => this.attachmentRow(f, id, user.id, internal)) }),
        this.prisma.ticketLog.create({
          data: {
            ticketId: id,
            actorId: user.id,
            action: 'ATTACHMENT_ADDED',
            note: files.map((f) => decodeName(f.originalname)).join(', '),
            internal,
          },
        }),
        this.prisma.ticket.update({ where: { id }, data: { updatedAt: new Date() } }),
      ]);
      return { id };
    } catch (e) {
      removeFiles(files);
      throw e;
    }
  }

  async download(id: string, attachmentId: string, ability: AppAbility) {
    const ticket = await this.loadVisible(id, ability);
    const att = await this.prisma.attachment.findFirst({ where: { id: attachmentId, ticketId: id } });
    if (!att || (att.internal && !this.can(ability, 'viewInternal', ticket))) {
      throw new NotFoundException('Attachment not found');
    }
    const path = join(UPLOAD_DIR, att.storedName);
    if (!existsSync(path)) throw new NotFoundException('File is no longer available');

    const ext = extname(att.originalName).toLowerCase();
    const inlineType = INLINE_TYPES[ext];
    return {
      file: new StreamableFile(createReadStream(path)),
      type: inlineType ?? 'application/octet-stream',
      disposition: `${inlineType ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(att.originalName)}`,
    };
  }

  // ---------------------------------------------------------------- helpers
  private async applyStatus(
    ticket: { id: string; status: TicketStatus },
    to: TicketStatus,
    note: string | undefined,
    user: AuthUser,
  ) {
    if (to === ticket.status) throw new BadRequestException(`The ticket is already ${to}`);
    const reason = note?.trim();
    const reopening = ticket.status === 'COMPLETED';
    if ((NEEDS_REASON.includes(to) || reopening) && !reason) {
      throw new BadRequestException(
        reopening ? 'A reason is required to reopen a completed ticket' : `A reason is required to set ${to}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Compare-and-set on the current status so concurrent changes cannot overwrite each other.
      const res = await tx.ticket.updateMany({
        where: { id: ticket.id, status: ticket.status },
        data: { status: to, completedAt: to === 'COMPLETED' ? new Date() : null, updatedAt: new Date() },
      });
      if (res.count === 0) throw new ConflictException('The ticket was changed by someone else. Reload and retry');
      await tx.ticketLog.create({
        data: {
          ticketId: ticket.id,
          actorId: user.id,
          action: 'STATUS_CHANGED',
          fromStatus: ticket.status,
          toStatus: to,
          note: reason || null,
        },
      });
    });
    return { id: ticket.id, status: to };
  }

  private async addLog(ticketId: string, actorId: string, action: 'FOLLOW_UP' | 'COMMENT', note: string, internal: boolean) {
    await this.prisma.$transaction([
      this.prisma.ticketLog.create({ data: { ticketId, actorId, action, note, internal } }),
      this.prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } }),
    ]);
  }

  private attachmentRow(f: UploadedFile, ticketId: string, uploadedById: string, internal: boolean) {
    return {
      ticketId,
      uploadedById,
      storedName: f.filename,
      originalName: decodeName(f.originalname),
      mimeType: f.mimetype,
      size: f.size,
      internal,
    };
  }

  /** Prisma where-clause of every ticket this user may read (their rule's SITES / OWN / ALL scope). */
  visibleWhere(ability: AppAbility): Prisma.TicketWhereInput {
    return (accessibleBy(ability as any, 'read') as any).ofType('Ticket');
  }

  /** Loads a ticket the user may read; anything else is a 404 so existence is not leaked. */
  private async loadVisible(id: string, ability: AppAbility) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: detailInclude });
    if (!ticket || !this.can(ability, 'read', ticket)) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  private can(ability: AppAbility, action: string, ticket: object) {
    return ability.can(action, subject('Ticket', ticket as any));
  }

  private require(ability: AppAbility, action: string, ticket: object) {
    if (!this.can(ability, action, ticket)) {
      throw new ForbiddenException('You do not have permission to do this on this ticket');
    }
  }
}
