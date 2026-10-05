'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Button, Field, Input } from '@/components/ui';
import { ApiError, apiFetch } from '@/lib/api';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await apiFetch('/auth/login', { method: 'POST', body: values });
      qc.clear(); // never show a previous user's cached data
      router.replace('/');
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? 'Invalid email or password'
          : 'Could not sign in. Please try again.',
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-sm space-y-5 rounded-xl border border-slate-200 bg-white p-7 shadow-sm"
      >
        <div>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">S</div>
          <h1 className="text-xl font-semibold text-slate-900">SiteVoice</h1>
          <p className="text-sm text-slate-500">Sign in to raise and track tickets.</p>
        </div>

        {error && <Alert>{error}</Alert>}

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="username" {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
        </Field>

        <Button type="submit" loading={isSubmitting} className="w-full">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </main>
  );
}
