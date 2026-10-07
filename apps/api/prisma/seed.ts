import { LogAction, PermissionScope, Priority, PrismaClient, TicketStatus, TicketType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Development-only credentials. Override with SEED_PASSWORD; never use in production.
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Password@123';

type Rule = { action: string; subject: string; scope?: PermissionScope };

// Default permissions of the four system roles. After the first seed the Admin owns these:
// re-running the seed never overwrites permissions of a role that already exists.
const SYSTEM_ROLES: { name: string; description: string; rules: Rule[] }[] = [
  {
    name: 'Admin',
    description: 'Manages sites, users, roles and permissions; can do everything other roles can.',
    rules: [{ action: 'manage', subject: 'all' }],
  },
  {
    name: 'Manager',
    description: 'Manager / HO. Oversees tickets for one or more allotted sites.',
    rules: [
      { action: 'read', subject: 'Ticket', scope: 'SITES' },
      { action: 'update', subject: 'Ticket', scope: 'SITES' },
      { action: 'acknowledge', subject: 'Ticket', scope: 'SITES' },
      { action: 'comment', subject: 'Ticket', scope: 'SITES' },
      { action: 'viewInternal', subject: 'Ticket', scope: 'SITES' },
      { action: 'read', subject: 'Site' },
      { action: 'read', subject: 'Dashboard' },
    ],
  },
  {
    name: 'Supervisor',
    description: 'Site Engineer / Supervisor. Works on tickets for their sites.',
    rules: [
      { action: 'read', subject: 'Ticket', scope: 'SITES' },
      { action: 'acknowledge', subject: 'Ticket', scope: 'SITES' },
      // Moves work along; "done" becomes Awaiting confirmation until the client confirms.
      { action: 'changeStatus', subject: 'Ticket', scope: 'SITES' },
      { action: 'comment', subject: 'Ticket', scope: 'SITES' },
      { action: 'viewInternal', subject: 'Ticket', scope: 'SITES' },
      { action: 'read', subject: 'Site' },
    ],
  },
  {
    name: 'Client',
    description: 'Raises tickets, follows up, and confirms completion. Sees only their own tickets.',
    rules: [
      { action: 'create', subject: 'Ticket', scope: 'SITES' },
      { action: 'read', subject: 'Ticket', scope: 'OWN' },
      { action: 'followUp', subject: 'Ticket', scope: 'OWN' },
      { action: 'complete', subject: 'Ticket', scope: 'OWN' },
      { action: 'read', subject: 'Site' },
      { action: 'read', subject: 'Dashboard' },
    ],
  },
];

const SITES = [
  { code: 'SITE-A', name: 'Riverside Towers', location: 'Plot 12, Riverside' },
  { code: 'SITE-B', name: 'Metro Bridge Project', location: 'Sector 5 Flyover' },
  { code: 'SITE-C', name: 'Green Valley Township', location: 'Phase 2, Green Valley' },
];

const USERS = [
  { name: 'Alice Admin', email: 'admin@example.com', role: 'Admin', sites: [] as string[] },
  { name: 'Mark Manager', email: 'manager@example.com', role: 'Manager', sites: ['SITE-A', 'SITE-B'] },
  { name: 'Sam Supervisor', email: 'supervisor@example.com', role: 'Supervisor', sites: ['SITE-A'] },
  { name: 'Cathy Client', email: 'client@example.com', role: 'Client', sites: ['SITE-A'] },
  { name: 'Carl Client', email: 'client2@example.com', role: 'Client', sites: ['SITE-B'] },
];

async function nextRef(year: number) {
  const c = await prisma.ticketCounter.upsert({
    where: { year },
    update: { last: { increment: 1 } },
    create: { year, last: 1 },
  });
  return `TKT-${year}-${String(c.last).padStart(4, '0')}`;
}

async function main() {
  for (const r of SYSTEM_ROLES) {
    const existing = await prisma.role.findUnique({ where: { name: r.name } });
    if (existing) continue;
    await prisma.role.create({
      data: {
        name: r.name,
        description: r.description,
        isSystem: true,
        permissions: {
          create: r.rules.map((p) => ({ action: p.action, subject: p.subject, scope: p.scope ?? 'ALL' })),
        },
      },
    });
  }

  // Production bootstrap: only the roles above and one Admin; no demo sites, users or tickets.
  // Everything else is then created by the Admin in the app.
  if (process.env.SEED_MINIMAL === 'true') {
    const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com').trim().toLowerCase();
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Admin' } });
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name: 'Administrator', email, passwordHash: await bcrypt.hash(SEED_PASSWORD, 10), roleId: adminRole.id },
    });
    console.log(`Seed complete (minimal): roles and Admin user ${email}`);
    return;
  }

  const siteIds: Record<string, string> = {};
  for (const s of SITES) {
    const site = await prisma.site.upsert({ where: { code: s.code }, update: {}, create: s });
    siteIds[s.code] = site.id;
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const userIds: Record<string, string> = {};
  for (const u of USERS) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: u.role } });
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash, roleId: role.id },
    });
    userIds[u.email] = user.id;
    for (const code of u.sites) {
      await prisma.userSite.upsert({
        where: { userId_siteId: { userId: user.id, siteId: siteIds[code] } },
        update: {},
        create: { userId: user.id, siteId: siteIds[code] },
      });
    }
  }

  // Demo tickets, only on an empty database.
  if ((await prisma.ticket.count()) === 0) {
    const year = new Date().getFullYear();
    const client = userIds['client@example.com'];
    const client2 = userIds['client2@example.com'];
    const sup = userIds['supervisor@example.com'];
    const mgr = userIds['manager@example.com'];

    const demo: {
      title: string;
      description: string;
      type: TicketType;
      priority: Priority;
      status: TicketStatus;
      site: string;
      by: string;
      acknowledged?: boolean;
      internal?: string;
    }[] = [
      { title: 'Cracks in the plastering on floor 3', description: 'Hairline cracks along the east wall of flats 301-304.', type: 'QUALITY', priority: 'HIGH', status: 'IN_PROGRESS', site: 'SITE-A', by: client, acknowledged: true, internal: 'Inspected on site; re-plastering planned.' },
      { title: 'Steel delivery delayed by three days', description: 'Reinforcement steel promised for Monday has not arrived.', type: 'PLANNING', priority: 'CRITICAL', status: 'PENDING', site: 'SITE-A', by: client },
      { title: 'Safety railing missing on the terrace', description: 'No guard rail along the open edge of the terrace slab.', type: 'SAFETY', priority: 'CRITICAL', status: 'ON_HOLD', site: 'SITE-A', by: client, acknowledged: true },
      { title: 'Labour shortage on the night shift', description: 'Only half the agreed workforce turned up this week.', type: 'LABOUR', priority: 'MEDIUM', status: 'COMPLETED', site: 'SITE-A', by: client, acknowledged: true },
      { title: 'Pier cap alignment out of tolerance', description: 'Pier cap P4 is 20 mm off the drawing.', type: 'QUALITY', priority: 'HIGH', status: 'ON_HOLD', site: 'SITE-B', by: client2, acknowledged: true },
      { title: 'Slow progress on deck slab casting', description: 'Casting is two weeks behind the agreed schedule.', type: 'PRODUCTIVITY', priority: 'LOW', status: 'PENDING', site: 'SITE-B', by: client2 },
    ];

    for (const d of demo) {
      const refNo = await nextRef(year);
      const t = await prisma.ticket.create({
        data: {
          refNo,
          title: d.title,
          description: d.description,
          type: d.type,
          priority: d.priority,
          status: d.status,
          siteId: siteIds[d.site],
          raisedById: d.by,
          acknowledgedAt: d.acknowledged ? new Date() : null,
          acknowledgedById: d.acknowledged ? (d.site === 'SITE-A' ? sup : mgr) : null,
          completedAt: d.status === 'COMPLETED' ? new Date() : null,
        },
      });
      const logs: { actorId: string; action: LogAction; toStatus?: TicketStatus; note?: string; internal?: boolean }[] = [
        { actorId: d.by, action: 'CREATED', toStatus: 'PENDING' },
      ];
      if (d.acknowledged) logs.push({ actorId: d.site === 'SITE-A' ? sup : mgr, action: 'ACKNOWLEDGED' });
      if (d.status !== 'PENDING') {
        logs.push({ actorId: mgr, action: 'STATUS_CHANGED', toStatus: d.status, note: d.status === 'ON_HOLD' ? 'Waiting for a decision' : undefined });
      }
      if (d.internal) logs.push({ actorId: sup, action: 'COMMENT', note: d.internal, internal: true });
      await prisma.ticketLog.createMany({ data: logs.map((l) => ({ ...l, ticketId: t.id })) });
    }
  }

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
