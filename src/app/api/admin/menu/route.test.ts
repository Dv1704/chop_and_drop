import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { calls, mockSql, mockVerify, mockClearCache } = vi.hoisted(() => {
  const calls: { strings: readonly string[]; values: unknown[] }[] = [];
  function mockSql(strings: TemplateStringsArray, ...values: unknown[]) {
    calls.push({ strings, values });
    return Promise.resolve([]);
  }
  mockSql.end = vi.fn().mockResolvedValue(undefined);
  return { calls, mockSql, mockVerify: vi.fn(), mockClearCache: vi.fn() };
});

vi.mock('postgres', () => ({ default: vi.fn(() => mockSql) }));
vi.mock('@/lib/adminAuth', () => ({
  verifyToken: mockVerify,
  cookieName: () => 'cnd_admin',
}));
vi.mock('@/lib/menu-repo', () => ({ _clearMenuCache: mockClearCache }));

import { PATCH } from './route';

function makeRequest(body: unknown, cookie = 'valid-token') {
  return new NextRequest('http://localhost/api/admin/menu', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookie ? `cnd_admin=${cookie}` : '',
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  calls.length = 0;
  vi.clearAllMocks();
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
});

describe('PATCH /api/admin/menu', () => {
  it('401s without a valid admin cookie, never touching the database', async () => {
    mockVerify.mockResolvedValue(false);

    const res = await PATCH(makeRequest({ itemId: 'item-1', isAvailable: false }));

    expect(res.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('400s on a missing itemId', async () => {
    mockVerify.mockResolvedValue(true);

    const res = await PATCH(makeRequest({ isAvailable: false }));

    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('400s when isAvailable is not a boolean', async () => {
    mockVerify.mockResolvedValue(true);

    const res = await PATCH(makeRequest({ itemId: 'item-1', isAvailable: 'false' }));

    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('503s when DATABASE_URL is not configured', async () => {
    mockVerify.mockResolvedValue(true);
    delete process.env.DATABASE_URL;

    const res = await PATCH(makeRequest({ itemId: 'item-1', isAvailable: false }));

    expect(res.status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it('updates is_available for the given item, clears the menu cache, and returns ok', async () => {
    mockVerify.mockResolvedValue(true);

    const res = await PATCH(makeRequest({ itemId: 'item-1', isAvailable: false }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].values).toEqual([false, 'item-1']);
    expect(mockSql.end).toHaveBeenCalled();
    expect(mockClearCache).toHaveBeenCalled();
  });

  it('500s and still closes the connection if the update throws', async () => {
    mockVerify.mockResolvedValue(true);
    const { default: postgres } = await import('postgres');
    (postgres as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Object.assign(
        () => Promise.reject(new Error('connection reset')),
        { end: vi.fn().mockResolvedValue(undefined) }
      )
    );

    const res = await PATCH(makeRequest({ itemId: 'item-1', isAvailable: false }));

    expect(res.status).toBe(500);
  });
});
