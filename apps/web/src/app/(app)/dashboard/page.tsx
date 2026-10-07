'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DonutChart } from '@/components/donut-chart';
import { Card, EmptyState, PageHeader, PriorityBadge, Spinner, StatusBadge } from '@/components/ui';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAwaitingConfirmation } from '@/lib/awaiting';
import { PRIORITIES, PRIORITY_META, STATUSES, STATUS_META, TYPES, TYPE_LABEL } from '@/lib/constants';
import { fmtDateTime } from '@/lib/format';
import type { DashboardSummary, Priority } from '@/lib/types';

// Fixed categorical order (validated for colour-blind separation); keyed to TYPES order.
const TYPE_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7'];
const PRIORITY_COLORS: Record<Priority, string> = { LOW: '#16a34a', MEDIUM: '#3b82f6', HIGH: '#f97316', CRITICAL: '#b91c1c' };

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

  const awaiting = useAwaitingConfirmation().data ?? [];

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
          {awaiting.length > 0 && (
            <section className="rounded-lg border border-violet-200 bg-violet-50 p-5" aria-labelledby="awaiting-title">
              <h2 id="awaiting-title" className="font-semibold text-violet-900">
                {awaiting.length === 1 ? '1 ticket needs' : `${awaiting.length} tickets need`} your confirmation
              </h2>
              <p className="mt-0.5 text-sm text-violet-800">
                The team has marked this work as done. Open the ticket to confirm it is completed, or tell them it is not resolved.
              </p>
              <ul className="mt-3 divide-y divide-violet-100 overflow-hidden rounded-md border border-violet-200 bg-white">
                {awaiting.map((t) => (
                  <li key={t.id}>
                    <Link href={`/tickets/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-violet-50/60">
                      <span className="order-1 font-mono text-xs text-slate-500 sm:order-none sm:w-28">{t.refNo}</span>
                      <span className="order-3 w-full min-w-0 font-medium text-slate-900 sm:order-none sm:w-auto sm:flex-1 sm:truncate">{t.title}</span>
                      <span className="order-4 text-xs text-slate-500 sm:order-none">
                        {t.requestedBy ? `Marked done by ${t.requestedBy}` : 'Marked done'} · {fmtDateTime(t.requestedAt)}
                      </span>
                      <span className="order-2 ml-auto text-sm font-medium text-violet-700 sm:order-none sm:ml-0">Review →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

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
              <DonutChart
                label="Tickets by type"
                slices={TYPES.map((t, i) => ({ key: t, label: TYPE_LABEL[t], value: data.byType[t], color: TYPE_COLORS[i] }))}
              />
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 font-semibold text-slate-900">Tickets by priority</h2>
              <DonutChart
                label="Tickets by priority"
                slices={PRIORITIES.map((p) => ({ key: p, label: PRIORITY_META[p].label, value: data.byPriority[p], color: PRIORITY_COLORS[p] }))}
              />
            </Card>
          </div>

          <Card>
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-slate-900">Site-wise tickets</h2>
            </div>
            {data.bySite.length === 0 ? (
              <EmptyState title="No tickets yet" />
            ) : (
              <>
                <ul className="divide-y divide-slate-100 lg:hidden">
                  {data.bySite.map((r) => (
                    <li key={r.site.id} className="px-4 py-3.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <Link href={`/tickets?siteId=${r.site.id}`} className="min-w-0 font-medium text-blue-700 hover:underline">
                          {r.site.name}
                          <span className="ml-2 text-xs font-normal text-slate-400">{r.site.code}</span>
                        </Link>
                        <span className="shrink-0 text-sm text-slate-500">
                          <span className="font-semibold text-slate-900">{r.total}</span> total
                        </span>
                      </div>
                      <dl className="mt-3 flex flex-wrap gap-1.5">
                        {STATUSES.map((s) => (
                          <div key={s} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_META[s].dot}`} />
                            <dt className="text-slate-500">{STATUS_META[s].label}</dt>
                            <dd className="font-semibold text-slate-900">{r.byStatus[s]}</dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto lg:block">
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
              </>
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
                    <span className="order-1 font-mono text-xs text-slate-500 sm:order-none sm:w-28">{t.refNo}</span>
                    <span className="order-3 w-full min-w-0 font-medium text-slate-900 sm:order-none sm:w-auto sm:flex-1 sm:truncate">{t.title}</span>
                    <span className="order-4 text-xs text-slate-500 sm:order-none">{t.site.name}</span>
                    <span className="order-5 sm:order-none">
                      <PriorityBadge priority={t.priority} />
                    </span>
                    <span className="order-2 ml-auto sm:order-none sm:ml-0">
                      <StatusBadge status={t.status} />
                    </span>
                    <span className="order-6 ml-auto text-xs text-slate-400 sm:order-none sm:ml-0 sm:w-36 sm:text-right">{fmtDateTime(t.updatedAt)}</span>
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
