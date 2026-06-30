import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, cookieName } from '@/lib/adminAuth';

export const config = {
  matcher: ['/admin/:path*'],
};

export async function middleware(req: NextRequest) {
  // Let the login page through — it's how admins authenticate
  if (req.nextUrl.pathname === '/admin/login') return NextResponse.next();

  const token = req.cookies.get(cookieName())?.value ?? '';
  const valid  = await verifyToken(token);

  if (!valid) {
    const login = new URL('/admin/login', req.url);
    login.searchParams.set('from', req.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}
