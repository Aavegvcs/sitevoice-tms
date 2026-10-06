'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { Alert, Button, Card, Field, Input, Modal, PriorityBadge, Select, Spinner, StatusBadge, Textarea, TypeBadge } from '@/components/ui';
import { ApiError, apiFetch, attachmentUrl, errorMessage } from '@/lib/api';
import { LOG_LABEL, PRIORITIES, PRIORITY_META, STATUSES, STATUS_META, TYPES, TYPE_LABEL } from '@/lib/constants';
import { fmtDateTime, fmtSize } from '@/lib/format';
import type { Attachment, Priority, TicketDetail, TicketLog, TicketStatus, TicketType } from '@/lib/types';

const NEEDS_REASON: TicketStatus[] = ['ON_HOLD'];

/** Runs a ticket action, then refreshes the ticket, lists and dashboard. */
function useTicketAction<TVars>(id: string, fn: (v: TVars) => Promise<unknown>, onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['awaiting-confirmation'] });
      onDone?.();
    },
  });
}

// ------------------------------------------------------------------ progress tracker
function Progress({ ticket }: { ticket: TicketDetail }) {
  const visited = new Set<TicketStatus>(['PENDING']);
  ticket.logs.forEach((l) => l.toStatus && visited.add(l.toStatus));
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Ticket progress">
      {STATUSES.map((s) => {
        const current = ticket.status === s;
        const done = !current && visited.has(s);
        return (
          <li
            key={s}
            aria-current={current ? 'step' : undefined}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
              current ? `${STATUS_META[s].badge} border-transparent ring-2 ring-offset-1 ring-slate-300` : done ? 'border-slate-300 bg-white text-slate-700' : 'border-slate-200 bg-slate-50 text-slate-400'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${current || done ? STATUS_META[s].dot : 'bg-slate-300'}`} />
            {STATUS_META[s].label}
            {done && <span className="sr-only"> (reached earlier)</span>}
          </li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------------ attachments
function Attachments({ ticketId, items }: { ticketId: string; items: Attachment[] }) {
  if (!items.length) return null;
  return (
    <Card className="p-5">
      <h2 className="mb-3 font-semibold text-slate-900">Attachments</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((a) => {
          const url = attachmentUrl(ticketId, a.id);
          return (
            <li key={a.id} className="overflow-hidden rounded-md border border-slate-200">
              {a.inline && (
                <a href={url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={a.originalName} className="h-36 w-full bg-slate-100 object-cover" />
                </a>
              )}
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{a.originalName}</p>
                  <p className="text-xs text-slate-500">
                    {fmtSize(a.size)} · {a.uploadedBy.name}
                    {a.internal && <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white">Internal</span>}
                  </p>
                </div>
                <a href={url} target={a.inline ? '_blank' : undefined} rel="noreferrer" download={a.inline ? undefined : a.originalName} className="shrink-0 text-xs font-medium text-blue-600 hover:underline">
                  {a.inline ? 'Open' : 'Download'}
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ------------------------------------------------------------------ timeline
function describe(l: TicketLog) {
  switch (l.action) {
    case 'STATUS_CHANGED':
      if (l.toStatus === 'AWAITING_CONFIRMATION') return 'Marked the work as done and asked the client to confirm';
      if (l.fromStatus === 'AWAITING_CONFIRMATION' && l.toStatus === 'COMPLETED') return 'Confirmed the ticket is completed';
      return `Status changed${l.fromStatus ? ` from ${STATUS_META[l.fromStatus].label}` : ''} to ${l.toStatus ? STATUS_META[l.toStatus].label : ''}`;
    case 'CREATED':
      return 'Raised the ticket';
    case 'ACKNOWLEDGED':
      return 'Acknowledged the ticket';
    case 'FOLLOW_UP':
      return 'Followed up';
    case 'COMMENT':
      return 'Added an internal comment';
    case 'ATTACHMENT_ADDED':
      return 'Added files';
    default:
      return LOG_LABEL[l.action];
  }
}

const DOT: Record<TicketLog['action'], string> = {
  CREATED: 'bg-blue-500',
  ACKNOWLEDGED: 'bg-teal-500',
  STATUS_CHANGED: 'bg-amber-500',
  FOLLOW_UP: 'bg-violet-500',
  COMMENT: 'bg-slate-600',
  DETAILS_UPDATED: 'bg-slate-400',
  ATTACHMENT_ADDED: 'bg-slate-400',
};

function Timeline({ logs }: { logs: TicketLog[] }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold text-slate-900">Activity log</h2>
      <ol className="space-y-5">
        {logs.map((l) => (
          <li key={l.id} className="relative pl-6">
            <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${DOT[l.action]}`} />
            <p className="text-sm text-slate-900">
              <span className="font-medium">{l.actor.name}</span>
              <span className="text-slate-500"> ({l.actor.role.name})</span> {describe(l).toLowerCase().replace(/^./, (c) => c)}
              {l.internal && <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white">Internal</span>}
            </p>
            {l.note && (
              <p className={`mt-1 whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${l.internal ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-slate-700'}`}>{l.note}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">{fmtDateTime(l.createdAt)}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// ------------------------------------------------------------------ actions
function ActionBox({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t border-slate-100 pt-4 first:border-0 first:pt-0">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}

function StatusChanger({ ticket }: { ticket: TicketDetail }) {
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [note, setNote] = useState('');
  const reason = status && (NEEDS_REASON.includes(status) || ticket.status === 'COMPLETED');
  const m = useTicketAction(
    ticket.id,
    () => apiFetch(`/tickets/${ticket.id}/status`, { method: 'POST', body: { status, note: note.trim() || undefined } }),
    () => {
      setStatus('');
      setNote('');
    },
  );
  return (
    <ActionBox title="Change status" hint="Only the client can close a ticket as Completed.">
      {m.error && <Alert>{errorMessage(m.error)}</Alert>}
      <Select aria-label="New status" value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)}>
        <option value="">Select new status</option>
        {STATUSES.filter((s) => s !== ticket.status && s !== 'COMPLETED').map((s) => (
          <option key={s} value={s}>
            {s === 'AWAITING_CONFIRMATION' ? 'Work done: ask client to confirm' : STATUS_META[s].label}
          </option>
        ))}
      </Select>
      {status === 'AWAITING_CONFIRMATION' && (
        <p className="text-xs text-slate-500">The ticket is completed only after the client who raised it confirms.</p>
      )}
      {status && (
        <Textarea
          rows={2}
          aria-label="Reason"
          placeholder={reason ? 'Reason (required, shown to the client)' : 'Note (optional, shown to the client)'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}
      <Button className="w-full" disabled={!status || (!!reason && note.trim().length < 3)} loading={m.isPending} onClick={() => m.mutate(undefined)}>
        Update status
      </Button>
    </ActionBox>
  );
}

/** Shown on a ticket that staff have marked as done: the client confirms, or says it is not resolved. */
function ConfirmationPanel({ ticket }: { ticket: TicketDetail }) {
  const [mode, setMode] = useState<'confirm' | 'reject' | null>(null);
  const [text, setText] = useState('');
  const request = ticket.logs.find((l) => l.action === 'STATUS_CHANGED' && l.toStatus === 'AWAITING_CONFIRMATION');
  const close = () => {
    setMode(null);
    setText('');
  };
  const m = useTicketAction(
    ticket.id,
    () =>
      mode === 'confirm'
        ? apiFetch(`/tickets/${ticket.id}/complete`, { method: 'POST', body: { note: text.trim() || undefined } })
        : apiFetch(`/tickets/${ticket.id}/reject-completion`, { method: 'POST', body: { reason: text.trim() } }),
    close,
  );

  if (!ticket.allowed.confirmCompletion) {
    return (
      <div className="mb-5 rounded-lg border border-violet-200 bg-violet-50 px-5 py-4 text-sm text-violet-900">
        <p className="font-semibold">Waiting for {ticket.raisedBy.name} to confirm completion</p>
        <p className="mt-0.5 text-violet-800">
          {request ? `${request.actor.name} marked the work as done on ${fmtDateTime(request.createdAt)}. ` : ''}
          The ticket closes once the client confirms, or returns to In Progress if they say it is not resolved.
        </p>
      </div>
    );
  }

  return (
    <section className="mb-5 rounded-lg border border-violet-200 bg-violet-50 p-5" aria-labelledby="confirm-title">
      <h2 id="confirm-title" className="font-semibold text-violet-900">
        Please confirm this ticket is completed
      </h2>
      <p className="mt-0.5 text-sm text-violet-800">
        {request ? `${request.actor.name} marked the work as done on ${fmtDateTime(request.createdAt)}.` : 'The team has marked the work as done.'}{' '}
        It will be closed only after you confirm.
      </p>
      {request?.note && <p className="mt-3 whitespace-pre-wrap rounded-md bg-white px-3 py-2 text-sm text-slate-700">{request.note}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => setMode('confirm')}>Confirm completion</Button>
        <Button variant="secondary" onClick={() => setMode('reject')}>
          Not resolved
        </Button>
      </div>
      {mode && (
        <Modal title={mode === 'confirm' ? 'Confirm the ticket is completed?' : 'Work not resolved?'} onClose={close}>
          <div className="space-y-4">
            {m.error && <Alert>{errorMessage(m.error)}</Alert>}
            <p className="text-sm text-slate-600">
              {mode === 'confirm'
                ? 'The ticket will be closed as Completed. This is recorded in the log.'
                : 'The ticket goes back to In Progress and the team sees your reason.'}
            </p>
            <Field label={mode === 'confirm' ? 'Comment (optional)' : 'What is still not resolved? (required)'} htmlFor="confirm-text">
              <Textarea id="confirm-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button
                variant={mode === 'confirm' ? 'primary' : 'danger'}
                disabled={mode === 'reject' && text.trim().length < 3}
                loading={m.isPending}
                onClick={() => m.mutate(undefined)}
              >
                {mode === 'confirm' ? 'Yes, it is completed' : 'Send back to the team'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

function CompleteBox({ ticket }: { ticket: TicketDetail }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const m = useTicketAction(
    ticket.id,
    () => apiFetch(`/tickets/${ticket.id}/complete`, { method: 'POST', body: { note: note.trim() || undefined } }),
    () => setOpen(false),
  );
  return (
    <ActionBox title="Close this ticket" hint="Mark it as completed once you are satisfied with the work.">
      <Button className="w-full" onClick={() => setOpen(true)}>
        Mark as completed
      </Button>
      {open && (
        <Modal title="Mark ticket as completed?" onClose={() => setOpen(false)}>
          <div className="space-y-4">
            {m.error && <Alert>{errorMessage(m.error)}</Alert>}
            <p className="text-sm text-slate-600">Only confirm if you are satisfied with the work done. The ticket will be closed and this is recorded in the log.</p>
            <Field label="Comment (optional)" htmlFor="complete-note">
              <Textarea id="complete-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button loading={m.isPending} onClick={() => m.mutate(undefined)}>
                Yes, mark completed
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ActionBox>
  );
}

function MessageBox({ ticket, kind }: { ticket: TicketDetail; kind: 'followUp' | 'comment' }) {
  const [text, setText] = useState('');
  const isFollow = kind === 'followUp';
  const m = useTicketAction(
    ticket.id,
    () =>
      apiFetch(`/tickets/${ticket.id}/${isFollow ? 'follow-up' : 'comments'}`, {
        method: 'POST',
        body: isFollow ? { message: text.trim() } : { body: text.trim() },
      }),
    () => setText(''),
  );
  return (
    <ActionBox
      title={isFollow ? 'Follow up' : 'Internal comment'}
      hint={isFollow ? 'Ask for an update. Everyone on this ticket can see it.' : 'Only the internal team can see this. It is never shown to the client.'}
    >
      {m.error && <Alert>{errorMessage(m.error)}</Alert>}
      <Textarea rows={3} aria-label={isFollow ? 'Follow-up message' : 'Internal comment'} value={text} onChange={(e) => setText(e.target.value)} />
      <Button className="w-full" variant={isFollow ? 'primary' : 'secondary'} disabled={!text.trim()} loading={m.isPending} onClick={() => m.mutate(undefined)}>
        {isFollow ? 'Send follow-up' : 'Add comment'}
      </Button>
    </ActionBox>
  );
}

function UploadBox({ ticket }: { ticket: TicketDetail }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const internal = ticket.allowed.comment;
  const m = useTicketAction(
    ticket.id,
    () => {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      return apiFetch(`/tickets/${ticket.id}/attachments`, { method: 'POST', body: form });
    },
    () => {
      setFiles([]);
      if (input.current) input.current.value = '';
    },
  );
  const tooBig = files.some((f) => f.size > 10 * 1024 * 1024) || files.length > 10;
  return (
    <ActionBox
      title="Add photos or files"
      hint={internal ? 'Internal: only the internal team can see these.' : 'Visible to everyone on this ticket.'}
    >
      {m.error && <Alert>{errorMessage(m.error)}</Alert>}
      <input ref={input} type="file" multiple aria-label="Choose files" className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      {tooBig && <p className="text-xs text-red-600">Up to 10 files, 10 MB each.</p>}
      <Button className="w-full" variant="secondary" disabled={!files.length || tooBig} loading={m.isPending} onClick={() => m.mutate(undefined)}>
        Upload {files.length ? `(${files.length})` : ''}
      </Button>
    </ActionBox>
  );
}

function EditModal({ ticket, onClose }: { ticket: TicketDetail; onClose: () => void }) {
  const [form, setForm] = useState({ title: ticket.title, description: ticket.description, type: ticket.type, priority: ticket.priority });
  const m = useTicketAction(ticket.id, () => apiFetch(`/tickets/${ticket.id}`, { method: 'PATCH', body: form }), onClose);
  return (
    <Modal title="Edit ticket details" onClose={onClose} wide>
      <div className="space-y-4">
        {m.error && <Alert>{errorMessage(m.error)}</Alert>}
        <Field label="Title" htmlFor="e-title">
          <Input id="e-title" value={form.title} maxLength={150} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Description" htmlFor="e-desc">
          <Textarea id="e-desc" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="e-type">
            <Select id="e-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TicketType })}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority" htmlFor="e-priority">
            <Select id="e-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={m.isPending} onClick={() => m.mutate(undefined)}>
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ page
export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [editing, setEditing] = useState(false);
  const { data: t, error, isPending } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiFetch<TicketDetail>(`/tickets/${id}`),
    retry: (count, e) => !(e instanceof ApiError && e.status === 404) && count < 2,
  });
  const ack = useTicketAction(id, () => apiFetch(`/tickets/${id}/acknowledge`, { method: 'POST' }));

  if (isPending) return <Spinner />;
  if (error || !t) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-medium text-slate-800">{error instanceof ApiError && error.status === 404 ? 'Ticket not found' : errorMessage(error)}</p>
        <p className="mt-1 text-sm text-slate-500">It may not exist, or you may not have access to it.</p>
        <Link href="/tickets" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
          Back to tickets
        </Link>
      </div>
    );
  }

  const a = t.allowed;
  const hasActions = a.acknowledge || a.changeStatus || (a.complete && !a.confirmCompletion) || a.followUp || a.comment || a.attach || a.update;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/tickets" className="text-sm font-medium text-blue-600 hover:underline">
        ← Back to tickets
      </Link>

      <div className="mt-3 mb-5">
        <p className="font-mono text-xs text-slate-500">{t.refNo}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{t.title}</h1>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={t.status} />
          <PriorityBadge priority={t.priority} />
          <TypeBadge type={t.type} />
        </div>
        <div className="mt-4">
          <Progress ticket={t} />
        </div>
      </div>

      {t.status === 'AWAITING_CONFIRMATION' && <ConfirmationPanel ticket={t} />}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <h2 className="mb-2 font-semibold text-slate-900">Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{t.description}</p>
          </Card>
          <Attachments ticketId={t.id} items={t.attachments} />
          <Timeline logs={t.logs} />
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Site</dt>
                <dd className="text-slate-900">{t.site.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Raised by</dt>
                <dd className="text-slate-900">{t.raisedBy.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Raised on</dt>
                <dd className="text-slate-900">{fmtDateTime(t.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Acknowledged</dt>
                <dd className="text-slate-900">{t.acknowledgedAt && t.acknowledgedBy ? `${t.acknowledgedBy.name} · ${fmtDateTime(t.acknowledgedAt)}` : 'Not yet'}</dd>
              </div>
              {t.completedAt && (
                <div>
                  <dt className="text-xs text-slate-500">Completed on</dt>
                  <dd className="text-slate-900">{fmtDateTime(t.completedAt)}</dd>
                </div>
              )}
            </dl>
          </Card>

          {hasActions && (
            <Card className="space-y-4 p-5">
              <h2 className="font-semibold text-slate-900">Actions</h2>
              {a.acknowledge && (
                <ActionBox title="Acknowledge" hint="Let the client know the ticket has been seen.">
                  {ack.error && <Alert>{errorMessage(ack.error)}</Alert>}
                  <Button className="w-full" loading={ack.isPending} onClick={() => ack.mutate(undefined)}>
                    Acknowledge ticket
                  </Button>
                </ActionBox>
              )}
              {a.complete && !a.confirmCompletion && <CompleteBox ticket={t} />}
              {a.followUp && <MessageBox ticket={t} kind="followUp" />}
              {a.changeStatus && <StatusChanger ticket={t} />}
              {a.comment && <MessageBox ticket={t} kind="comment" />}
              {a.attach && <UploadBox ticket={t} />}
              {a.update && (
                <ActionBox title="Ticket details">
                  <Button className="w-full" variant="secondary" onClick={() => setEditing(true)}>
                    Edit details or priority
                  </Button>
                </ActionBox>
              )}
            </Card>
          )}
        </div>
      </div>
      {editing && <EditModal ticket={t} onClose={() => setEditing(false)} />}
    </div>
  );
}
