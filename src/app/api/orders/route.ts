import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseReady } from '@/lib/supabase';

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

    return NextResponse.json({ orderId: order.id, total: order.total });
  } catch (err: unknown) {
    console.error('[orders] POST error:', err);
    return NextResponse.json({ error: supabaseErr(err) }, { status: 500 });
  }
}

// GET /api/orders?id=xxx
export async function GET(req: NextRequest) {
  if (!supabaseReady) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid or missing order id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
