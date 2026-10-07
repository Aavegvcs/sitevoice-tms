-- Staff mark work as done with this status; only the client's confirmation moves it to COMPLETED.
ALTER TYPE "TicketStatus" ADD VALUE 'AWAITING_CONFIRMATION' BEFORE 'COMPLETED';
