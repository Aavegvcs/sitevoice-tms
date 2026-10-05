export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Browser-side fetch. Sends the httpOnly auth cookies, transparently refreshes the session once
 * on a 401, and accepts either a JSON body (object) or FormData (file uploads).
 */
export async function apiFetch<T>(path: string, init: Omit<RequestInit, 'body'> & { body?: unknown } = {}): Promise<T> {
  const { body, headers, ...rest } = init;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: { ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });

  let res = await doFetch();
  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (refreshed.ok) res = await doFetch();
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new ApiError(res.status, message ?? res.statusText);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export function attachmentUrl(ticketId: string, attachmentId: string) {
  return `${API_URL}/tickets/${ticketId}/attachments/${attachmentId}/file`;
}

export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.') {
  return e instanceof ApiError ? e.message : fallback;
}
