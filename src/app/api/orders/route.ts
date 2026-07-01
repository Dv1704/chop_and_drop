import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseReady } from '@/lib/supabase';
import { emailOrderReceived, emailNewOrderAdmin } from '@/lib/email';

export const runtime = 'edge';

function supabaseErr(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>;
    return (e.message as string) ?? (e.code as string) ?? JSON.stringify(e);
  }
  return String(err);
}

// POST /api/orders — create order from cart
export async function POST(req: NextRequest) {
  if (!supabaseReady) {
    return NextResponse.json({ error: 'Database not configured — set NEXT_PUBLIC_SUPABASE_URL in .env.local' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { customer, items, subtotal, deliveryFee, total, fulfillmentMode, notes } = body;

    if (!customer?.email || !customer?.name || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields: customer (name, email) and items' }, { status: 400 });
    }

    // Validate inputs
    const email = String(customer.email).trim().toLowerCase();
    const name  = String(customer.name).trim().slice(0, 255);
    const phone = String(customer.phone ?? '').trim().slice(0, 30);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Upsert customer
    const { data: cust, error: custErr } = await supabase
      .from('customers')
      .upsert({ name, email, phone }, { onConflict: 'email' })
      .select('id')
      .single();

    if (custErr) {
      console.error('[orders] customer upsert error:', custErr);
      return NextResponse.json({ error: supabaseErr(custErr) }, { status: 500 });
    }

    // Create order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        customer_id:      cust.id,
        status:           'pending',
        fulfillment_mode: fulfillmentMode ?? 'delivery',
        subtotal:         Number(subtotal)    || 0,
        delivery_fee:     Number(deliveryFee) || 0,
        tax:              0,
        tip:              0,
        total:            Number(total)       || 0,
        notes:            notes ?? null,
      })
      .select('id, total')
      .single();

    if (orderErr) {
      console.error('[orders] order insert error:', orderErr);
      return NextResponse.json({ error: supabaseErr(orderErr) }, { status: 500 });
    }

    // Create order items (item_name stored inline, no FK to menu_items needed)
    const orderItems = (items as Array<{ name: string; qty: number; unitPrice: number }>).map((item) => ({
      order_id:   order.id,
      item_name:  String(item.name ?? 'Item').slice(0, 255),
      qty:        Math.max(1, Math.floor(Number(item.qty) || 1)),
      unit_price: Number(item.unitPrice) || 0,
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
    if (itemsErr) {
      console.error('[orders] order_items insert error:', itemsErr);
      return NextResponse.json({ error: supabaseErr(itemsErr) }, { status: 500 });
    }

    // Fire emails — non-blocking so errors don't fail the order response
    const emailItems = orderItems.map(i => ({ item_name: i.item_name, qty: i.qty, unit_price: i.unit_price }));
    void emailOrderReceived({ email, name, orderId: order.id, items: emailItems, total: order.total, mode: fulfillmentMode ?? 'delivery' });
    void emailNewOrderAdmin({ orderId: order.id, customerName: name, customerEmail: email, customerPhone: phone, items: emailItems, total: order.total, mode: fulfillmentMode ?? 'delivery' });

    return NextResponse.json({ orderId: order.id, total: order.total });
  } catch (err: unknown) {
    console.error('[orders] POST error:', err);
    return NextResponse.json({ error: supabaseErr(err) }, { status: 500 });
  }
}

// GET /api/orders?id=xxx
// Accepts either a full UUID (36 chars) or the 8-char short reference shown
// on the confirmation page / WhatsApp message.
export async function GET(req: NextRequest) {
  if (!supabaseReady) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const raw = req.nextUrl.searchParams.get('id')?.trim() ?? '';
  const id  = raw.toLowerCase();

  const isFullUuid  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
  const isShortRef  = /^[0-9a-f]{8}$/.test(id);

  if (!isFullUuid && !isShortRef) {
    return NextResponse.json({ error: 'Enter your 8-character Order ID or the full UUID.' }, { status: 400 });
  }

  let query = supabase.from('orders').select('*, order_items(*)');

  if (isFullUuid) {
    query = query.eq('id', id);
  } else {
    // Prefix-match on the UUID cast to text — PostgREST supports column::type in filters
    query = query.filter('id::text', 'ilike', `${id}%`);
  }

  const { data, error } = await query.limit(1).single();

  if (error || !data) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  return NextResponse.json(data);
}
