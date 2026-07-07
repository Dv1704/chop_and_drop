import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock factory is hoisted above the imports below, so the mock object it
// references must be created even earlier via vi.hoisted().
const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseReady: true,
}));

import { POST } from './route';

// Mock global fetch so a real Paystack HTTP call can never escape.
const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

// A chainable Supabase query-builder mock: every builder method returns the
// same object, terminal `.single()`/`.maybeSingle()` resolve to `result`, and
// the object is thenable so directly-awaited chains resolve to `result` too.
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (v: unknown) => unknown) => resolve(result),
  };
  return chain;
}

function postReq(body: unknown) {
  return { json: async () => body } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_fake';
  process.env.NEXT_PUBLIC_APP_URL = 'https://chopanddrop.test';
});

describe('POST /api/payments/initialize', () => {
  it.each([
    ['orderId', { email: 'a@b.com', amountKobo: 500000 }],
    ['email', { orderId: 'order-1234-uuid', amountKobo: 500000 }],
    ['amountKobo', { orderId: 'order-1234-uuid', email: 'a@b.com' }],
  ])('returns 400 when %s is missing', async (_field, body) => {
    const res = await POST(postReq(body));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 503 when PAYSTACK_SECRET_KEY is unset', async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    const res = await POST(postReq({ orderId: 'order-1234-uuid', email: 'a@b.com', amountKobo: 500000 }));
    expect(res.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ── DOUBLE-CHARGE GUARD (most important test in this file) ────────────────
  it('returns 409 and NEVER calls Paystack when the order already has a captured payment', async () => {
    const guardChain = makeChain({ data: { status: 'captured' } });
    mockSupabase.from.mockReturnValueOnce(guardChain);

    const res = await POST(postReq({ orderId: 'order-1234-uuid', email: 'a@b.com', amountKobo: 500000 }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'This order has already been paid.' });
    // The guard must short-circuit BEFORE the Paystack initialize call.
    expect(fetchMock).not.toHaveBeenCalled();
    // And it must have actually queried for a captured payment on this order.
    expect(guardChain.eq).toHaveBeenCalledWith('order_id', 'order-1234-uuid');
    expect(guardChain.eq).toHaveBeenCalledWith('status', 'captured');
  });

  it('initializes with Paystack and inserts a pending payment row on success', async () => {
    const guardChain = makeChain({ data: null });
    const insertChain = makeChain({ error: null });
    mockSupabase.from.mockReturnValueOnce(guardChain).mockReturnValueOnce(insertChain);

    fetchMock.mockResolvedValue({
      json: async () => ({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/xyz',
          reference: 'CD-order-12-1720000000000',
          access_code: 'ac_abc123',
        },
      }),
    });

    const res = await POST(postReq({ orderId: 'order-1234-uuid', email: 'a@b.com', amountKobo: 500000 }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      authorizationUrl: 'https://checkout.paystack.com/xyz',
      reference: 'CD-order-12-1720000000000',
      accessCode: 'ac_abc123',
    });

    // Called the real Paystack initialize endpoint with bearer auth.
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.paystack.co/transaction/initialize',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer sk_test_fake' }),
      })
    );

    // Inserted a pending payment row (amount converted kobo → naira).
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 'order-1234-uuid',
        provider: 'paystack',
        status: 'pending',
        paystack_reference: expect.stringContaining('CD-'),
        amount: 5000,
      })
    );
  });

  it('returns 500 when Paystack responds with a falsy status', async () => {
    const guardChain = makeChain({ data: null });
    mockSupabase.from.mockReturnValueOnce(guardChain);
    fetchMock.mockResolvedValue({ json: async () => ({ status: false, message: 'boom' }) });

    const res = await POST(postReq({ orderId: 'order-1234-uuid', email: 'a@b.com', amountKobo: 500000 }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'boom' });
  });
});
