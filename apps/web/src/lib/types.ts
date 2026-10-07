export type TicketStatus = 'PENDING' | 'IN_PROGRESS' | 'ON_HOLD' | 'AWAITING_CONFIRMATION' | 'COMPLETED';
export type TicketType = 'QUALITY' | 'RECOVERY' | 'LABOUR' | 'PRODUCTIVITY' | 'PLANNING' | 'SAFETY' | 'OTHERS';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PermissionScope = 'ALL' | 'SITES' | 'OWN';
export type LogAction =
  | 'CREATED'
  | 'ACKNOWLEDGED'
  | 'STATUS_CHANGED'
  | 'FOLLOW_UP'
  | 'COMMENT'
  | 'DETAILS_UPDATED'
  | 'ATTACHMENT_ADDED';

export interface SiteLite {
  id: string;
  code: string;
  name: string;
}

export interface Site extends SiteLite {
  location: string | null;
  isActive: boolean;
}

export interface Me {
  user: { id: string; name: string; email: string; role: string; roleId: string; siteIds: string[] };
  rules: { action: string; subject: string }[];
}

export interface TicketListItem {
  id: string;
  refNo: string;
  title: string;
  type: TicketType;
  priority: Priority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  site: SiteLite;
  raisedBy: { id: string; name: string };
}

export interface TicketList {
  items: TicketListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TicketLog {
  id: string;
  action: LogAction;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus | null;
  note: string | null;
  internal: boolean;
  createdAt: string;
  actor: { id: string; name: string; role: { name: string } };
}

export interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  internal: boolean;
  inline: boolean;
  createdAt: string;
  uploadedBy: { id: string; name: string };
}

export interface TicketDetail {
  id: string;
  refNo: string;
  title: string;
  description: string;
  type: TicketType;
  priority: Priority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  acknowledgedAt: string | null;
  site: SiteLite;
  raisedBy: { id: string; name: string };
  acknowledgedBy: { id: string; name: string } | null;
  logs: TicketLog[];
  attachments: Attachment[];
  allowed: {
    update: boolean;
    acknowledge: boolean;
    changeStatus: boolean;
    complete: boolean;
    confirmCompletion: boolean;
    comment: boolean;
    followUp: boolean;
    attach: boolean;
    viewInternal: boolean;
  };
}

/** A ticket staff have marked as done, waiting for the client to confirm. */
export interface AwaitingTicket {
  id: string;
  refNo: string;
  title: string;
  site: SiteLite;
  requestedAt: string;
  requestedBy: string | null;
  note: string | null;
}

export interface DashboardSummary {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byType: Record<TicketType, number>;
  byPriority: Record<Priority, number>;
  bySite: { site: SiteLite; total: number; byStatus: Record<TicketStatus, number> }[];
  recent: (Pick<TicketListItem, 'id' | 'refNo' | 'title' | 'status' | 'priority' | 'type' | 'updatedAt'> & {
    site: SiteLite;
  })[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  role: { id: string; name: string };
  sites: SiteLite[];
}

export interface PermissionRow {
  action: string;
  subject: string;
  scope: PermissionScope;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: PermissionRow[];
  _count: { users: number };
}

export interface CatalogEntry {
  subject: string;
  scoped: boolean;
  actions: { action: string; label: string }[];
}
