'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';
import { useAuth } from './auth';
import type { AwaitingTicket } from './types';

/** Tickets staff have marked as done that the signed-in user is asked to confirm. */
export function useAwaitingConfirmation() {
  const { can } = useAuth();
  return useQuery({
    queryKey: ['awaiting-confirmation'],
    queryFn: () => apiFetch<AwaitingTicket[]>('/tickets/awaiting-confirmation'),
    enabled: can('complete', 'Ticket'),
    refetchInterval: 60_000,
  });
}
