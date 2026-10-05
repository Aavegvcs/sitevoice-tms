// The complete list of permissions an Admin can grant. The API refuses anything outside it.
export const PERMISSION_CATALOG = {
  Ticket: {
    create: 'Raise a ticket',
    read: 'View tickets',
    update: 'Edit ticket details (title, description, priority, type)',
    acknowledge: 'Acknowledge a ticket',
    changeStatus: 'Change the status of a ticket',
    comment: 'Add internal comments and photos (hidden from the client)',
    followUp: 'Follow up on a ticket (visible to everyone on it)',
    complete: 'Mark a ticket as Completed',
    viewInternal: 'See internal comments and photos',
  },
  Site: {
    read: 'View sites',
    manage: 'Create and manage sites',
  },
  User: {
    read: 'View users',
    manage: 'Create and manage users',
  },
  Role: {
    read: 'View roles and permissions',
    manage: 'Create and manage roles and permissions',
  },
  Dashboard: {
    read: 'View the dashboard',
  },
} as const;

export type CatalogSubject = keyof typeof PERMISSION_CATALOG;

export function isValidPermission(subject: string, action: string): boolean {
  const actions = (PERMISSION_CATALOG as Record<string, Record<string, string>>)[subject];
  return !!actions && action in actions;
}

/** Only tickets are row-scoped; every other subject ignores the scope. */
export const SCOPED_SUBJECT = 'Ticket';
