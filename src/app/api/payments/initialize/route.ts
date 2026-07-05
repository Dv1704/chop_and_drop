import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseReady } from '@/lib/supabase';

function sbErr(err: unknown): string {
  if (!err) return 'Unknown error';
  const e = err as Record<string, unknown>;
  return (e.message as string) ?? JSON.stringify(e);
}

export const runtime = 'edge';

// POST /api/payments/initialize
// Body: { orderId, email, amountKobo }
export async function POST(req: NextRequest) {
  try {
    const { orderId, email, amountKobo } = await req.json();

    if (!orderId || !email || !amountKobo) {
      return NextResponse.json({ error: 'orderId, email and amountKobo are required' }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Payment not configured' }, { status: 503 });
    }

    // ── Guard: reject if this order already has a captured payment ────────────
    // Prevents a user from being charged twice for the same order (e.g. if they
    // call initialize again after already paying, or open two tabs).
    if (supabaseReady) {
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('status')
        .eq('order_id', orderId)
        .eq('status', 'captured')
        .maybeSingle();

      if (existingPayment) {
        return NextResponse.json(
          { error: 'This order has already been paid.' },
          { status: 409 }
        );
      }
    }

    const reference   = `CD-${orderId.slice(0, 8)}-${Date.now()}`;
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/payments/callback?orderId=${orderId}`;

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount:       amountKobo,
        currency:     'NGN',
        reference,
        callback_url: callbackUrl,
        metadata: {
          orderId,
          custom_fields: [{ display_name: 'Order ID', variable_name: 'order_id', value: orderId }],
        },
      }),
    });

    const json = await res.json();
    if (!json.status) throw new Error(json.message ?? 'Paystack error');

    // Save pending payment row (best-effort — doesn't block checkout if DB is slow)
    if (supabaseReady) {
      const { error: pmtErr } = await supabase.from('payments').insert({
        order_id:           orderId,
        provider:           'paystack',
        status:             'pending',
        paystack_reference: reference,
        amount:             amountKobo / 100,
      });
      if (pmtErr) console.error('[payments/initialize] payment insert error:', sbErr(pmtErr));
    }

    return NextResponse.json({
      authorizationUrl: json.data.authorization_url,
      reference:        json.data.reference,
      accessCode:       json.data.access_code,
    });
  } catch (err: unknown) {
    const message = sbErr(err);
    console.error('[payments/initialize] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
