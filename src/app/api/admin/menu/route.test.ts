import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { calls, queuedResults, mockSql, mockVerify, mockClearCache } = vi.hoisted(() => {
  const calls: { strings: readonly string[]; values: unknown[] }[] = [];
  const queuedResults: unknown[][] = [];
  function mockSql(strings: TemplateStringsArray, ...values: unknown[]) {
    calls.push({ strings, values });
    return Promise.resolve(queuedResults.shift() ?? []);
  }
  mockSql.end = vi.fn().mockResolvedValue(undefined);
  return { calls, queuedResults, mockSql, mockVerify: vi.fn(), mockClearCache: vi.fn() };
});

vi.mock('postgres', () => ({ default: vi.fn(() => mockSql) }));
vi.mock('@/lib/adminAuth', () => ({
  verifyToken: mockVerify,
  cookieName: () => 'cnd_admin',
}));
vi.mock('@/lib/menu-repo', () => ({ _clearMenuCache: mockClearCache }));

import { PATCH, POST } from './route';

function makeRequest(body: unknown, cookie = 'valid-token', method: 'PATCH' | 'POST' = 'PATCH') {
  return new NextRequest('http://localhost/api/admin/menu', {
    method,
    headers: {
      'Content-Type': 'application/json',
      cookie: cookie ? `cnd_admin=${cookie}` : '',
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  calls.length = 0;
  queuedResults.length = 0;
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

describe('POST /api/admin/menu', () => {
  it('401s without a valid admin cookie, never touching the database', async () => {
    mockVerify.mockResolvedValue(false);

    const res = await POST(makeRequest({ name: 'Suya', price: 3000, categoryId: 'cat-1' }, 'valid-token', 'POST'));

    expect(res.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['missing name', { price: 3000, categoryId: 'cat-1' }],
    ['blank name', { name: '   ', price: 3000, categoryId: 'cat-1' }],
    ['missing price', { name: 'Suya', categoryId: 'cat-1' }],
    ['negative price', { name: 'Suya', price: -1, categoryId: 'cat-1' }],
    ['missing categoryId', { name: 'Suya', price: 3000 }],
  ])('400s on %s', async (_label, body) => {
    mockVerify.mockResolvedValue(true);

    const res = await POST(makeRequest(body, 'valid-token', 'POST'));

    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('503s when DATABASE_URL is not configured', async () => {
    mockVerify.mockResolvedValue(true);
    delete process.env.DATABASE_URL;

    const res = await POST(makeRequest({ name: 'Suya', price: 3000, categoryId: 'cat-1' }, 'valid-token', 'POST'));

    expect(res.status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it('inserts a new available item, storing imageUrl as a plain string, and returns its id', async () => {
    mockVerify.mockResolvedValue(true);
    queuedResults.push([{ id: 'new-item-uuid' }]);

    const res = await POST(
      makeRequest(
        {
          name: '  Suya  ',
          price: 3000,
          categoryId: 'cat-1',
          description: 'Spicy grilled skewers',
          imageUrl: 'https://example.com/suya.jpg',
          allergens: ['peanuts'],
          dietaryTags: ['spicy'],
        },
        'valid-token',
        'POST'
      )
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, id: 'new-item-uuid' });
    expect(calls).toHaveLength(1);
    // `true` (is_available) is written directly in the SQL text, not
    // parameterized, so it isn't part of the captured `values` array.
    expect(calls[0].values).toEqual([
      'Suya', // trimmed
      'Spicy grilled skewers',
      3000,
      'cat-1',
      'https://example.com/suya.jpg',
      ['peanuts'],
      ['spicy'],
    ]);
    expect(calls[0].strings.join('')).toContain('true');
    expect(mockSql.end).toHaveBeenCalled();
    expect(mockClearCache).toHaveBeenCalled();
  });

  it('defaults optional fields (description, imageUrl, allergens, dietaryTags) sensibly when omitted', async () => {
    mockVerify.mockResolvedValue(true);
    queuedResults.push([{ id: 'new-item-uuid' }]);

    const res = await POST(makeRequest({ name: 'Suya', price: 3000, categoryId: 'cat-1' }, 'valid-token', 'POST'));

    expect(res.status).toBe(200);
    expect(calls[0].values).toEqual(['Suya', '', 3000, 'cat-1', null, null, null]);
  });

  it('500s and still closes the connection if the insert throws', async () => {
    mockVerify.mockResolvedValue(true);
    const { default: postgres } = await import('postgres');
    (postgres as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Object.assign(
        () => Promise.reject(new Error('connection reset')),
        { end: vi.fn().mockResolvedValue(undefined) }
      )
    );

    const res = await POST(makeRequest({ name: 'Suya', price: 3000, categoryId: 'cat-1' }, 'valid-token', 'POST'));

    expect(res.status).toBe(500);
  });
});
