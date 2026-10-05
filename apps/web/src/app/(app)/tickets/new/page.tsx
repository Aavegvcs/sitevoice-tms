'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Spinner, Textarea } from '@/components/ui';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PRIORITIES, PRIORITY_META, TYPES, TYPE_LABEL } from '@/lib/constants';
import { fmtSize } from '@/lib/format';
import type { Site } from '@/lib/types';

const MAX_FILES = 10;
const MAX_BYTES = 10 * 1024 * 1024;

const schema = z.object({
  siteId: z.string().min(1, 'Select a site'),
  type: z.enum(TYPES as [string, ...string[]], { message: 'Select a type' }),
  priority: z.enum(PRIORITIES as [string, ...string[]], { message: 'Select a priority' }),
  title: z.string().trim().min(3, 'Enter at least 3 characters').max(150, 'Keep the title under 150 characters'),
  description: z.string().trim().min(5, 'Describe the issue (at least 5 characters)').max(5000, 'Keep the description under 5000 characters'),
});
type FormValues = z.infer<typeof schema>;

export default function NewTicketPage() {
  const { can } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const allowed = can('create', 'Ticket');

  useEffect(() => {
    if (!allowed) router.replace('/tickets');
  }, [allowed, router]);

  const sites = useQuery({ queryKey: ['sites'], queryFn: () => apiFetch<Site[]>('/sites'), enabled: allowed });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { priority: 'MEDIUM' } });

  // A client with a single site does not need to pick it.
  useEffect(() => {
    if (sites.data?.length === 1) setValue('siteId', sites.data[0].id);
  }, [sites.data, setValue]);

  const create = useMutation({
    mutationFn: (values: FormValues) => {
      const form = new FormData();
      Object.entries(values).forEach(([k, v]) => form.append(k, v));
      files.forEach((f) => form.append('files', f));
      return apiFetch<{ id: string; refNo: string }>('/tickets', { method: 'POST', body: form });
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      router.push(`/tickets/${t.id}`);
    },
  });

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (f.size > MAX_BYTES) {
        setFileError(`"${f.name}" is larger than 10 MB`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        setFileError(`You can attach up to ${MAX_FILES} files`);
        break;
      }
      setFileError(null);
      next.push(f);
    }
    setFiles(next);
    if (fileInput.current) fileInput.current.value = '';
  }

  if (!allowed) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Raise a ticket" subtitle="Tell us what needs attention. You can follow its progress at any time." />
      <Card className="p-5 sm:p-6">
        <form onSubmit={handleSubmit((v) => create.mutate(v))} noValidate className="space-y-5">
          {create.error && <Alert>{errorMessage(create.error)}</Alert>}

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Site *" htmlFor="siteId" error={errors.siteId?.message}>
              <Select id="siteId" defaultValue="" {...register('siteId')}>
                <option value="">Select site</option>
                {sites.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type *" htmlFor="type" error={errors.type?.message}>
              <Select id="type" defaultValue="" {...register('type')}>
                <option value="">Select type</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priority *" htmlFor="priority" error={errors.priority?.message}>
              <Select id="priority" {...register('priority')}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Title *" htmlFor="title" error={errors.title?.message}>
            <Input id="title" maxLength={150} placeholder="A short summary of the issue" {...register('title')} />
          </Field>

          <Field label="Description *" htmlFor="description" error={errors.description?.message} hint="Include the location, who was involved, and what happened.">
            <Textarea id="description" rows={6} maxLength={5000} {...register('description')} />
          </Field>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Attachments (optional)</p>
            <input ref={fileInput} id="files" type="file" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
            <label
              htmlFor="files"
              className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600 hover:bg-slate-100"
            >
              <span className="font-medium text-blue-600">Click to add photos or files</span>
              <span className="text-xs text-slate-500">Any file type, up to 10 MB each, max {MAX_FILES} files</span>
            </label>
            {fileError && <p className="text-xs text-red-600">{fileError}</p>}
            {files.length > 0 && (
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      {f.name} <span className="text-xs text-slate-400">({fmtSize(f.size)})</span>
                    </span>
                    <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-xs font-medium text-red-600 hover:underline">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => router.push('/tickets')}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Submit ticket
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
