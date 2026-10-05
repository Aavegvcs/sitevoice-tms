'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, EmptyState, PageHeader, PriorityBadge, Spinner, StatusBadge } from '@/components/ui';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PRIORITIES, PRIORITY_META, STATUSES, STATUS_META, TYPES, TYPE_LABEL } from '@/lib/constants';
import { fmtDateTime } from '@/lib/format';
import type { DashboardSummary } from '@/lib/types';

function Bars({ rows }: { rows: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
          <span className="truncate text-slate-600">{r.label}</span>
          <span className="h-2.5 rounded-full bg-slate-100">
            <span className={`block h-2.5 rounded-full ${r.color}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-medium text-slate-900">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const { can, user } = useAuth();
  const router = useRouter();
  const allowed = can('read', 'Dashboard');

  useEffect(() => {
    if (!allowed) router.replace('/tickets');
  }, [allowed, router]);

  const { data, error, isPending } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardSummary>('/dashboard'),
    enabled: allowed,
  });

  if (!allowed) return <Spinner />;
  const isClient = user.role === 'Client';

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={isClient ? 'The status of all the tickets you have raised.' : 'Ticket overview for your sites.'}
      />
      {isPending && <Spinner />}
      {error && <p className="text-sm text-red-600">{errorMessage(error)}</p>}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Card className="p-4">
              <p className="text-sm text-slate-500">Total tickets</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{data.total}</p>
            </Card>
            {STATUSES.map((s) => (
              <Link key={s} href={`/tickets?status=${s}`}>
                <Card className="p-4 transition-shadow hover:shadow-md">
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                    {STATUS_META[s].label}
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-slate-900">{data.byStatus[s]}</p>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 font-semibold text-slate-900">Tickets by type</h2>
              <Bars rows={TYPES.map((t) => ({ label: TYPE_LABEL[t], value: data.byType[t], color: 'bg-blue-500' }))} />
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 font-semibold text-slate-900">Tickets by priority</h2>
              <Bars rows={PRIORITIES.map((p) => ({ label: PRIORITY_META[p].label, value: data.byPriority[p], color: PRIORITY_META[p].bar }))} />
            </Card>
          </div>

          <Card>
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-slate-900">Site-wise tickets</h2>
            </div>
            {data.bySite.length === 0 ? (
              <EmptyState title="No tickets yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Site</th>
                      <th className="px-3 py-2.5 text-right font-medium">Total</th>
                      {STATUSES.map((s) => (
                        <th key={s} className="px-3 py-2.5 text-right font-medium">
                          {STATUS_META[s].label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.bySite.map((r) => (
                      <tr key={r.site.id}>
                        <td className="px-5 py-2.5">
                          <Link href={`/tickets?siteId=${r.site.id}`} className="font-medium text-blue-700 hover:underline">
                            {r.site.name}
                          </Link>
                          <span className="ml-2 text-xs text-slate-400">{r.site.code}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold">{r.total}</td>
                        {STATUSES.map((s) => (
                          <td key={s} className="px-3 py-2.5 text-right text-slate-600">
                            {r.byStatus[s]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-slate-900">Recent activity</h2>
              <Link href="/tickets" className="text-sm font-medium text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {data.recent.map((t) => (
                <li key={t.id}>
                  <Link href={`/tickets/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-slate-50">
                    <span className="w-28 font-mono text-xs text-slate-500">{t.refNo}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{t.title}</span>
                    <span className="text-xs text-slate-500">{t.site.name}</span>
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                    <span className="w-36 text-right text-xs text-slate-400">{fmtDateTime(t.updatedAt)}</span>
                  </Link>
                </li>
              ))}
              {data.recent.length === 0 && <EmptyState title="No tickets yet" />}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
