'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Spinner } from '@/components/ui';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Site } from '@/lib/types';

function SiteForm({ site, onClose }: { site?: Site; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    code: site?.code ?? '',
    name: site?.name ?? '',
    location: site?.location ?? '',
    isActive: site?.isActive ?? true,
  });
  const save = useMutation({
    mutationFn: () =>
      apiFetch(site ? `/sites/${site.id}` : '/sites', {
        method: site ? 'PATCH' : 'POST',
        body: site ? form : { code: form.code, name: form.name, location: form.location || undefined },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      onClose();
    },
  });
  return (
    <Modal title={site ? 'Edit site' : 'Add a site'} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {save.error && <Alert>{errorMessage(save.error)}</Alert>}
        <Field label="Code *" htmlFor="s-code" hint="Short unique code, for example SITE-A">
          <Input id="s-code" value={form.code} required onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </Field>
        <Field label="Name *" htmlFor="s-name">
          <Input id="s-name" value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Location" htmlFor="s-loc">
          <Input id="s-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </Field>
        {site && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active (inactive sites cannot receive new tickets)
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {site ? 'Save' : 'Add site'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function SitesPage() {
  const { can } = useAuth();
  const router = useRouter();
  const allowed = can('manage', 'Site');
  const [editing, setEditing] = useState<Site | 'new' | null>(null);
  useEffect(() => {
    if (!allowed) router.replace('/dashboard');
  }, [allowed, router]);

  const { data, error, isPending } = useQuery({ queryKey: ['sites'], queryFn: () => apiFetch<Site[]>('/sites'), enabled: allowed });
  if (!allowed) return <Spinner />;

  return (
    <>
      <PageHeader title="Sites" subtitle="Construction sites that tickets are raised against." actions={<Button onClick={() => setEditing('new')}>Add site</Button>} />
      <Card>
        {isPending && <Spinner />}
        {error && <p className="p-4 text-sm text-red-600">{errorMessage(error)}</p>}
        {data && data.length === 0 && <EmptyState title="No sites yet" hint="Add your first site." />}
        {data && data.length > 0 && (
          <>
            <ul className="divide-y divide-slate-100 lg:hidden">
              {data.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{s.name}</p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      <span className="font-mono text-xs text-slate-500">{s.code}</span>
                      {s.location && <span> · {s.location}</span>}
                    </p>
                    <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <Button variant="secondary" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Code</th>
                  <th className="px-3 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">Location</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-3 py-3 text-slate-600">{s.location ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => setEditing(s)} className="text-sm font-medium text-blue-600 hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>
      {editing && <SiteForm site={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
