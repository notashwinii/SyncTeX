import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup'];

// Define auth routes that should redirect to /editor if already authenticated
const authRoutes = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get the token from cookies
  const token = request.cookies.get('token')?.value;
  const hasToken = !!token;

  // Check if the route is public
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Check if it's an auth route (login/signup)
  const isAuthRoute = authRoutes.includes(pathname);

  // If user is authenticated and trying to access auth routes (login/signup)
  // Redirect them to the editor
  if (hasToken && isAuthRoute) {
    return NextResponse.redirect(new URL('/workspaces', request.url));
  }

  // If user is not authenticated and trying to access protected route
  // Redirect them to login
  if (!hasToken && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    // Add the original URL as a redirect parameter
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow the request to proceed
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
