import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Optimistic gate only: checks that a session cookie exists. The API verifies the JWT on every
// request, and pages redirect to /login themselves when the API answers 401.
export function proxy(request: NextRequest) {
  if (!request.cookies.has('access_token')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|logo.png).*)'],
};
