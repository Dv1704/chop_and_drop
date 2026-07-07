import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseReady: true,
}));

import { GET } from './route';

const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

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

function getReq(reference?: string) {
  const url = reference
    ? `https://chopanddrop.test/api/payments/verify?reference=${encodeURIComponent(reference)}`
    : 'https://chopanddrop.test/api/payments/verify';
  return { nextUrl: new URL(url) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_fake';
});

describe('GET /api/payments/verify', () => {
  it('returns 400 when reference is missing', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 503 when PAYSTACK_SECRET_KEY is unset', async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    const res = await GET(getReq('CD-ref-1'));
    expect(res.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ── IDEMPOTENCY / CACHE GUARD (critical test) ─────────────────────────────
  it('returns cached paid result WITHOUT calling Paystack when payment is already captured', async () => {
    mockSupabase.from.mockReturnValueOnce(makeChain({ data: { status: 'captured', order_id: 'order-1' } }));

    const res = await GET(getReq('CD-ref-1'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ paid: true, orderId: 'order-1', cached: true });
    // Must not re-verify with Paystack — this is the idempotency guard.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifies with Paystack, captures the payment, and confirms the order only when still pending', async () => {
    const existingChain = makeChain({ data: { status: 'pending', order_id: 'order-1' } });
    const updateChain = makeChain({ data: { order_id: 'order-1' } });
    const ordersChain = makeChain({ data: null });
    mockSupabase.from
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(ordersChain);

    fetchMock.mockResolvedValue({
      json: async () => ({
        status: true,
        data: {
          status: 'success',
          amount: 500000,
          currency: 'NGN',
          customer: { email: 'a@b.com' },
          reference: 'CD-ref-1',
          paid_at: '2026-07-07T00:00:00Z',
        },
      }),
    });

    const res = await GET(getReq('CD-ref-1'));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.paystack.co/transaction/verify/CD-ref-1',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer sk_test_fake' }) })
    );
    expect(await res.json()).toEqual({
      paid: true,
      orderId: 'order-1',
      status: 'success',
      amount: 5000,
      currency: 'NGN',
      email: 'a@b.com',
      reference: 'CD-ref-1',
      paidAt: '2026-07-07T00:00:00Z',
    });

    // Payment row moved to captured.
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'captured' }));
    // Order confirmed, but guarded to only transition from pending → confirmed.
    expect(ordersChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }));
    expect(ordersChain.eq).toHaveBeenCalledWith('id', 'order-1');
    expect(ordersChain.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('marks the payment failed and does NOT confirm the order on a non-success status', async () => {
    const existingChain = makeChain({ data: { status: 'pending', order_id: 'order-1' } });
    const updateChain = makeChain({ data: { order_id: 'order-1' } });
    mockSupabase.from.mockReturnValueOnce(existingChain).mockReturnValueOnce(updateChain);

    fetchMock.mockResolvedValue({
      json: async () => ({
        status: true,
        data: { status: 'failed', amount: 500000, currency: 'NGN', customer: { email: 'a@b.com' }, reference: 'CD-ref-1', paid_at: null },
      }),
    });

    const res = await GET(getReq('CD-ref-1'));
    const json = await res.json();

    expect(json.paid).toBe(false);
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    // No orders update happened → only the existing-check + payment-update `from` calls.
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
  });
});
