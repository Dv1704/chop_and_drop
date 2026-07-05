const RESEND_API = 'https://api.resend.com/emails';

function apiKey()   { return process.env.RESEND_API_KEY ?? ''; }
function fromAddr() { return process.env.RESEND_FROM_EMAIL ?? 'Chop & Drop <onboarding@resend.dev>'; }
export function adminEmail() { return process.env.ADMIN_EMAIL ?? ''; }

async function send(to: string, subject: string, html: string) {
  const key = apiKey();
  if (!key || !to) { console.warn('[email] skipping — RESEND_API_KEY or recipient missing'); return; }
  try {
    const res = await fetch(RESEND_API, {
      method:  'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ from: fromAddr(), to, subject, html }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[email] Resend error:', JSON.stringify(err));
    }
  } catch (err) {
    console.error('[email] fetch failed:', err);
  }
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function layout(content: string) {
  return `<!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#F9F3E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr><td style="background:#1C1A16;padding:22px 32px;">
    <span style="font-size:22px;font-weight:800;color:#F5A623;letter-spacing:-0.5px;">Chop &amp; Drop</span>
    <span style="font-size:12px;color:rgba(255,255,255,0.4);margin-left:10px;">Nigerian Kitchen · Fast Delivery</span>
  </td></tr>
  <tr><td style="padding:32px 32px 24px;">${content}</td></tr>
  <tr><td style="background:#F9F3E8;padding:18px 32px;text-align:center;font-size:12px;color:#aaa;">
    &copy; ${new Date().getFullYear()} Chop &amp; Drop &nbsp;·&nbsp; Questions? Reply to this email
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function statusBadge(text: string, bg: string) {
  return `<span style="display:inline-block;padding:5px 14px;border-radius:20px;background:${bg};font-size:12px;font-weight:700;color:#fff;margin-bottom:18px;">${text}</span>`;
}

function itemsTable(items: Array<{ item_name: string; qty: number; unit_price: number | string }>) {
  const rows = items.map(i => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #F0EBE0;color:#333;font-size:14px;">${i.item_name}</td>
      <td style="padding:9px 0;border-bottom:1px solid #F0EBE0;color:#999;font-size:14px;text-align:center;">×${i.qty}</td>
      <td style="padding:9px 0;border-bottom:1px solid #F0EBE0;color:#333;font-size:14px;text-align:right;font-weight:600;">₦${(Number(i.unit_price) * i.qty).toLocaleString('en-NG')}</td>
    </tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 8px;">${rows}</table>`;
}

function totalRow(total: number | string) {
  return `<p style="margin:12px 0 24px;font-size:17px;font-weight:800;color:#E85D04;">Total: ₦${Number(total).toLocaleString('en-NG')}</p>`;
}

function refLine(orderId: string) {
  const short = orderId.slice(0, 8).toUpperCase();
  return `<p style="margin:0;font-size:12px;color:#bbb;">Order ref: <strong style="color:#999;">#${short}</strong> &nbsp;·&nbsp; ${orderId}</p>`;
}

// ── Status copy ───────────────────────────────────────────────────────────────

const STATUS: Record<string, { subject: string; badge: string; badgeBg: string; heading: string; body: string }> = {
  confirmed:        { subject: 'Order confirmed!',            badge: 'Confirmed ✓',     badgeBg: '#0C5460', heading: 'Your order is confirmed!',          body: 'We\'ve got your order and the kitchen is gearing up. Expect it soon!' },
  preparing:        { subject: 'We\'re cooking your order',   badge: 'Preparing 🍲',    badgeBg: '#C4521A', heading: 'We\'re cooking!',                   body: 'Your meal is being freshly prepared right now.' },
  out_for_delivery: { subject: 'Your order is on the way!',   badge: 'On The Way 🛵',   badgeBg: '#155724', heading: 'Your rider is on the way!',         body: 'Your order has left our kitchen and is heading to you.' },
  delivered:        { subject: 'Order delivered — enjoy!',    badge: 'Delivered 🎉',    badgeBg: '#155724', heading: 'Delivered! Enjoy your meal.',        body: 'Your Chop &amp; Drop order has been delivered. Bon appétit!' },
  cancelled:        { subject: 'Your order was cancelled',    badge: 'Cancelled',       badgeBg: '#721C24', heading: 'Your order has been cancelled.',     body: 'Your order was cancelled. If this was unexpected, please reply to this email and we\'ll sort it out.' },
};

// ── Public exports ────────────────────────────────────────────────────────────

export interface OrderItem { item_name: string; qty: number; unit_price: number | string; }

/** Sent to the customer right when they place an order (before payment). */
export async function emailOrderReceived(p: {
  email: string; name: string; orderId: string;
  items: OrderItem[]; total: number | string; mode: string;
}) {
  const short = p.orderId.slice(0, 8).toUpperCase();
  const eta   = p.mode === 'delivery' ? '25–45 min delivery' : 'Ready for pickup in ~15 min';
  const html  = layout(`
    <h2 style="margin:0 0 6px;font-size:21px;color:#1C1A16;">Hi ${p.name}, we got your order!</h2>
    <p style="margin:0 0 22px;color:#666;font-size:14px;">Order <strong>#${short}</strong> is received. Complete your payment to confirm it.</p>
    ${itemsTable(p.items)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
      <tr><td style="color:#888;font-size:13px;padding:3px 0;">Mode</td><td style="text-align:right;font-size:13px;font-weight:600;color:#333;">${p.mode === 'delivery' ? 'Delivery' : 'Pickup'}</td></tr>
      <tr><td style="color:#888;font-size:13px;padding:3px 0;">ETA</td><td style="text-align:right;font-size:13px;font-weight:600;color:#333;">${eta}</td></tr>
    </table>
    ${totalRow(p.total)}
    ${refLine(p.orderId)}
  `);
  await send(p.email, `Order received — #${short}`, html);
}

/** Sent to the admin whenever a new order is placed. */
export async function emailNewOrderAdmin(p: {
  orderId: string; customerName: string; customerEmail: string; customerPhone: string;
  items: OrderItem[]; total: number | string; mode: string;
}) {
  const email = adminEmail();
  if (!email) return;
  const short = p.orderId.slice(0, 8).toUpperCase();
  const html  = layout(`
    <h2 style="margin:0 0 16px;font-size:21px;color:#1C1A16;">New Order — #${short}</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr><td style="color:#888;font-size:13px;padding:3px 0;width:110px;">Customer</td><td style="font-size:13px;font-weight:600;color:#333;">${p.customerName}</td></tr>
      <tr><td style="color:#888;font-size:13px;padding:3px 0;">Email</td><td style="font-size:13px;color:#333;">${p.customerEmail}</td></tr>
      <tr><td style="color:#888;font-size:13px;padding:3px 0;">Phone</td><td style="font-size:13px;color:#333;">${p.customerPhone}</td></tr>
      <tr><td style="color:#888;font-size:13px;padding:3px 0;">Mode</td><td style="font-size:13px;font-weight:600;color:#333;">${p.mode.toUpperCase()}</td></tr>
    </table>
    ${itemsTable(p.items)}
    ${totalRow(p.total)}
    ${refLine(p.orderId)}
  `);
  await send(email, `🆕 Order #${short} — ₦${Number(p.total).toLocaleString('en-NG')}`, html);
}

/** Sent to the customer when Paystack confirms payment. */
export async function emailPaymentConfirmed(p: {
  email: string; name: string; orderId: string;
  items: OrderItem[]; total: number | string; mode: string;
}) {
  const short = p.orderId.slice(0, 8).toUpperCase();
  const html  = layout(`
    ${statusBadge('Payment Confirmed ✓', '#25a244')}
    <h2 style="margin:0 0 6px;font-size:21px;color:#1C1A16;">Payment received, ${p.name}!</h2>
    <p style="margin:0 0 22px;color:#666;font-size:14px;">We've got your money and the kitchen is already on it for order <strong>#${short}</strong>.</p>
    ${itemsTable(p.items)}
    ${totalRow(p.total)}
    ${refLine(p.orderId)}
  `);
  await send(p.email, `Payment confirmed — Order #${short}`, html);
}

/** Sent to the admin when a payment is captured. */
export async function emailPaymentAdminAlert(p: {
  orderId: string; customerName: string; customerEmail: string;
  total: number | string; mode: string;
}) {
  const email = adminEmail();
  if (!email) return;
  const short = p.orderId.slice(0, 8).toUpperCase();
  const html  = layout(`
    ${statusBadge('Payment Captured 💰', '#25a244')}
    <h2 style="margin:0 0 16px;font-size:21px;color:#1C1A16;">Order #${short} is now paid</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr><td style="color:#888;font-size:13px;padding:3px 0;width:110px;">Customer</td><td style="font-size:13px;font-weight:600;color:#333;">${p.customerName}</td></tr>
      <tr><td style="color:#888;font-size:13px;padding:3px 0;">Email</td><td style="font-size:13px;color:#333;">${p.customerEmail}</td></tr>
      <tr><td style="color:#888;font-size:13px;padding:3px 0;">Mode</td><td style="font-size:13px;font-weight:600;color:#333;">${p.mode.toUpperCase()}</td></tr>
    </table>
    ${totalRow(p.total)}
    ${refLine(p.orderId)}
  `);
  await send(email, `💰 Payment received — Order #${short}`, html);
}

/** Sent to the customer on every admin status change. */
export async function emailStatusUpdate(p: {
  email: string; name: string; orderId: string; status: string;
}) {
  const cfg = STATUS[p.status];
  if (!cfg) return;
  const short = p.orderId.slice(0, 8).toUpperCase();
  const html  = layout(`
    ${statusBadge(cfg.badge, cfg.badgeBg)}
    <h2 style="margin:0 0 6px;font-size:21px;color:#1C1A16;">${cfg.heading}</h2>
    <p style="margin:0 0 24px;color:#666;font-size:14px;">Hi ${p.name}, ${cfg.body}</p>
    ${refLine(p.orderId)}
  `);
  await send(p.email, `${cfg.subject} — #${short}`, html);
}
