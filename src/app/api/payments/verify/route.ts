import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

// GET /api/payments/verify?reference=CD-xxx
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference');
  if (!reference) return NextResponse.json({ error: 'Missing reference' }, { status: 400 });

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: 'Payment not configured' }, { status: 503 });

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const json = await res.json();
    if (!json.status) throw new Error(json.message ?? 'Verification failed');

    const { data } = json;
    const paid = data.status === 'success';

    // Update payment row
    await supabase
      .from('payments')
      .update({ status: paid ? 'captured' : 'failed' })
      .eq('paystack_reference', reference);

    // Update order status if paid
    if (paid) {
      const { data: payment } = await supabase
        .from('payments')
        .select('order_id')
        .eq('paystack_reference', reference)
        .single();

      if (payment?.order_id) {
        await supabase
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('id', payment.order_id);
      }
    }

    return NextResponse.json({
      paid,
      status: data.status,
      amount: data.amount / 100,
      currency: data.currency,
      email: data.customer?.email,
      reference: data.reference,
      paidAt: data.paid_at,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verification error';
    console.error('[payments/verify] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
