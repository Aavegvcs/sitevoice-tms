'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Field, Input, Modal, PageHeader, Select, Spinner, Textarea } from '@/components/ui';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SCOPE_LABEL } from '@/lib/constants';
import type { CatalogEntry, PermissionRow, PermissionScope, Role } from '@/lib/types';

const key = (subject: string, action: string) => `${subject}:${action}`;

function CreateRole({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '' });
  const create = useMutation({
    mutationFn: () => apiFetch<Role>('/roles', { method: 'POST', body: { name: form.name, description: form.description || undefined } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      onCreated(r.id);
      onClose();
    },
  });
  return (
    <Modal title="Create a role" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        {create.error && <Alert>{errorMessage(create.error)}</Alert>}
        <Field label="Role name *" htmlFor="r-name">
          <Input id="r-name" value={form.name} required minLength={2} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Description" htmlFor="r-desc">
          <Textarea id="r-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <p className="text-xs text-slate-500">The new role starts with no permissions. Choose them on the next screen.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Create role
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PermissionEditor({ role, catalog, onDeleted }: { role: Role; catalog: CatalogEntry[]; onDeleted: () => void }) {
  const qc = useQueryClient();
  const locked = role.isSystem && role.name === 'Admin';
  const initial = useMemo(() => new Map(role.permissions.map((p) => [key(p.subject, p.action), p.scope])), [role]);
  // `draft` holds unsaved edits; null means "show what is stored".
  const [draft, setDraft] = useState<Map<string, PermissionScope> | null>(null);
  const [saved, setSaved] = useState(false);
  const picked = draft ?? initial;

  const dirty = useMemo(() => {
    if (!draft || draft.size !== initial.size) return !!draft && draft.size !== initial.size;
    for (const [k, v] of draft) if (initial.get(k) !== v) return true;
    return false;
  }, [draft, initial]);

  const save = useMutation({
    mutationFn: () => {
      const permissions: PermissionRow[] = [...picked].map(([k, scope]) => {
        const [subject, action] = k.split(':');
        return { subject, action, scope };
      });
      return apiFetch(`/roles/${role.id}/permissions`, { method: 'PUT', body: { permissions } });
    },
    onSuccess: async () => {
      // Wait for the refreshed role before dropping the draft, so the form never flashes old values.
      await qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      setDraft(null);
      setSaved(true);
    },
  });
  const remove = useMutation({
    mutationFn: () => apiFetch(`/roles/${role.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      onDeleted();
    },
  });

  const edit = (change: (m: Map<string, PermissionScope>) => void) => {
    const next = new Map(picked);
    change(next);
    setDraft(next);
    setSaved(false);
  };
  const toggle = (subject: string, action: string, scoped: boolean) =>
    edit((m) => {
      const k = key(subject, action);
      if (m.has(k)) m.delete(k);
      else m.set(k, scoped ? 'SITES' : 'ALL');
    });
  const setScope = (subject: string, action: string, scope: PermissionScope) => edit((m) => void m.set(key(subject, action), scope));

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {role.name} {role.isSystem && <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 align-middle text-xs font-medium text-slate-600">System role</span>}
          </h2>
          <p className="text-sm text-slate-500">{role.description ?? 'No description'}</p>
          <p className="mt-1 text-xs text-slate-400">
            {role._count.users} user{role._count.users === 1 ? '' : 's'} with this role
          </p>
        </div>
        {!role.isSystem && (
          <Button
            variant="danger"
            loading={remove.isPending}
            disabled={role._count.users > 0}
            title={role._count.users > 0 ? 'Reassign its users first' : undefined}
            onClick={() => window.confirm(`Delete the role "${role.name}"?`) && remove.mutate()}
          >
            Delete role
          </Button>
        )}
      </div>

      {locked && <Alert kind="info">The Admin role always has full access and cannot be changed, so the system can never be locked out of administration.</Alert>}
      {save.error && <Alert>{errorMessage(save.error)}</Alert>}
      {remove.error && <Alert>{errorMessage(remove.error)}</Alert>}
      {saved && !dirty && <Alert kind="success">Permissions saved. They apply to users of this role immediately.</Alert>}

      {!locked && (
        <div className="mt-4 space-y-5">
          {catalog.map((group) => (
            <div key={group.subject}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.subject === 'Ticket' ? 'Tickets' : group.subject === 'Dashboard' ? 'Dashboard' : `${group.subject}s`}</h3>
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {group.actions.map((a) => {
                  const k = key(group.subject, a.action);
                  const on = picked.has(k);
                  return (
                    <li key={k} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                      <label className="flex min-w-0 flex-1 items-center gap-3 text-sm text-slate-800">
                        <input type="checkbox" checked={on} onChange={() => toggle(group.subject, a.action, group.scoped)} />
                        <span>{a.label}</span>
                      </label>
                      {group.scoped && on && a.action !== 'create' && (
                        <Select aria-label={`Scope for ${a.label}`} className="!w-auto text-xs" value={picked.get(k)} onChange={(e) => setScope(group.subject, a.action, e.target.value as PermissionScope)}>
                          {(Object.keys(SCOPE_LABEL) as PermissionScope[]).map((s) => (
                            <option key={s} value={s}>
                              {SCOPE_LABEL[s]}
                            </option>
                          ))}
                        </Select>
                      )}
                      {group.scoped && on && a.action === 'create' && (
                        <Select aria-label="Sites a ticket can be raised for" className="!w-auto text-xs" value={picked.get(k)} onChange={(e) => setScope(group.subject, a.action, e.target.value as PermissionScope)}>
                          <option value="SITES">For their own sites</option>
                          <option value="ALL">For any site</option>
                        </Select>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            {dirty && <span className="text-sm text-amber-700">Unsaved changes</span>}
            <Button variant="secondary" disabled={!dirty} onClick={() => setDraft(null)}>
              Discard
            </Button>
            <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
              Save permissions
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function RolesPage() {
  const { can } = useAuth();
  const router = useRouter();
  const allowed = can('read', 'Role');
  const canManage = can('manage', 'Role');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (!allowed) router.replace('/dashboard');
  }, [allowed, router]);

  const roles = useQuery({ queryKey: ['roles'], queryFn: () => apiFetch<Role[]>('/roles'), enabled: allowed });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: () => apiFetch<CatalogEntry[]>('/roles/catalog'), enabled: allowed });
  if (!allowed) return <Spinner />;

  const selected = roles.data?.find((r) => r.id === selectedId) ?? roles.data?.[0];

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        subtitle="Choose what each role can do. For example, grant Supervisors the right to change ticket status."
        actions={canManage && <Button onClick={() => setCreating(true)}>Create role</Button>}
      />
      {(roles.isPending || catalog.isPending) && <Spinner />}
      {roles.error && <Alert>{errorMessage(roles.error)}</Alert>}
      {roles.data && catalog.data && selected && (
        <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
          <Card className="h-fit p-2">
            <ul className="space-y-1">
              {roles.data.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelectedId(r.id)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium ${r.id === selected.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {r.name}
                    <span className="text-xs font-normal text-slate-400">{r._count.users}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          {canManage ? (
            <PermissionEditor key={selected.id} role={selected} catalog={catalog.data} onDeleted={() => setSelectedId(null)} />
          ) : (
            <Card className="p-5 text-sm text-slate-600">You can view roles but not change them.</Card>
          )}
        </div>
      )}
      {creating && <CreateRole onClose={() => setCreating(false)} onCreated={setSelectedId} />}
    </>
  );
}
