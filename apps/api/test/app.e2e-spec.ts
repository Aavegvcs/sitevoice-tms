import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';

const PASSWORD = process.env.SEED_PASSWORD ?? 'Test@1234';

describe('SiteVoice API (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  const cookies: Record<string, string[]> = {};
  const as = (who: string) => ({ Cookie: cookies[who] });

  async function login(email: string) {
    const res = await http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
    return res.headers['set-cookie'] as unknown as string[];
  }

  async function siteId(code: string) {
    const res = await http().get('/api/sites').set(as('admin')).expect(200);
    return res.body.find((s: { code: string }) => s.code === code).id as string;
  }

  async function raise(who: string, site: string, extra: Record<string, string> = {}) {
    const res = await http()
      .post('/api/tickets')
      .set(as(who))
      .field('title', 'Cracked slab near gate')
      .field('description', 'There is a crack across the slab near the main gate.')
      .field('type', 'QUALITY')
      .field('priority', 'HIGH')
      .field('siteId', site)
      .field(extra)
      .attach('files', Buffer.from('fake image bytes'), 'crack.png')
      .expect(201);
    return res.body as { id: string; refNo: string };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    for (const who of ['admin', 'manager', 'supervisor', 'client', 'client2']) {
      cookies[who] = await login(`${who}@example.com`);
    }
  });

  afterAll(() => app.close());

  describe('authentication', () => {
    it('health is public', () => http().get('/api/health').expect(200));

    it('rejects a wrong password and unauthenticated requests', async () => {
      await http().post('/api/auth/login').send({ email: 'admin@example.com', password: 'nope' }).expect(401);
      await http().get('/api/tickets').expect(401);
    });

    it('returns the role rules for the signed-in user', async () => {
      const res = await http().get('/api/auth/me').set(as('client')).expect(200);
      expect(res.body.user.role).toBe('Client');
      expect(res.body.rules).toEqual(expect.arrayContaining([{ action: 'create', subject: 'Ticket' }]));
      expect(res.body.rules).not.toEqual(expect.arrayContaining([{ action: 'manage', subject: 'User' }]));
    });
  });

  describe('ticket lifecycle and visibility', () => {
    let siteA: string;
    let siteB: string;
    let ticket: { id: string; refNo: string };

    beforeAll(async () => {
      siteA = await siteId('SITE-A');
      siteB = await siteId('SITE-B');
      ticket = await raise('client', siteA);
    });

    it('creates a numbered ticket in Pending with a creation log and the attachment', async () => {
      expect(ticket.refNo).toMatch(/^TKT-\d{4}-\d{4}$/);
      const res = await http().get(`/api/tickets/${ticket.id}`).set(as('client')).expect(200);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.logs.map((l: { action: string }) => l.action)).toEqual(['CREATED']);
      expect(res.body.attachments).toHaveLength(1);
    });

    it('validates input', async () => {
      await http().post('/api/tickets').set(as('client')).field('title', 'x').expect(400);
    });

    it('a client cannot raise a ticket for a site they are not linked to', async () => {
      await http()
        .post('/api/tickets')
        .set(as('client'))
        .field('title', 'Not my site')
        .field('description', 'Trying another site')
        .field('type', 'QUALITY')
        .field('priority', 'LOW')
        .field('siteId', siteB)
        .expect(403);
    });

    it('a client sees only their own tickets', async () => {
      const mine = await http().get('/api/tickets?pageSize=50').set(as('client')).expect(200);
      expect(mine.body.items.every((t: { raisedBy: { name: string } }) => t.raisedBy.name === 'Cathy Client')).toBe(true);
      expect(mine.body.items.map((t: { id: string }) => t.id)).toContain(ticket.id);

      const other = await http().get('/api/tickets?pageSize=50').set(as('client2')).expect(200);
      expect(other.body.items.map((t: { id: string }) => t.id)).not.toContain(ticket.id);
      await http().get(`/api/tickets/${ticket.id}`).set(as('client2')).expect(404);
    });

    it('site staff only see tickets of their own sites', async () => {
      const sup = await http().get('/api/tickets?pageSize=50').set(as('supervisor')).expect(200);
      expect(sup.body.items.map((t: { id: string }) => t.id)).toContain(ticket.id);
      expect(sup.body.items.every((t: { site: { code: string } }) => t.site.code === 'SITE-A')).toBe(true);

      const ticketB = await raise('client2', siteB);
      await http().get(`/api/tickets/${ticketB.id}`).set(as('supervisor')).expect(404);
      await http().get(`/api/tickets/${ticketB.id}`).set(as('manager')).expect(200); // manager has A and B
    });

    it('acknowledging is allowed once and is logged', async () => {
      await http().post(`/api/tickets/${ticket.id}/acknowledge`).set(as('supervisor')).expect(200);
      await http().post(`/api/tickets/${ticket.id}/acknowledge`).set(as('manager')).expect(409);
      await http().post(`/api/tickets/${ticket.id}/acknowledge`).set(as('client')).expect(403);
      const res = await http().get(`/api/tickets/${ticket.id}`).set(as('client')).expect(200);
      expect(res.body.logs.map((l: { action: string }) => l.action)).toContain('ACKNOWLEDGED');
    });

    it('staff comments and photos are hidden from the client', async () => {
      await http().post(`/api/tickets/${ticket.id}/comments`).set(as('supervisor')).send({ body: 'Contractor informed' }).expect(200);
      await http()
        .post(`/api/tickets/${ticket.id}/attachments`)
        .set(as('supervisor'))
        .attach('files', Buffer.from('internal photo'), 'site-photo.png')
        .expect(200);

      const staff = await http().get(`/api/tickets/${ticket.id}`).set(as('manager')).expect(200);
      expect(staff.body.logs.some((l: { action: string }) => l.action === 'COMMENT')).toBe(true);
      expect(staff.body.attachments).toHaveLength(2);

      const client = await http().get(`/api/tickets/${ticket.id}`).set(as('client')).expect(200);
      expect(client.body.logs.some((l: { internal: boolean }) => l.internal)).toBe(false);
      expect(client.body.logs.some((l: { action: string }) => l.action === 'COMMENT')).toBe(false);
      expect(client.body.attachments).toHaveLength(1);

      const internalAtt = staff.body.attachments.find((a: { internal: boolean }) => a.internal);
      await http().get(`/api/tickets/${ticket.id}/attachments/${internalAtt.id}/file`).set(as('client')).expect(404);
      await http().get(`/api/tickets/${ticket.id}/attachments/${internalAtt.id}/file`).set(as('supervisor')).expect(200);
    });

    it('a client cannot post internal comments, but can follow up at any time', async () => {
      await http().post(`/api/tickets/${ticket.id}/comments`).set(as('client')).send({ body: 'hi' }).expect(403);
      await http().post(`/api/tickets/${ticket.id}/follow-up`).set(as('client')).send({ message: 'Any update?' }).expect(200);
      await http().post(`/api/tickets/${ticket.id}/follow-up`).set(as('supervisor')).send({ message: 'x' }).expect(403);
      const res = await http().get(`/api/tickets/${ticket.id}`).set(as('supervisor')).expect(200);
      expect(res.body.logs.some((l: { action: string; note: string }) => l.action === 'FOLLOW_UP' && l.note === 'Any update?')).toBe(true);
    });

    it('status changes need the permission, which the Admin can grant', async () => {
      await http().post(`/api/tickets/${ticket.id}/status`).set(as('supervisor')).send({ status: 'IN_PROGRESS' }).expect(403);

      const roles = await http().get('/api/roles').set(as('admin')).expect(200);
      const supRole = roles.body.find((r: { name: string }) => r.name === 'Supervisor');
      const original = supRole.permissions;
      try {
        await http()
          .put(`/api/roles/${supRole.id}/permissions`)
          .set(as('admin'))
          .send({ permissions: [...original, { subject: 'Ticket', action: 'changeStatus', scope: 'SITES' }] })
          .expect(200);

        await http().post(`/api/tickets/${ticket.id}/status`).set(as('supervisor')).send({ status: 'IN_PROGRESS' }).expect(200);
        // A reason is mandatory for On Hold.
        await http().post(`/api/tickets/${ticket.id}/status`).set(as('supervisor')).send({ status: 'ON_HOLD' }).expect(400);
        await http()
          .post(`/api/tickets/${ticket.id}/status`)
          .set(as('supervisor'))
          .send({ status: 'ON_HOLD', note: 'Waiting for material' })
          .expect(200);
        await http().post(`/api/tickets/${ticket.id}/status`).set(as('supervisor')).send({ status: 'ON_HOLD', note: 'again' }).expect(400);
        await http().post(`/api/tickets/${ticket.id}/status`).set(as('supervisor')).send({ status: 'IN_PROGRESS' }).expect(200);
      } finally {
        await http().put(`/api/roles/${supRole.id}/permissions`).set(as('admin')).send({ permissions: original }).expect(200);
      }
      // Revoked again straight away, with no re-login needed.
      await http().post(`/api/tickets/${ticket.id}/status`).set(as('supervisor')).send({ status: 'PENDING' }).expect(403);
    });

    it('only the owning client can mark the ticket Completed', async () => {
      await http().post(`/api/tickets/${ticket.id}/complete`).set(as('supervisor')).send({}).expect(403);
      await http().post(`/api/tickets/${ticket.id}/complete`).set(as('client2')).send({}).expect(404);
      await http().post(`/api/tickets/${ticket.id}/complete`).set(as('client')).send({}).expect(200);
      await http().post(`/api/tickets/${ticket.id}/complete`).set(as('client')).send({}).expect(400);

      const res = await http().get(`/api/tickets/${ticket.id}`).set(as('client')).expect(200);
      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.completedAt).toBeTruthy();
      expect(res.body.allowed.complete).toBe(false);
      const actions = res.body.logs.map((l: { action: string }) => l.action);
      expect(actions[0]).toBe('CREATED');
      expect(actions).toContain('STATUS_CHANGED');
    });

    it('managers can edit priority; supervisors and clients cannot', async () => {
      const t = await raise('client', siteA);
      await http().patch(`/api/tickets/${t.id}`).set(as('manager')).send({ priority: 'CRITICAL' }).expect(200);
      await http().patch(`/api/tickets/${t.id}`).set(as('supervisor')).send({ priority: 'LOW' }).expect(403);
      await http().patch(`/api/tickets/${t.id}`).set(as('client')).send({ priority: 'LOW' }).expect(403);
      const res = await http().get(`/api/tickets/${t.id}`).set(as('client')).expect(200);
      expect(res.body.priority).toBe('CRITICAL');
    });
  });

  describe('dashboards', () => {
    it('are scoped by the same rules as the ticket list', async () => {
      const client = await http().get('/api/dashboard').set(as('client')).expect(200);
      const mine = await http().get('/api/tickets?pageSize=1').set(as('client')).expect(200);
      expect(client.body.total).toBe(mine.body.total);
      expect(client.body.bySite.map((s: { site: { code: string } }) => s.site.code)).toEqual(['SITE-A']);

      const manager = await http().get('/api/dashboard').set(as('manager')).expect(200);
      expect(manager.body.bySite.length).toBeGreaterThanOrEqual(2);
      const admin = await http().get('/api/dashboard').set(as('admin')).expect(200);
      expect(admin.body.total).toBeGreaterThanOrEqual(manager.body.total);
    });

    it('a supervisor has no dashboard by default', () =>
      http().get('/api/dashboard').set(as('supervisor')).expect(403));
  });

  describe('administration', () => {
    it('only the Admin can manage users, roles and sites', async () => {
      for (const who of ['manager', 'supervisor', 'client']) {
        await http().get('/api/users').set(as(who)).expect(403);
        await http().get('/api/roles').set(as(who)).expect(403);
        await http().post('/api/sites').set(as(who)).send({ code: 'NOPE', name: 'Nope' }).expect(403);
      }
    });

    it('the Admin creates a site, a role, and a user with that role and site', async () => {
      const code = `T${Date.now().toString(36).toUpperCase()}`.slice(0, 12);
      const site = await http().post('/api/sites').set(as('admin')).send({ code, name: 'Test Site' }).expect(201);
      await http().post('/api/sites').set(as('admin')).send({ code, name: 'Dup' }).expect(409);

      const roleName = `Auditor ${Date.now()}`;
      const role = await http()
        .post('/api/roles')
        .set(as('admin'))
        .send({
          name: roleName,
          permissions: [
            { subject: 'Ticket', action: 'read', scope: 'SITES' },
            { subject: 'Dashboard', action: 'read' },
            { subject: 'Site', action: 'read' },
          ],
        })
        .expect(201);
      await http()
        .put(`/api/roles/${role.body.id}/permissions`)
        .set(as('admin'))
        .send({ permissions: [{ subject: 'Ticket', action: 'fly', scope: 'ALL' }] })
        .expect(400);

      const email = `auditor${Date.now()}@example.com`;
      await http()
        .post('/api/users')
        .set(as('admin'))
        .send({ name: 'Audrey Auditor', email, password: 'Sup3rSecret!', roleId: role.body.id, siteIds: [site.body.id] })
        .expect(201);
      await http()
        .post('/api/users')
        .set(as('admin'))
        .send({ name: 'Dup', email, password: 'Sup3rSecret!', roleId: role.body.id })
        .expect(409);

      const login = await http().post('/api/auth/login').send({ email, password: 'Sup3rSecret!' }).expect(200);
      const me = await http().get('/api/auth/me').set({ Cookie: login.headers['set-cookie'] }).expect(200);
      expect(me.body.user.siteIds).toEqual([site.body.id]);
      // Custom role: can read tickets (none in this new site) but cannot raise or administer.
      const list = await http().get('/api/tickets').set({ Cookie: login.headers['set-cookie'] }).expect(200);
      expect(list.body.total).toBe(0);
      await http().get('/api/users').set({ Cookie: login.headers['set-cookie'] }).expect(403);

      await http().delete(`/api/roles/${role.body.id}`).set(as('admin')).expect(409); // still has a user
    });

    it('protects the Admin role and the Admin themself', async () => {
      const roles = await http().get('/api/roles').set(as('admin')).expect(200);
      const adminRole = roles.body.find((r: { name: string }) => r.name === 'Admin');
      await http().put(`/api/roles/${adminRole.id}/permissions`).set(as('admin')).send({ permissions: [] }).expect(400);
      await http().delete(`/api/roles/${adminRole.id}`).set(as('admin')).expect(400);

      const me = await http().get('/api/auth/me').set(as('admin')).expect(200);
      await http().patch(`/api/users/${me.body.user.id}`).set(as('admin')).send({ isActive: false }).expect(400);
    });

    it('deactivating a user ends their access immediately', async () => {
      const email = `temp${Date.now()}@example.com`;
      const roles = await http().get('/api/roles').set(as('admin')).expect(200);
      const clientRole = roles.body.find((r: { name: string }) => r.name === 'Client');
      const user = await http()
        .post('/api/users')
        .set(as('admin'))
        .send({ name: 'Temp Client', email, password: 'Sup3rSecret!', roleId: clientRole.id })
        .expect(201);
      const login = await http().post('/api/auth/login').send({ email, password: 'Sup3rSecret!' }).expect(200);
      const cookie = { Cookie: login.headers['set-cookie'] };
      await http().get('/api/auth/me').set(cookie).expect(200);

      await http().patch(`/api/users/${user.body.id}`).set(as('admin')).send({ isActive: false }).expect(200);
      await http().get('/api/auth/me').set(cookie).expect(401);
      await http().post('/api/auth/login').send({ email, password: 'Sup3rSecret!' }).expect(401);
    });
  });
});
