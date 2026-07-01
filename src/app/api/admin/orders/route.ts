import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, cookieName } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import { emailStatusUpdate } from '@/lib/email';

export const runtime = 'edge';

const ALLOWED_STATUSES = ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

// PATCH /api/admin/orders  { orderId, status }
// Cookie-protected — only the admin session can update order status.
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(cookieName())?.value ?? '';
  if (!(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId, status } = await req.json().catch(() => ({}));

  if (!orderId || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid orderId or status' }, { status: 400 });
  }

  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email the customer about the status change (fire and forget)
  const { data: order } = await supabase
    .from('orders')
    .select('customers(name, email)')
    .eq('id', orderId)
    .single();
  const cust = order?.customers as unknown as { name: string; email: string } | null;
  if (cust?.email) {
    void emailStatusUpdate({ email: cust.email, name: cust.name, orderId, status });
  }

  return NextResponse.json({ ok: true });
}

// GET /api/admin/orders — fetch orders list
export async function GET(req: NextRequest) {
  const token = req.cookies.get(cookieName())?.value ?? '';
  if (!(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get('status');

  let query = supabase
    .from('orders')
    .select('id, status, total, subtotal, delivery_fee, fulfillment_mode, created_at, customers(name, phone, email), order_items(item_name, qty, unit_price)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
