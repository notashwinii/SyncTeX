import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_ENTRY_ROUTES, PUBLIC_ROUTES } from '@/lib/config';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const hasSession = request.cookies.has('st_session');
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const isAuthRoute = AUTH_ENTRY_ROUTES.has(pathname);

  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL('/workspaces', request.url));
  }

  if (!hasSession && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Configure which routes should trigger this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
