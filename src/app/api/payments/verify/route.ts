import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

// GET /api/payments/verify?reference=xxx
// Called by the callback page after Paystack redirects the user back.
// Verifies payment with Paystack, updates DB status.
// WhatsApp notifications are sent by the webhook (which fires server-to-server
// before the user lands here), so we never send them here — that prevents doubles.
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference');
  if (!reference) return NextResponse.json({ error: 'Missing reference' }, { status: 400 });

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: 'Payment not configured' }, { status: 503 });

  try {
    // ── 1. Check if we already processed this payment ──────────────────────
    // Idempotency: if DB already shows captured, skip the Paystack API call
    // and re-fetch from DB. This handles page refreshes cleanly.
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('status, order_id')
      .eq('paystack_reference', reference)
      .single();

    if (existingPayment?.status === 'captured') {
      return NextResponse.json({
        paid:      true,
        orderId:   existingPayment.order_id,
        cached:    true,
      });
    }

    // ── 2. Verify with Paystack ────────────────────────────────────────────
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );

    const json = await res.json();
    if (!json.status) throw new Error(json.message ?? 'Verification failed');

    const { data } = json;
    const paid = data.status === 'success';

    // ── 3. Update payment row ─────────────────────────────────────────────
    const { data: payment } = await supabase
      .from('payments')
      .update({ status: paid ? 'captured' : 'failed', updated_at: new Date().toISOString() })
      .eq('paystack_reference', reference)
      .select('order_id')
      .single();

    // ── 4. Confirm order ──────────────────────────────────────────────────
    if (paid && payment?.order_id) {
      await supabase
        .from('orders')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', payment.order_id)
        .eq('status', 'pending'); // only update if still pending (idempotent)
    }

    return NextResponse.json({
      paid,
      orderId:   payment?.order_id ?? null,
      status:    data.status,
      amount:    data.amount / 100,
      currency:  data.currency,
      email:     data.customer?.email,
      reference: data.reference,
      paidAt:    data.paid_at,
    });
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message ?? 'Verification error';
    console.error('[payments/verify] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
