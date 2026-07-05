const WA_VERSION = 'v19.0';

function normalisePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0'))   return '234' + digits.slice(1);
  return digits;
}

async function send(to: string, body: string): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token         = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    console.warn('[whatsapp] WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set — skipping');
    return false;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${WA_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type:    'individual',
          to:   normalisePhone(to),
          type: 'text',
          text: { body, preview_url: false },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[whatsapp] API error:', JSON.stringify(err));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[whatsapp] fetch failed:', err);
    return false;
  }
}

// ── Public helpers ────────────────────────────────────────────────────────────

export interface OrderItem {
  item_name:  string;
  qty:        number;
  unit_price: number | string;
}

export async function notifyCustomer(p: {
  phone:   string;
  name:    string;
  orderId: string;
  items:   OrderItem[];
  total:   number | string;
  mode:    string;
}) {
  const shortId   = p.orderId.slice(0, 8).toUpperCase();
  const totalNGN  = Number(p.total).toLocaleString('en-NG');
  const itemLines = p.items
    .map(i => `  • ${i.item_name} x${i.qty}  ₦${(Number(i.unit_price) * i.qty).toLocaleString('en-NG')}`)
    .join('\n');
  const eta = p.mode === 'delivery'
    ? 'Estimated arrival: 25–45 min'
    : 'Ready for pickup in ~15 min';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  const msg = [
    `Hi ${p.name}! Your Chop & Drop order is confirmed. 🍲`,
    '',
    `Order ref:  #${shortId}`,
    `Full ID:    ${p.orderId}`,
    '',
    itemLines,
    '',
    `Total: ₦${totalNGN}`,
    `Mode:  ${p.mode === 'delivery' ? 'Delivery' : 'Pickup'}`,
    eta,
    '',
    `Track your order: ${appUrl}/#delivery`,
    '(Paste the Full ID or type the 8-char ref)',
    '',
    'Questions? Just reply here.',
    '— Chop & Drop',
  ].join('\n');

  const ok = await send(p.phone, msg);
  if (ok) console.log(`[whatsapp] Customer notified — order #${shortId}`);
}

export async function notifyRestaurant(p: {
  orderId:       string;
  customerName:  string;
  customerPhone: string;
  items:         OrderItem[];
  total:         number | string;
  mode:          string;
}) {
  const restaurantNumber = process.env.RESTAURANT_WHATSAPP_NUMBER;
  if (!restaurantNumber) return;

  const shortId   = p.orderId.slice(0, 8).toUpperCase();
  const totalNGN  = Number(p.total).toLocaleString('en-NG');
  const itemLines = p.items.map(i => `  • ${i.item_name} x${i.qty}`).join('\n');

  const msg = [
    `NEW ORDER #${shortId}`,
    '',
    `Customer: ${p.customerName}`,
    `Phone:    ${p.customerPhone}`,
    `Mode:     ${p.mode.toUpperCase()}`,
    '',
    'Items:',
    itemLines,
    '',
    `Total: ₦${totalNGN}`,
    '',
    'Log in to your Supabase dashboard to update the order status.',
  ].join('\n');

  const ok = await send(restaurantNumber, msg);
  if (ok) console.log(`[whatsapp] Restaurant alerted — order #${shortId}`);
}
