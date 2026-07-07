import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
const wa = vi.hoisted(() => ({ notifyCustomer: vi.fn(), notifyRestaurant: vi.fn() }));
const em = vi.hoisted(() => ({ emailPaymentConfirmed: vi.fn(), emailPaymentAdminAlert: vi.fn() }));

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase, supabaseReady: true }));
vi.mock('@/lib/whatsapp', () => wa);
vi.mock('@/lib/email', () => em);

import { POST } from './route';

const SECRET = 'sk_test_fake_webhook';

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

// Builds a request whose signature is a valid HMAC-SHA512 of the body unless an
// explicit (forged) signature is supplied.
function webhookReq(eventObj: unknown, forgedSignature?: string) {
  const body = JSON.stringify(eventObj);
  const sig = forgedSignature ?? crypto.createHmac('sha512', SECRET).update(body).digest('hex');
  return {
    text: async () => body,
    headers: { get: (k: string) => (k === 'x-paystack-signature' ? sig : null) },
  } as never;
}

function chargeSuccessEvent(customer: { name?: string; phone?: string; email?: string }) {
  return {
    event: 'charge.success',
    data: { reference: 'CD-ref-1', amount: 500000, customer: { email: customer.email ?? 'ada@x.com' } },
  };
}

function orderRow(customer: { name?: string; phone?: string; email?: string }) {
  return {
    data: {
      id: 'order-1',
      total: 5000,
      fulfillment_mode: 'delivery',
      customers: { name: customer.name ?? 'Ada', phone: customer.phone ?? '+2348012345678', email: customer.email ?? 'ada@x.com' },
      order_items: [{ item_name: 'Jollof', qty: 2, unit_price: 2500 }],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PAYSTACK_SECRET_KEY = SECRET;
});

describe('POST /api/payments/webhook', () => {
  // ── SIGNATURE FORGERY GUARD (most important security test in the suite) ────
  it('returns 401 and does NOTHING when the signature is invalid', async () => {
    const res = await POST(webhookReq(chargeSuccessEvent({}), 'deadbeef-not-a-real-signature'));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid signature' });
    // No DB access, no notifications — a forged webhook must be fully inert.
    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(wa.notifyCustomer).not.toHaveBeenCalled();
    expect(wa.notifyRestaurant).not.toHaveBeenCalled();
    expect(em.emailPaymentConfirmed).not.toHaveBeenCalled();
    expect(em.emailPaymentAdminAlert).not.toHaveBeenCalled();
  });

  // ── IDEMPOTENCY GUARD (critical — Paystack retries webhooks) ───────────────
  it('skips all processing on a duplicate charge.success for an already-captured payment', async () => {
    mockSupabase.from.mockReturnValueOnce(makeChain({ data: { status: 'captured', order_id: 'order-1' } }));

    const res = await POST(webhookReq(chargeSuccessEvent({})));

    expect(await res.json()).toEqual({ received: true });
    // Only the existence check ran; no update, no re-notification.
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    expect(wa.notifyCustomer).not.toHaveBeenCalled();
    expect(wa.notifyRestaurant).not.toHaveBeenCalled();
    expect(em.emailPaymentConfirmed).not.toHaveBeenCalled();
    expect(em.emailPaymentAdminAlert).not.toHaveBeenCalled();
  });

  it('captures the payment, confirms the order, and fires all notifications on a fresh charge.success', async () => {
    const existingChain = makeChain({ data: { status: 'pending', order_id: 'order-1' } });
    const updatePmt = makeChain({ data: { order_id: 'order-1' } });
    const ordersUpdate = makeChain({ data: null });
    const orderFetch = makeChain(orderRow({}));
    mockSupabase.from
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(updatePmt)
      .mockReturnValueOnce(ordersUpdate)
      .mockReturnValueOnce(orderFetch);

    const res = await POST(webhookReq(chargeSuccessEvent({})));

    expect(await res.json()).toEqual({ received: true });
    expect(updatePmt.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'captured' }));
    expect(ordersUpdate.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }));
    expect(ordersUpdate.eq).toHaveBeenCalledWith('id', 'order-1');
    expect(ordersUpdate.eq).toHaveBeenCalledWith('status', 'pending');

    expect(wa.notifyCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+2348012345678', name: 'Ada', orderId: 'order-1', total: 5000, mode: 'delivery' })
    );
    expect(wa.notifyRestaurant).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', customerName: 'Ada', customerPhone: '+2348012345678', total: 5000 })
    );
    expect(em.emailPaymentConfirmed).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ada@x.com', name: 'Ada', orderId: 'order-1' })
    );
    expect(em.emailPaymentAdminAlert).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', customerEmail: 'ada@x.com' })
    );
  });

  it('skips notifyCustomer when the customer has no phone (still notifies the restaurant)', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeChain({ data: { status: 'pending', order_id: 'order-1' } }))
      .mockReturnValueOnce(makeChain({ data: { order_id: 'order-1' } }))
      .mockReturnValueOnce(makeChain({ data: null }))
      .mockReturnValueOnce(makeChain(orderRow({ phone: '' })));

    await POST(webhookReq(chargeSuccessEvent({})));

    expect(wa.notifyCustomer).not.toHaveBeenCalled();
    expect(wa.notifyRestaurant).toHaveBeenCalled();
  });

  it('skips emailPaymentConfirmed when the customer has no email (still emails the admin)', async () => {
    mockSupabase.from
      .mockReturnValueOnce(makeChain({ data: { status: 'pending', order_id: 'order-1' } }))
      .mockReturnValueOnce(makeChain({ data: { order_id: 'order-1' } }))
      .mockReturnValueOnce(makeChain({ data: null }))
      .mockReturnValueOnce(makeChain(orderRow({ email: '' })));

    await POST(webhookReq(chargeSuccessEvent({})));

    expect(em.emailPaymentConfirmed).not.toHaveBeenCalled();
    expect(em.emailPaymentAdminAlert).toHaveBeenCalled();
  });

  it('ignores events other than charge.success (valid signature, no processing)', async () => {
    const res = await POST(webhookReq({ event: 'charge.failed', data: { reference: 'CD-ref-1' } }));

    expect(await res.json()).toEqual({ received: true });
    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(wa.notifyRestaurant).not.toHaveBeenCalled();
    expect(em.emailPaymentAdminAlert).not.toHaveBeenCalled();
  });
});
