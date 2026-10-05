'use client';

import { createMongoAbility, type MongoAbility } from '@casl/ability';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { ApiError, apiFetch } from './api';
import type { Me } from './types';

interface AuthValue {
  user: Me['user'];
  ability: MongoAbility;
  /** Coarse, role-level check used to show or hide screens and buttons. The server decides per row. */
  can: (action: string, subject: string) => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside <AuthGate>');
  return v;
}

export function Can({ I, a, children }: { I: string; a: string; children: ReactNode }) {
  const { can } = useAuth();
  return can(I, a) ? <>{children}</> : null;
}

/** Loads the signed-in user and their permissions; sends visitors without a session to /login. */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, error, isPending } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<Me>('/auth/me'),
    retry: false,
  });

  const unauthenticated = error instanceof ApiError && error.status === 401;
  useEffect(() => {
    if (unauthenticated) router.replace('/login');
  }, [unauthenticated, router]);

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    qc.clear();
    router.replace('/login');
  }, [qc, router]);

  const value = useMemo<AuthValue | null>(() => {
    if (!data) return null;
    const ability = createMongoAbility(data.rules);
    return { user: data.user, ability, can: (action, subject) => ability.can(action, subject), logout };
  }, [data, logout]);

  if (isPending || unauthenticated) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  }
  if (!value) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-slate-600">
        Could not load your account. Please refresh the page.
      </div>
    );
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
