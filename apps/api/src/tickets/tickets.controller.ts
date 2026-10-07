import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthUser } from '../auth/auth.types';
import { CurrentAbility, CurrentUser } from '../auth/current-user.decorator';
import type { AppAbility } from '../casl/casl-ability.factory';
import { RequirePermission } from '../casl/policies.guard';
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
import { TicketsService } from './tickets.service';
import { CleanupUploadsOnError, MAX_FILES, uploadOptions } from './uploads';

const uploads = () => [FilesInterceptor('files', MAX_FILES, uploadOptions), CleanupUploadsOnError];

@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  @RequirePermission('read', 'Ticket')
  list(@Query() query: ListTicketsQuery, @CurrentAbility() ability: AppAbility) {
    return this.tickets.list(query, ability);
  }

  @Post()
  @RequirePermission('create', 'Ticket')
  @UseInterceptors(...uploads())
  create(
    @Body() dto: CreateTicketDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @CurrentUser() user: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ) {
    return this.tickets.create(dto, files, user, ability);
  }

  // Declared before ':id' so the path is not parsed as a ticket id.
  @Get('awaiting-confirmation')
  @RequirePermission('complete', 'Ticket')
  awaitingConfirmation(@CurrentAbility() ability: AppAbility) {
    return this.tickets.awaitingConfirmation(ability);
  }

  @Get(':id')
  @RequirePermission('read', 'Ticket')
  detail(@Param('id', ParseUUIDPipe) id: string, @CurrentAbility() ability: AppAbility) {
    return this.tickets.detail(id, ability);
  }

  @Patch(':id')
  @RequirePermission('update', 'Ticket')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ) {
    return this.tickets.update(id, dto, user, ability);
  }

  @Post(':id/acknowledge')
  @HttpCode(200)
  @RequirePermission('acknowledge', 'Ticket')
  acknowledge(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @CurrentAbility() ability: AppAbility) {
    return this.tickets.acknowledge(id, user, ability);
  }

  @Post(':id/status')
  @HttpCode(200)
  @RequirePermission('changeStatus', 'Ticket')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ) {
    return this.tickets.changeStatus(id, dto, user, ability);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @RequirePermission('complete', 'Ticket')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteTicketDto,
    @CurrentUser() user: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ) {
    return this.tickets.complete(id, dto, user, ability);
  }

  @Post(':id/reject-completion')
  @HttpCode(200)
  @RequirePermission('complete', 'Ticket')
  rejectCompletion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectCompletionDto,
    @CurrentUser() user: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ) {
    return this.tickets.rejectCompletion(id, dto, user, ability);
  }

  @Post(':id/follow-up')
  @HttpCode(200)
  @RequirePermission('followUp', 'Ticket')
  followUp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FollowUpDto,
    @CurrentUser() user: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ) {
    return this.tickets.followUp(id, dto, user, ability);
  }

  @Post(':id/comments')
  @HttpCode(200)
  @RequirePermission('comment', 'Ticket')
  comment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CommentDto,
    @CurrentUser() user: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ) {
    return this.tickets.comment(id, dto, user, ability);
  }

  @Post(':id/attachments')
  @HttpCode(200)
  @UseInterceptors(...uploads())
  attach(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @CurrentUser() user: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ) {
    return this.tickets.addAttachments(id, files, user, ability);
  }

  @Get(':id/attachments/:attachmentId/file')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentAbility() ability: AppAbility,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { file, type, disposition } = await this.tickets.download(id, attachmentId, ability);
    res.set({
      'Content-Type': type,
      'Content-Disposition': disposition,
      // Never let a browser guess a type and run an uploaded file as a page or script.
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, max-age=0',
    });
    return file;
  }
}
