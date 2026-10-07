'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner } from '@/components/ui';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AdminUser, Role, Site } from '@/lib/types';

function UserForm({ user, roles, sites, onClose }: { user?: AdminUser; roles: Role[]; sites: Site[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const self = user?.id === me.id;
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    roleId: user?.role.id ?? roles.find((r) => r.name === 'Client')?.id ?? roles[0]?.id ?? '',
    siteIds: user?.sites.map((s) => s.id) ?? [],
    isActive: user?.isActive ?? true,
  });
  const save = useMutation({
    mutationFn: () => {
      if (!user) {
        return apiFetch('/users', { method: 'POST', body: { name: form.name, email: form.email, password: form.password, roleId: form.roleId, siteIds: form.siteIds } });
      }
      return apiFetch(`/users/${user.id}`, {
        method: 'PATCH',
        body: {
          name: form.name,
          siteIds: form.siteIds,
          ...(self ? {} : { roleId: form.roleId, isActive: form.isActive }),
          ...(form.password ? { password: form.password } : {}),
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['roles'] });
      onClose();
    },
  });
  const toggleSite = (id: string) =>
    setForm((f) => ({ ...f, siteIds: f.siteIds.includes(id) ? f.siteIds.filter((s) => s !== id) : [...f.siteIds, id] }));

  return (
    <Modal title={user ? `Edit ${user.name}` : 'Add a user'} onClose={onClose} wide>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {save.error && <Alert>{errorMessage(save.error)}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *" htmlFor="u-name">
            <Input id="u-name" value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email *" htmlFor="u-email">
            <Input id="u-email" type="email" value={form.email} required disabled={!!user} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={user ? 'Reset password' : 'Password *'} htmlFor="u-pass" hint={user ? 'Leave blank to keep the current password. Resetting signs the user out.' : 'At least 8 characters'}>
            <Input id="u-pass" type="password" autoComplete="new-password" minLength={8} required={!user} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Role *" htmlFor="u-role" hint={self ? 'You cannot change your own role.' : undefined}>
            <Select id="u-role" value={form.roleId} disabled={self} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">Sites</legend>
          <p className="mb-2 text-xs text-slate-500">Users only see tickets of the sites they are allotted. Admins see every site.</p>
          <div className="grid max-h-44 gap-1 overflow-y-auto rounded-md border border-slate-200 p-2 sm:grid-cols-2">
            {sites.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={form.siteIds.includes(s.id)} onChange={() => toggleSite(s.id)} />
                {s.name} <span className="text-xs text-slate-400">{s.code}</span>
              </label>
            ))}
            {sites.length === 0 && <p className="p-2 text-sm text-slate-500">No sites yet.</p>}
          </div>
        </fieldset>

        {user && !self && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active (deactivated users are signed out immediately)
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {user ? 'Save changes' : 'Add user'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const { can } = useAuth();
  const router = useRouter();
  const allowed = can('read', 'User');
  const canManage = can('manage', 'User');
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  useEffect(() => {
    if (!allowed) router.replace('/dashboard');
  }, [allowed, router]);

  const users = useQuery({ queryKey: ['users'], queryFn: () => apiFetch<AdminUser[]>('/users'), enabled: allowed });
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => apiFetch<Role[]>('/roles'), enabled: allowed && can('read', 'Role') });
  const sites = useQuery({ queryKey: ['sites'], queryFn: () => apiFetch<Site[]>('/sites'), enabled: allowed });
  if (!allowed) return <Spinner />;

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="People who can sign in, their role and the sites they can access."
        actions={canManage && roles.data && <Button onClick={() => setEditing('new')}>Add user</Button>}
      />
      <Card>
        {users.isPending && <Spinner />}
        {users.error && <p className="p-4 text-sm text-red-600">{errorMessage(users.error)}</p>}
        {users.data && users.data.length === 0 && <EmptyState title="No users" />}
        {users.data && users.data.length > 0 && (
          <>
            <ul className="divide-y divide-slate-100 lg:hidden">
              {users.data.map((u) => (
                <li key={u.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{u.name}</p>
                    <p className="break-all text-xs text-slate-500">{u.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{u.role.name}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">Sites: </span>
                      {u.role.name === 'Admin' ? 'All sites' : u.sites.length ? u.sites.map((s) => s.name).join(', ') : '—'}
                    </p>
                  </div>
                  {canManage && (
                    <Button variant="secondary" onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`}>
                      Edit
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">Role</th>
                  <th className="px-3 py-2.5 font-medium">Sites</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.data.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{u.role.name}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{u.role.name === 'Admin' ? 'All sites' : u.sites.length ? u.sites.map((s) => s.name).join(', ') : '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {canManage && (
                        <button onClick={() => setEditing(u)} className="text-sm font-medium text-blue-600 hover:underline">
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>
      {editing && roles.data && sites.data && (
        <UserForm user={editing === 'new' ? undefined : editing} roles={roles.data} sites={sites.data.filter((s) => s.isActive || (editing !== 'new' && editing.sites.some((x) => x.id === s.id)))} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
