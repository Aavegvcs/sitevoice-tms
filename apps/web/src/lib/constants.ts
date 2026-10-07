import type { LogAction, PermissionScope, Priority, TicketStatus, TicketType } from './types';

export const STATUSES: TicketStatus[] = ['PENDING', 'IN_PROGRESS', 'ON_HOLD', 'AWAITING_CONFIRMATION', 'COMPLETED'];
export const TYPES: TicketType[] = ['QUALITY', 'RECOVERY', 'LABOUR', 'PRODUCTIVITY', 'PLANNING', 'SAFETY', 'OTHERS'];
export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const STATUS_META: Record<TicketStatus, { label: string; badge: string; dot: string; bar: string }> = {
  PENDING: { label: 'Pending', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  IN_PROGRESS: { label: 'In Progress', badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500', bar: 'bg-blue-500' },
  ON_HOLD: { label: 'On Hold', badge: 'bg-slate-200 text-slate-700', dot: 'bg-slate-500', bar: 'bg-slate-500' },
  AWAITING_CONFIRMATION: { label: 'Awaiting confirmation', badge: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500', bar: 'bg-violet-500' },
  COMPLETED: { label: 'Completed', badge: 'bg-green-100 text-green-800', dot: 'bg-green-500', bar: 'bg-green-500' },
};

export const PRIORITY_META: Record<Priority, { label: string; badge: string; bar: string }> = {
  LOW: { label: 'Low', badge: 'bg-green-100 text-green-800', bar: 'bg-green-500' },
  MEDIUM: { label: 'Medium', badge: 'bg-blue-100 text-blue-800', bar: 'bg-blue-500' },
  HIGH: { label: 'High', badge: 'bg-orange-100 text-orange-800', bar: 'bg-orange-500' },
  CRITICAL: { label: 'Critical', badge: 'bg-red-100 text-red-800', bar: 'bg-red-500' },
};

export const TYPE_LABEL: Record<TicketType, string> = {
  QUALITY: 'Quality',
  RECOVERY: 'Recovery',
  LABOUR: 'Labour',
  PRODUCTIVITY: 'Productivity',
  PLANNING: 'Planning',
  SAFETY: 'Safety',
  OTHERS: 'Others',
};

export const LOG_LABEL: Record<LogAction, string> = {
  CREATED: 'Ticket raised',
  ACKNOWLEDGED: 'Acknowledged',
  STATUS_CHANGED: 'Status changed',
  FOLLOW_UP: 'Follow-up',
  COMMENT: 'Internal comment',
  DETAILS_UPDATED: 'Details updated',
  ATTACHMENT_ADDED: 'Files added',
};

export const SCOPE_LABEL: Record<PermissionScope, string> = {
  ALL: 'All tickets',
  SITES: 'Tickets of their sites',
  OWN: 'Tickets they raised',
};
