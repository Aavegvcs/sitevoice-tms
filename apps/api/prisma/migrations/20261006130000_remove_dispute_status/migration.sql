-- DISPUTE is retired: existing disputed tickets (and their history) become ON_HOLD.
UPDATE "Ticket" SET "status" = 'ON_HOLD' WHERE "status" = 'DISPUTE';
UPDATE "TicketLog" SET "fromStatus" = 'ON_HOLD' WHERE "fromStatus" = 'DISPUTE';
UPDATE "TicketLog" SET "toStatus" = 'ON_HOLD' WHERE "toStatus" = 'DISPUTE';

-- Postgres cannot drop an enum value, so recreate the type without it.
BEGIN;
CREATE TYPE "TicketStatus_new" AS ENUM ('PENDING', 'IN_PROGRESS', 'ON_HOLD', 'AWAITING_CONFIRMATION', 'COMPLETED');
ALTER TABLE "Ticket" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TABLE "TicketLog" ALTER COLUMN "fromStatus" TYPE "TicketStatus_new" USING ("fromStatus"::text::"TicketStatus_new");
ALTER TABLE "TicketLog" ALTER COLUMN "toStatus" TYPE "TicketStatus_new" USING ("toStatus"::text::"TicketStatus_new");
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "TicketStatus_old";
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
