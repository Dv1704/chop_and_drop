import { NextRequest, NextResponse } from 'next/server';
import { generateToken, cookieName } from '@/lib/adminAuth';

export const runtime = 'edge';

const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

// POST /api/admin/auth  { pin }
// Checks PIN server-side (ADMIN_PIN env var — never exposed to browser).
// On success, sets an httpOnly signed cookie.
export async function POST(req: NextRequest) {
  const { pin } = await req.json().catch(() => ({ pin: '' }));

  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
  }

  if (!pin || pin !== adminPin) {
    // Artificial delay — blunts brute-force attempts
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 });
  }

  const token = await generateToken(adminPin);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName(), token, {
    httpOnly: true,
    sameSite: 'strict',
    path:     '/',
    maxAge:   COOKIE_MAX_AGE,
    secure:   process.env.NODE_ENV === 'production',
  });
  return res;
}

// DELETE /api/admin/auth — logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName(), '', {
    httpOnly: true,
    sameSite: 'strict',
    path:     '/',
    maxAge:   0,
  });
  return res;
}
