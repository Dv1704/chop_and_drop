'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Package, CheckCircle, XCircle, Motorcycle, Storefront, ArrowClockwise, SignOut, WhatsappLogo, Bell } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

const POLL_INTERVAL = 30_000; // 30 seconds

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; next?: string }> = {
  pending:          { label: 'Received',    bg: '#FFF3CD', color: '#856404', next: 'confirmed' },
  confirmed:        { label: 'Confirmed',   bg: '#D1ECF1', color: '#0C5460', next: 'preparing' },
  preparing:        { label: 'Preparing',   bg: '#FFE0CC', color: '#C4521A', next: 'out_for_delivery' },
  out_for_delivery: { label: 'On the way',  bg: '#D4EDDA', color: '#155724', next: 'delivered' },
  delivered:        { label: 'Delivered',   bg: '#D4EDDA', color: '#155724' },
  cancelled:        { label: 'Cancelled',   bg: '#F8D7DA', color: '#721C24' },
};

const NEXT_LABEL: Record<string, string> = {
  confirmed:        'Start Preparing',
  preparing:        'Out for Delivery',
  out_for_delivery: 'Mark Delivered',
};

interface Order {
  id:               string;
  status:           string;
  total:            string;
  subtotal:         string;
  delivery_fee:     string;
  fulfillment_mode: string;
  created_at:       string;
  customers:        { name: string; phone: string; email: string } | null;
  order_items:      Array<{ item_name: string; qty: number; unit_price: string }>;
}

export default function AdminPage() {
  const router = useRouter();
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [updating, setUpdating]   = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [newCount, setNewCount]   = useState(0);
  const knownIdsRef               = useRef<Set<string>>(new Set());
  const isFirstFetch              = useRef(true);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    const params = filter !== 'all' ? `?status=${filter}` : '';
    const res = await fetch(`/api/admin/orders${params}`);
    if (res.status === 401) { router.replace('/admin/login'); return; }
    const data: Order[] = await res.json();
    if (res.ok) {
      setOrders(data);
      if (isFirstFetch.current) {
        // seed known IDs on first load — don't alert for existing orders
        knownIdsRef.current = new Set(data.map((o) => o.id));
        isFirstFetch.current = false;
      } else {
        const fresh = data.filter((o) => !knownIdsRef.current.has(o.id));
        if (fresh.length > 0) {
          fresh.forEach((o) => knownIdsRef.current.add(o.id));
          setNewCount((c) => c + fresh.length);
          document.title = `(${fresh.length} new) Chop & Drop Admin`;
          setTimeout(() => { document.title = 'Chop & Drop Admin'; }, 8_000);
        }
      }
    } else {
      setError((data as { error?: string }).error ?? 'Failed to load orders');
    }
    if (!silent) setLoading(false);
  }, [filter, router]);

  // Initial load
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Background polling
  useEffect(() => {
    const id = setInterval(() => fetchOrders(true), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchOrders]);

  async function updateStatus(orderId: string, status: string) {
    setUpdating(orderId);
    const res = await fetch('/api/admin/orders', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ orderId, status }),
    });
    if (res.status === 401) { router.replace('/admin/login'); return; }
    await fetchOrders();
    setUpdating(null);
  }

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.replace('/admin/login');
  }

  function whatsappLink(phone: string, name: string, orderId: string, status: string) {
    const label = STATUS_CONFIG[status]?.label ?? status;
    const msg   = encodeURIComponent(`Hi ${name}, your Chop & Drop order #${orderId.slice(0, 8).toUpperCase()} is now: ${label}. Thank you!`);
    return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${msg}`;
  }

  const counts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const revenue = orders
    .filter(o => ['confirmed', 'preparing', 'out_for_delivery', 'delivered'].includes(o.status))
    .reduce((s, o) => s + Number(o.total), 0);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--egusi-cream)' }}>
      {/* Header */}
      <div style={{ background: 'var(--suya-smoke)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', color: 'var(--plantain-gold)' }}>Chop & Drop</span>
          <span style={{ fontSize: '13px', color: 'var(--ash-white)', opacity: 0.5, marginLeft: '10px' }}>Admin</span>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <button onClick={() => fetchOrders()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash-white)', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
            <ArrowClockwise size={14} /> Refresh
          </button>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash-white)', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
            <SignOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* New-order banner */}
      {newCount > 0 && (
        <div style={{ background: '#25a244', color: '#fff', padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px' }}>
            <Bell size={16} weight="fill" />
            {newCount} new order{newCount > 1 ? 's' : ''} arrived!
          </span>
          <button onClick={() => setNewCount(0)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '18px', lineHeight: 1, opacity: 0.8 }}>×</button>
        </div>
      )}

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Total Orders',  value: orders.length,                                                                     color: 'var(--suya-smoke)' },
            { label: 'Pending',       value: counts['pending'] ?? 0,                                                            color: '#856404' },
            { label: 'In Progress',   value: (counts['confirmed'] ?? 0) + (counts['preparing'] ?? 0),                          color: 'var(--palm-oil)' },
            { label: 'On the Way',    value: counts['out_for_delivery'] ?? 0,                                                   color: '#155724' },
            { label: 'Revenue',       value: `₦${revenue.toLocaleString('en-NG')}`,                                            color: 'var(--palm-oil)' },
          ].map((s) => (
            <div key={s.label} style={{ background: 'var(--ash-white)', borderRadius: '12px', padding: '18px 20px', boxShadow: 'var(--shadow-card)' }}>
              <p style={{ fontSize: '11px', color: 'var(--suya-smoke)', opacity: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{s.label}</p>
              <p style={{ fontFamily: 'var(--font-price)', fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 16px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: filter === f ? 'var(--palm-oil)' : 'var(--ash-white)', color: filter === f ? 'var(--ash-white)' : 'var(--suya-smoke)', boxShadow: 'var(--shadow-card)', transition: 'all 0.15s' }}>
              {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label ?? f}{f !== 'all' && counts[f] ? ` (${counts[f]})` : ''}
            </button>
          ))}
        </div>

        {/* Body */}
        {error && <p style={{ color: 'var(--stew-red)', fontWeight: 600, marginBottom: '16px' }}>{error}</p>}

        {loading ? (
          <p style={{ textAlign: 'center', padding: '60px', color: 'var(--suya-smoke)', opacity: 0.45 }}>Loading orders…</p>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--ash-white)', borderRadius: '16px' }}>
            <Package size={40} style={{ color: 'var(--palm-oil)', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: 'var(--suya-smoke)', opacity: 0.55 }}>No orders yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map((order) => {
              const cfg  = STATUS_CONFIG[order.status] ?? { label: order.status, bg: '#eee', color: '#333' };
              const cust = order.customers;
              return (
                <div key={order.id} style={{ background: 'var(--ash-white)', borderRadius: '14px', padding: '20px 24px', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontFamily: 'var(--font-price)', fontWeight: 700, fontSize: '15px', color: 'var(--suya-smoke)' }}>#{order.id.slice(0, 8).toUpperCase()}</span>
                      <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '999px', fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      <span style={{ fontSize: '11px', color: 'var(--suya-smoke)', opacity: 0.4 }}>
                        {new Date(order.created_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontFamily: 'var(--font-price)', fontWeight: 700, fontSize: '16px', color: 'var(--palm-oil)' }}>₦{Number(order.total).toLocaleString('en-NG')}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--suya-smoke)', opacity: 0.55 }}>
                        {order.fulfillment_mode === 'delivery' ? <Motorcycle size={13} /> : <Storefront size={13} />}
                        {order.fulfillment_mode}
                      </span>
                    </div>
                  </div>

                  {/* Customer */}
                  {cust && (
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--suya-smoke)', opacity: 0.65, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{cust.name}</span>
                      <span>{cust.phone}</span>
                      <span>{cust.email}</span>
                    </div>
                  )}

                  {/* Items */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {order.order_items?.map((item, i) => (
                      <span key={i} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: 'var(--egusi-cream)', color: 'var(--suya-smoke)', fontWeight: 500 }}>
                        {item.item_name} × {item.qty}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {cfg.next && (
                      <button onClick={() => updateStatus(order.id, cfg.next!)} disabled={updating === order.id} className="btn-primary" style={{ fontSize: '12px', padding: '7px 16px', opacity: updating === order.id ? 0.6 : 1 }}>
                        <CheckCircle size={13} />
                        {updating === order.id ? 'Updating…' : NEXT_LABEL[cfg.next] ?? cfg.next}
                      </button>
                    )}
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <button onClick={() => updateStatus(order.id, 'cancelled')} disabled={updating === order.id} style={{ fontSize: '12px', padding: '7px 16px', borderRadius: '8px', border: '1.5px solid var(--stew-red)', background: 'none', cursor: 'pointer', color: 'var(--stew-red)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <XCircle size={13} /> Cancel
                      </button>
                    )}
                    {cust?.phone && (
                      <a href={whatsappLink(cust.phone, cust.name, order.id, order.status)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', padding: '7px 16px', borderRadius: '8px', border: '1.5px solid #25d366', background: 'none', color: '#25d366', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
                        <WhatsappLogo size={13} /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
