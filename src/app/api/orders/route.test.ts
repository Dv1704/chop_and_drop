import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Hoisted mocks — vi.mock factories are hoisted above top-level consts, so the
// mock objects must be defined via vi.hoisted (same pattern as menu-repo.test.ts).
const { mockSupabase, mockEmailReceived, mockEmailAdmin } = vi.hoisted(() => ({
  mockSupabase: { from: vi.fn() },
  mockEmailReceived: vi.fn(),
  mockEmailAdmin: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase, supabaseReady: true }));
vi.mock('@/lib/email', () => ({
  emailOrderReceived: mockEmailReceived,
  emailNewOrderAdmin: mockEmailAdmin,
}));

import { POST, GET } from './route';

// Chainable query builder: upsert/insert/select/eq/filter/limit/order return the
// builder; awaiting it resolves to `awaitResult`; .single() resolves to `singleResult`.
interface QueryBuilder {
  upsert: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  filter: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: (res: (v: unknown) => void, rej?: (e: unknown) => void) => Promise<void>;
}

function makeBuilder(singleResult: unknown = { data: null, error: null }, awaitResult: unknown = { data: null, error: null }): QueryBuilder {
  const b: QueryBuilder = {
    upsert: vi.fn(() => b),
    insert: vi.fn(() => b),
    select: vi.fn(() => b),
    eq: vi.fn(() => b),
    filter: vi.fn(() => b),
    limit: vi.fn(() => b),
    order: vi.fn(() => b),
    single: vi.fn(() => Promise.resolve(singleResult)),
    then: (res, rej) => Promise.resolve(awaitResult).then(res, rej),
  };
  return b;
}

function postReq(body: unknown) {
  return new NextRequest('http://localhost/api/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function getReq(query = '') {
  return new NextRequest(`http://localhost/api/orders${query}`);
}

const validBody = {
  customer: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '08012345678' },
  items: [{ name: 'Jollof Rice', qty: 2, unitPrice: 4500 }],
  subtotal: 9000,
  deliveryFee: 500,
  total: 9500,
  fulfillmentMode: 'delivery',
  notes: 'No pepper',
};

// Wire up from() to return a distinct builder per table.
function wireTables(builders: Record<string, ReturnType<typeof makeBuilder>>) {
  mockSupabase.from.mockImplementation((table: string) => {
    if (!builders[table]) throw new Error(`Unexpected table: ${table}`);
    return builders[table];
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEmailReceived.mockResolvedValue(undefined);
  mockEmailAdmin.mockResolvedValue(undefined);
});

describe('POST /api/orders', () => {
  it('returns 503 and touches nothing when Supabase is not configured', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase', () => ({ supabase: mockSupabase, supabaseReady: false }));
    vi.doMock('@/lib/email', () => ({ emailOrderReceived: mockEmailReceived, emailNewOrderAdmin: mockEmailAdmin }));
    const { POST: POSTfresh } = await import('./route');

    const res = await POSTfresh(postReq(validBody));

    expect(res.status).toBe(503);
    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockEmailReceived).not.toHaveBeenCalled();
  });

  it('returns 400 when customer.email is missing', async () => {
    const res = await POST(postReq({ ...validBody, customer: { name: 'Ada' } }));
    expect(res.status).toBe(400);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns 400 when customer.name is missing', async () => {
    const res = await POST(postReq({ ...validBody, customer: { email: 'ada@example.com' } }));
    expect(res.status).toBe(400);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns 400 when items is missing/empty', async () => {
    const res = await POST(postReq({ ...validBody, items: [] }));
    expect(res.status).toBe(400);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid email format', async () => {
    const res = await POST(postReq({ ...validBody, customer: { name: 'Ada', email: 'not-an-email' } }));
    expect(res.status).toBe(400);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('creates the order, inserts items, emails, and returns { orderId, total }', async () => {
    const customers = makeBuilder({ data: { id: 'cust-1' }, error: null });
    const orders = makeBuilder({ data: { id: 'order-1', total: 9500 }, error: null });
    const orderItems = makeBuilder(undefined, { error: null });
    wireTables({ customers, orders, order_items: orderItems });

    const res = await POST(postReq(validBody));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ orderId: 'order-1', total: 9500 });

    // customer upsert used onConflict: 'email'
    expect(customers.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ada@example.com', name: 'Ada Lovelace' }),
      { onConflict: 'email' },
    );
    expect(orders.insert).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: 'cust-1', status: 'pending', total: 9500 }),
    );
    expect(orderItems.insert).toHaveBeenCalled();
    expect(mockEmailReceived).toHaveBeenCalled();
    expect(mockEmailAdmin).toHaveBeenCalled();
  });

  it('floors and clamps item quantities (0.7 -> 1, 2.9 -> 2)', async () => {
    const customers = makeBuilder({ data: { id: 'cust-1' }, error: null });
    const orders = makeBuilder({ data: { id: 'order-1', total: 100 }, error: null });
    const orderItems = makeBuilder(undefined, { error: null });
    wireTables({ customers, orders, order_items: orderItems });

    await POST(postReq({
      ...validBody,
      items: [
        { name: 'Small', qty: 0.7, unitPrice: 100 },
        { name: 'Big', qty: 2.9, unitPrice: 200 },
      ],
    }));

    const inserted = orderItems.insert.mock.calls[0][0] as Array<{ item_name: string; qty: number }>;
    expect(inserted.find(i => i.item_name === 'Small')?.qty).toBe(1);
    expect(inserted.find(i => i.item_name === 'Big')?.qty).toBe(2);
  });

  it('returns 500 and skips order/items inserts when the customer upsert errors', async () => {
    const customers = makeBuilder({ data: null, error: { message: 'upsert failed' } });
    const orders = makeBuilder({ data: { id: 'order-1', total: 1 }, error: null });
    const orderItems = makeBuilder(undefined, { error: null });
    wireTables({ customers, orders, order_items: orderItems });

    const res = await POST(postReq(validBody));

    expect(res.status).toBe(500);
    expect(orders.insert).not.toHaveBeenCalled();
    expect(orderItems.insert).not.toHaveBeenCalled();
  });

  it('returns 500 and skips the items insert when the order insert errors', async () => {
    const customers = makeBuilder({ data: { id: 'cust-1' }, error: null });
    const orders = makeBuilder({ data: null, error: { message: 'order failed' } });
    const orderItems = makeBuilder(undefined, { error: null });
    wireTables({ customers, orders, order_items: orderItems });

    const res = await POST(postReq(validBody));

    expect(res.status).toBe(500);
    expect(orderItems.insert).not.toHaveBeenCalled();
  });

  it('returns 500 when the order_items insert errors', async () => {
    const customers = makeBuilder({ data: { id: 'cust-1' }, error: null });
    const orders = makeBuilder({ data: { id: 'order-1', total: 1 }, error: null });
    const orderItems = makeBuilder(undefined, { error: { message: 'items failed' } });
    wireTables({ customers, orders, order_items: orderItems });

    const res = await POST(postReq(validBody));

    expect(res.status).toBe(500);
  });

  it('still returns 200 when the email functions reject (fire-and-forget)', async () => {
    const customers = makeBuilder({ data: { id: 'cust-1' }, error: null });
    const orders = makeBuilder({ data: { id: 'order-1', total: 9500 }, error: null });
    const orderItems = makeBuilder(undefined, { error: null });
    wireTables({ customers, orders, order_items: orderItems });
    mockEmailReceived.mockRejectedValue(new Error('smtp down'));
    mockEmailAdmin.mockRejectedValue(new Error('smtp down'));

    const res = await POST(postReq(validBody));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ orderId: 'order-1', total: 9500 });
  });
});

describe('GET /api/orders', () => {
  const uuid = '12345678-1234-1234-1234-1234567890ab';

  it('returns 503 when Supabase is not configured', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase', () => ({ supabase: mockSupabase, supabaseReady: false }));
    vi.doMock('@/lib/email', () => ({ emailOrderReceived: mockEmailReceived, emailNewOrderAdmin: mockEmailAdmin }));
    const { GET: GETfresh } = await import('./route');

    const res = await GETfresh(getReq(`?id=${uuid}`));
    expect(res.status).toBe(503);
  });

  it('returns 400 when id is missing', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(400);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns 400 when id is neither a UUID nor an 8-char hex ref', async () => {
    const res = await GET(getReq('?id=not-valid'));
    expect(res.status).toBe(400);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns 200 with the order for a valid full UUID (exact match)', async () => {
    const orders = makeBuilder({ data: { id: uuid, order_items: [] }, error: null });
    wireTables({ orders });

    const res = await GET(getReq(`?id=${uuid}`));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: uuid, order_items: [] });
    expect(orders.eq).toHaveBeenCalledWith('id', uuid);
    expect(orders.filter).not.toHaveBeenCalled();
  });

  it('uses a prefix ilike filter (not exact eq) for an 8-char short ref', async () => {
    const orders = makeBuilder({ data: { id: uuid, order_items: [] }, error: null });
    wireTables({ orders });

    const res = await GET(getReq('?id=12345678'));

    expect(res.status).toBe(200);
    expect(orders.filter).toHaveBeenCalledWith('id::text', 'ilike', '12345678%');
    expect(orders.eq).not.toHaveBeenCalled();
  });

  it('returns 404 when the order is not found', async () => {
    const orders = makeBuilder({ data: null, error: null });
    wireTables({ orders });

    const res = await GET(getReq(`?id=${uuid}`));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Order not found.' });
  });
});
