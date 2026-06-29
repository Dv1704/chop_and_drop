import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export const runtime = 'nodejs';

// POST /api/payments/webhook  — Paystack webhook
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? '';
  const secret = process.env.PAYSTACK_SECRET_KEY ?? '';

  // Verify HMAC signature
  const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === 'charge.success') {
    const { reference, amount, customer } = event.data;

    // Update payment record
    const { data: payment } = await supabase
      .from('payments')
      .update({ status: 'captured' })
      .eq('paystack_reference', reference)
      .select('order_id')
      .single();

    if (payment?.order_id) {
      await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', payment.order_id);
    }

    console.log(`[webhook] Payment captured: ${reference} — ₦${amount / 100} from ${customer?.email}`);
  }

  return NextResponse.json({ received: true });
}
