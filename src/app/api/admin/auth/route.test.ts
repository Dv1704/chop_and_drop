import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, DELETE } from './route';

const PIN = '2468';

function postReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/auth', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/auth', () => {
  const OLD = process.env.ADMIN_PIN;
  beforeEach(() => { process.env.ADMIN_PIN = PIN; });
  afterEach(() => { process.env.ADMIN_PIN = OLD; });

  it('correct pin → 200, { ok: true }, and sets a cookie', async () => {
    const res = await POST(postReq({ pin: PIN }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('set-cookie')).toContain('cnd_admin=');
  });

  it('wrong pin → 401', async () => {
    const res = await POST(postReq({ pin: 'nope' }));
    expect(res.status).toBe(401);
  });

  it('ADMIN_PIN unset → 503', async () => {
    delete process.env.ADMIN_PIN;
    const res = await POST(postReq({ pin: PIN }));
    expect(res.status).toBe(503);
  });
});

describe('DELETE /api/admin/auth', () => {
  it('clears the cookie (Max-Age=0) and returns { ok: true }', async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('set-cookie')).toMatch(/Max-Age=0/i);
  });
});
