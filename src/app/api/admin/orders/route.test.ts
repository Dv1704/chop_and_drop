import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Hoisted mocks — vi.mock factories are hoisted above top-level consts, so the
// mock objects must be defined via vi.hoisted (same pattern as menu-repo.test.ts).
const { mockSupabase, mockEmail, mockVerify } = vi.hoisted(() => ({
  mockSupabase: { from: vi.fn() },
  mockEmail: vi.fn(),
  mockVerify: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase, supabaseReady: true }));
vi.mock('@/lib/email', () => ({ emailStatusUpdate: mockEmail }));
vi.mock('@/lib/adminAuth', () => ({
  verifyToken: mockVerify,
  cookieName: () => 'cnd_admin',
}));

import { PATCH, GET } from './route';

// Chainable query builder: select/update/order/limit/eq return the builder;
// awaiting it resolves to `awaitResult`; .single() resolves to `singleResult`.
interface QueryBuilder {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: (res: (v: unknown) => void, rej?: (e: unknown) => void) => Promise<void>;
}

function makeBuilder(awaitResult: unknown = { data: [], error: null }, singleResult: unknown = { data: null }): QueryBuilder {
  const b: QueryBuilder = {
    select: vi.fn(() => b),
    update: vi.fn(() => b),
    order: vi.fn(() => b),
    limit: vi.fn(() => b),
    eq: vi.fn(() => b),
    single: vi.fn(() => Promise.resolve(singleResult)),
    then: (res, rej) => Promise.resolve(awaitResult).then(res, rej),
  };
  return b;
}

function patchReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/orders', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

function getReq(query = '') {
  return new NextRequest(`http://localhost/api/admin/orders${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/admin/orders', () => {
  it('rejects an unauthenticated request with 401 and never queries Supabase', async () => {
    mockVerify.mockResolvedValue(false);
    const res = await PATCH(patchReq({ orderId: 'o1', status: 'confirmed' }));
    expect(res.status).toBe(401);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('rejects an invalid status with 400', async () => {
    mockVerify.mockResolvedValue(true);
    const res = await PATCH(patchReq({ orderId: 'o1', status: 'bogus' }));
    expect(res.status).toBe(400);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('updates the order and emails the customer when they have an email', async () => {
    mockVerify.mockResolvedValue(true);
    const builder = makeBuilder({ error: null }, { data: { customers: { name: 'Ada', email: 'ada@example.com' } } });
    mockSupabase.from.mockReturnValue(builder);

    const res = await PATCH(patchReq({ orderId: 'o1', status: 'preparing' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'preparing' }));
    expect(builder.single).toHaveBeenCalled();
    expect(mockEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ada@example.com', orderId: 'o1', status: 'preparing' }),
    );
  });

  it('does not email when the customer has no email', async () => {
    mockVerify.mockResolvedValue(true);
    const builder = makeBuilder({ error: null }, { data: { customers: { name: 'Ada', email: null } } });
    mockSupabase.from.mockReturnValue(builder);

    const res = await PATCH(patchReq({ orderId: 'o1', status: 'delivered' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockEmail).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/orders', () => {
  it('rejects an unauthenticated request with 401', async () => {
    mockVerify.mockResolvedValue(false);
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('queries without a status filter when no status param is given', async () => {
    mockVerify.mockResolvedValue(true);
    const builder = makeBuilder({ data: [], error: null });
    mockSupabase.from.mockReturnValue(builder);

    const res = await GET(getReq());

    expect(res.status).toBe(200);
    expect(builder.order).toHaveBeenCalled();
    expect(builder.eq).not.toHaveBeenCalled();
  });

  it('applies a status filter for ?status=pending', async () => {
    mockVerify.mockResolvedValue(true);
    const builder = makeBuilder({ data: [], error: null });
    mockSupabase.from.mockReturnValue(builder);

    const res = await GET(getReq('?status=pending'));

    expect(res.status).toBe(200);
    expect(builder.eq).toHaveBeenCalledWith('status', 'pending');
  });
});
