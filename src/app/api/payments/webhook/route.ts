import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { notifyCustomer, notifyRestaurant } from '@/lib/whatsapp';
import { emailPaymentConfirmed, emailPaymentAdminAlert } from '@/lib/email';
import crypto from 'crypto';

export const runtime = 'nodejs';

// POST /api/payments/webhook
// Paystack fires this server-to-server, typically BEFORE the user lands on callback.
// This is the ONLY place WhatsApp notifications are sent — prevents doubles when
// the callback verify route also runs on the same payment.
export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? '';
  const secret    = process.env.PAYSTACK_SECRET_KEY ?? '';

  const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === 'charge.success') {
    const { reference, amount, customer } = event.data;

    // ── Idempotency: check if this reference was already processed ────────
    const { data: existing } = await supabase
      .from('payments')
      .select('status, order_id')
      .eq('paystack_reference', reference)
      .single();

    if (existing?.status === 'captured') {
      // Already handled — Paystack sometimes retries. Do nothing.
      console.log(`[webhook] duplicate charge.success for ${reference} — skipping`);
      return NextResponse.json({ received: true });
    }

    // ── Update payment ────────────────────────────────────────────────────
    const { data: payment } = await supabase
      .from('payments')
      .update({ status: 'captured', updated_at: new Date().toISOString() })
      .eq('paystack_reference', reference)
      .select('order_id')
      .single();

    if (!payment?.order_id) {
      console.error(`[webhook] no payment row found for reference ${reference}`);
      return NextResponse.json({ received: true });
    }

    // ── Confirm order ─────────────────────────────────────────────────────
    await supabase
      .from('orders')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', payment.order_id)
      .eq('status', 'pending'); // guard: only move from pending → confirmed

    // ── Fetch order + customer + items for WhatsApp ───────────────────────
    const { data: order } = await supabase
      .from('orders')
      .select(`
        id, total, fulfillment_mode,
        customers ( name, phone, email ),
        order_items ( item_name, qty, unit_price )
      `)
      .eq('id', payment.order_id)
      .single();

    if (order) {
      const cust  = order.customers  as unknown as { name: string; phone: string; email: string } | null;
      const items = (order.order_items ?? []) as Array<{ item_name: string; qty: number; unit_price: number }>;

      // WhatsApp — notify customer + restaurant
      if (cust?.phone) {
        await notifyCustomer({
          phone:   cust.phone,
          name:    cust.name,
          orderId: order.id,
          items,
          total:   order.total,
          mode:    order.fulfillment_mode,
        });
      }
      await notifyRestaurant({
        orderId:       order.id,
        customerName:  cust?.name  ?? 'Unknown',
        customerPhone: cust?.phone ?? '',
        items,
        total: order.total,
        mode:  order.fulfillment_mode,
      });

      // Email — notify customer + admin
      if (cust?.email) {
        await emailPaymentConfirmed({
          email:   cust.email,
          name:    cust.name,
          orderId: order.id,
          items,
          total:   order.total,
          mode:    order.fulfillment_mode,
        });
      }
      await emailPaymentAdminAlert({
        orderId:       order.id,
        customerName:  cust?.name  ?? 'Unknown',
        customerEmail: cust?.email ?? '',
        total:         order.total,
        mode:          order.fulfillment_mode,
      });
    }

    console.log(`[webhook] charge.success processed — ₦${amount / 100} from ${customer?.email}`);
  }

  return NextResponse.json({ received: true });
}
