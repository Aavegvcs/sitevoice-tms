-- Tickets that already left Pending count as acknowledged: use the first status change as the acknowledgement.
UPDATE "Ticket" t
SET "acknowledgedAt" = l."createdAt",
    "acknowledgedById" = l."actorId"
FROM (
  SELECT DISTINCT ON ("ticketId") "ticketId", "createdAt", "actorId"
  FROM "TicketLog"
  WHERE "action" = 'STATUS_CHANGED' AND "fromStatus" = 'PENDING'
  ORDER BY "ticketId", "createdAt" ASC
) l
WHERE t."id" = l."ticketId"
  AND t."acknowledgedAt" IS NULL
  AND t."status" <> 'PENDING';
