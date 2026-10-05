'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Button, Card, EmptyState, PageHeader, Pagination, PriorityBadge, Select, Spinner, StatusBadge, TypeBadge, Input } from '@/components/ui';
import { apiFetch, errorMessage } from '@/lib/api';
import { Can, useAuth } from '@/lib/auth';
import { PRIORITIES, PRIORITY_META, STATUSES, STATUS_META, TYPES, TYPE_LABEL } from '@/lib/constants';
import { fmtDate } from '@/lib/format';
import type { Site, TicketList } from '@/lib/types';

const PAGE_SIZE = 15;

function TicketsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [siteId, setSiteId] = useState(params.get('siteId') ?? '');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  // Debounce the search box so we do not query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const sites = useQuery({ queryKey: ['sites'], queryFn: () => apiFetch<Site[]>('/sites') });

  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (status) query.set('status', status);
  if (type) query.set('type', type);
  if (priority) query.set('priority', priority);
  if (siteId) query.set('siteId', siteId);
  if (q) query.set('q', q);

  const { data, error, isPending, isFetching } = useQuery({
    queryKey: ['tickets', query.toString()],
    queryFn: () => apiFetch<TicketList>(`/tickets?${query}`),
    placeholderData: keepPreviousData,
  });

  const reset = (setter: (v: string) => void) => (e: { target: { value: string } }) => {
    setter(e.target.value);
    setPage(1);
  };
  const filtered = status || type || priority || siteId || q;

  return (
    <>
      <PageHeader
        title={user.role === 'Client' ? 'My tickets' : 'Tickets'}
        subtitle={user.role === 'Client' ? 'Every ticket you have raised and where it stands.' : 'Tickets for the sites you have access to.'}
        actions={
          <Can I="create" a="Ticket">
            <Button onClick={() => router.push('/tickets/new')}>Raise a ticket</Button>
          </Can>
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder="Search reference or title" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" className="lg:col-span-2" />
          <Select value={status} onChange={reset(setStatus)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </Select>
          <Select value={priority} onChange={reset(setPriority)} aria-label="Filter by priority">
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </Select>
          <Select value={type} onChange={reset(setType)} aria-label="Filter by type">
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
          {(sites.data?.length ?? 0) > 1 && (
            <Select value={siteId} onChange={reset(setSiteId)} aria-label="Filter by site" className="lg:col-span-2">
              <option value="">All sites</option>
              {sites.data!.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        {isPending && <Spinner />}
        {error && <p className="p-4 text-sm text-red-600">{errorMessage(error)}</p>}
        {data && data.items.length === 0 && (
          <EmptyState
            title={filtered ? 'No tickets match these filters' : 'No tickets yet'}
            hint={filtered ? 'Try clearing a filter.' : undefined}
          />
        )}
        {data && data.items.length > 0 && (
          <div className={`overflow-x-auto ${isFetching ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Reference</th>
                  <th className="px-3 py-2.5 font-medium">Title</th>
                  <th className="px-3 py-2.5 font-medium">Site</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Raised by</th>
                  <th className="px-3 py-2.5 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.refNo}</td>
                    <td className="max-w-xs px-3 py-3">
                      <Link href={`/tickets/${t.id}`} className="font-medium text-blue-700 hover:underline">
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{t.site.name}</td>
                    <td className="px-3 py-3">
                      <TypeBadge type={t.type} />
                    </td>
                    <td className="px-3 py-3">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-3 py-3 text-slate-600">{t.raisedBy.name}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">{fmtDate(t.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />}
      </Card>
    </>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <TicketsInner />
    </Suspense>
  );
}
