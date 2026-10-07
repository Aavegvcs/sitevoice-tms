'use client';

import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { PRIORITY_META, STATUS_META, TYPE_LABEL } from '@/lib/constants';
import type { Priority, TicketStatus, TicketType } from '@/lib/types';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ------------------------------------------------------------------ buttons
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-400',
};

export function Button({
  variant = 'primary',
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed sm:min-h-0',
        VARIANT[variant],
        className,
      )}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ layout bits
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-lg border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>button]:flex-1">{actions}</div>}
    </div>
  );
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const style = {
    error: 'bg-red-50 text-red-700 border-red-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  }[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={cx('rounded-md border px-3 py-2 text-sm', style)}>
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <div className="p-8 text-center text-sm text-slate-500">{label}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="p-10 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ badges
export function StatusBadge({ status }: { status: TicketStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', m.badge)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const m = PRIORITY_META[priority];
  return <span className={cx('inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', m.badge)}>{m.label}</span>;
}

export function TypeBadge({ type }: { type: TicketType }) {
  return <span className="inline-block whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{TYPE_LABEL[type]}</span>;
}

// ------------------------------------------------------------------ form controls
const control =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 sm:text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100';

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(control, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={cx(control, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(control, 'pr-8', props.className)} />;
}

// ------------------------------------------------------------------ modal
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const id = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/40 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby={id} className={cx('max-h-[90dvh] w-full overflow-y-auto rounded-t-xl bg-white shadow-xl sm:rounded-lg', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 id={id} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="-mr-1 rounded p-2 text-slate-500 hover:bg-slate-100">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ pagination
export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-center sm:text-left">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span className="whitespace-nowrap">
          Page {page} of {pages}
        </span>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
