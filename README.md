# SiteVoice: Site Ticket Management System

Clients raise tickets about work on construction sites; site teams and head office acknowledge, discuss
and track them; clients confirm completion. Access is controlled by roles whose permissions the Admin
manages.

- **Web:** Next.js 16 (App Router), Tailwind, TanStack Query, react-hook-form + zod
- **API:** NestJS 11, Prisma 6, PostgreSQL 16, CASL (`@casl/ability`, `@casl/prisma`)
- **Layout:** npm workspaces: `apps/api`, `apps/web`

## Run it locally

```bash
npm install
docker compose up -d postgres          # Postgres on localhost:5434
cp apps/api/.env.example apps/api/.env # then edit if needed
cp apps/web/.env.example apps/web/.env.local
cd apps/api && npx prisma migrate deploy && npx prisma db seed && cd ../..
npm run dev:api                        # http://localhost:4000  (Swagger: /api/docs)
npm run dev:web                        # http://localhost:3100
```

Seeded users (all share the password in `SEED_PASSWORD`, default `Password@123`; development only):

| Email | Role | Sites |
|---|---|---|
| `admin@example.com` | Admin | all |
| `manager@example.com` | Manager / HO | SITE-A, SITE-B |
| `supervisor@example.com` | Site Engineer / Supervisor | SITE-A |
| `client@example.com` | Client | SITE-A |
| `client2@example.com` | Client | SITE-B |

Diagrams of the database relations, user flow, status lifecycle and request authorisation are in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## How access works

Permissions are rows in the database (`Permission`: action + subject + scope), edited by the Admin under
**Roles & permissions**. On every request the API loads the user's role, builds a CASL ability from those
rows, and uses it for two things: a route check (`@RequirePermission`) and row filtering
(`accessibleBy(...)` for lists, `ability.can(action, subject('Ticket', row))` for single tickets).

- Scope `ALL` = every ticket, `SITES` = tickets of the user's allotted sites, `OWN` = tickets the user raised.
- Defaults match the product document: clients see only their own tickets; supervisors and managers see
  their sites; only the Admin can change status unless granted `changeStatus`; the client alone can mark
  a ticket Completed (`complete`); internal comments and photos need `viewInternal` to be seen.
- Changes apply on the next request. Nobody needs to sign in again.
- The Admin role always has full access and cannot be edited or deleted.

## Tests

```bash
# one-time: a separate database for tests
docker compose exec postgres psql -U complaint -d postgres -c "CREATE DATABASE sitevoice_test OWNER complaint"
cd apps/api
DATABASE_URL="postgresql://complaint:complaint@localhost:5434/sitevoice_test?schema=public" npx prisma migrate deploy
DATABASE_URL="postgresql://complaint:complaint@localhost:5434/sitevoice_test?schema=public" SEED_PASSWORD=Test@1234 npx prisma db seed
SEED_PASSWORD=Test@1234 npm run test:e2e
```

## Notes

- Uploads are stored on local disk under `apps/api/uploads` (override with `UPLOAD_DIR`). Images are
  shown inline; every other file type downloads as an attachment.
- Set a random `JWT_ACCESS_SECRET` (32+ characters) and `NODE_ENV=production` for any real deployment.
  Serve the web app and API over HTTPS so the session cookies are marked secure.
- Login is limited to 10 attempts per minute per IP.
