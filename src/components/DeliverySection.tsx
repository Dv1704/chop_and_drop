'use client';

import { useState } from 'react';
import { MapPin, Clock, CheckCircle, MagnifyingGlass, Package, Motorcycle, Storefront } from '@phosphor-icons/react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:          { label: 'Order received',      color: '#E8A020' },
  confirmed:        { label: 'Payment confirmed',   color: '#C4521A' },
  preparing:        { label: 'Being prepared',      color: '#C4521A' },
  out_for_delivery: { label: 'Out for delivery',    color: '#22c55e' },
  delivered:        { label: 'Delivered',            color: '#22c55e' },
  cancelled:        { label: 'Cancelled',            color: '#8B2000' },
};

interface TrackedOrder {
  id:               string;
  status:           string;
  total:            string;
  fulfillment_mode: string;
  created_at:       string;
  order_items:      Array<{ item_name: string; qty: number; unit_price: string }>;
}

export default function DeliverySection() {
  const [address, setAddress]     = useState('');
  const [checked, setChecked]     = useState<null | boolean>(null);
  const [orderId, setOrderId]     = useState('');
  const [tracking, setTracking]   = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');
  const [order, setOrder]         = useState<TrackedOrder | null>(null);

  function handleCheck() {
    if (!address.trim()) return;
    const covered = ['lagos', 'abuja', 'island', 'mainland', 'lekki', 'vi', 'yaba', 'surulere', 'ikeja', 'ikoyi', 'victoria', 'ajah', 'sangotedo'];
    const hit = covered.some((z) => address.toLowerCase().includes(z));
    setChecked(hit);
  }

  async function handleTrack() {
    const id = orderId.trim();
    if (!id) return;
    setTracking('loading');
    setOrder(null);
    try {
      const res  = await fetch(`/api/orders?id=${encodeURIComponent(id)}`);
      if (!res.ok) { setTracking('notfound'); return; }
      const data = await res.json();
      setOrder(data);
      setTracking('found');
    } catch {
      setTracking('notfound');
    }
  }

  const zones = [
    { area: 'Lagos Island',   eta: '25–35 min' },
    { area: 'Lagos Mainland', eta: '30–45 min' },
    { area: 'Abuja',          eta: '40–55 min' },
  ];

  const statusInfo = order ? (STATUS_LABELS[order.status] ?? { label: order.status, color: '#C4521A' }) : null;

  return (
    <section id="delivery" style={{ background: 'var(--egusi-cream)' }} className="py-28">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">

          {/* Left */}
          <div className="flex flex-col gap-8">
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 40px)', color: 'var(--suya-smoke)', lineHeight: 1.2 }}>
                We Deliver Everywhere
              </h2>
              <p style={{ color: 'var(--suya-smoke)', opacity: 0.65, marginTop: '12px', fontSize: '16px', lineHeight: 1.7 }}>
                Enter your address to confirm delivery availability and see your estimated arrival time.
              </p>
            </div>

            {/* Address check */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="delivery-address" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--suya-smoke)' }}>
                Your delivery address
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--palm-oil)' }} />
                <input
                  id="delivery-address"
                  type="text"
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setChecked(null); }}
                  placeholder="e.g. 5 Admiralty Way, Lekki Phase 1, Lagos"
                  style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '8px', border: '2px solid rgba(26,16,8,0.15)', background: 'var(--ash-white)', fontSize: '15px', color: 'var(--suya-smoke)', outline: 'none', transition: 'border 0.2s' }}
                  onFocus={(e) => (e.target.style.border = '2px solid var(--palm-oil)')}
                  onBlur={(e)  => (e.target.style.border = '2px solid rgba(26,16,8,0.15)')}
                />
              </div>
            </div>

            <button onClick={handleCheck} className="btn-stew" style={{ alignSelf: 'flex-start' }}>
              <MapPin size={18} /> Check My Area
            </button>

            {checked !== null && (
              <div style={{ padding: '14px 18px', borderRadius: '10px', background: checked ? 'rgba(196,82,26,0.08)' : 'rgba(139,32,0,0.08)', border: `1.5px solid ${checked ? 'var(--palm-oil)' : 'var(--stew-red)'}`, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600, color: checked ? 'var(--palm-oil)' : 'var(--stew-red)' }}>
                <CheckCircle size={18} weight={checked ? 'fill' : 'regular'} />
                {checked ? 'Great news — we deliver to your area!' : 'Sorry, your area is not covered yet. Check back soon!'}
              </div>
            )}

            {/* Order tracker */}
            <div style={{ padding: '20px', borderRadius: '14px', background: 'var(--ash-white)', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--suya-smoke)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={16} style={{ color: 'var(--palm-oil)' }} />
                Track your order
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => { setOrderId(e.target.value); setTracking('idle'); setOrder(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                  placeholder="8-char code (e.g. 7702E8CE) or full UUID"
                  style={{ flex: 1, padding: '11px 14px', borderRadius: '8px', border: '2px solid rgba(26,16,8,0.12)', background: 'var(--egusi-cream)', fontSize: '14px', color: 'var(--suya-smoke)', outline: 'none' }}
                  onFocus={(e) => (e.target.style.border = '2px solid var(--palm-oil)')}
                  onBlur={(e)  => (e.target.style.border = '2px solid rgba(26,16,8,0.12)')}
                />
                <button
                  onClick={handleTrack}
                  disabled={tracking === 'loading'}
                  className="btn-stew"
                  style={{ padding: '11px 18px', fontSize: '13px', opacity: tracking === 'loading' ? 0.7 : 1 }}
                >
                  <MagnifyingGlass size={15} />
                  {tracking === 'loading' ? 'Searching…' : 'Track'}
                </button>
              </div>

              {/* Tracking result */}
              {tracking === 'notfound' && (
                <p style={{ fontSize: '13px', color: 'var(--stew-red)', fontWeight: 600 }}>
                  Order not found. Check the ID and try again.
                </p>
              )}

              {tracking === 'found' && order && statusInfo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(26,16,8,0.08)', paddingTop: '12px' }}>
                  {/* Status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--suya-smoke)', opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 12px', borderRadius: '999px', background: statusInfo.color + '22', color: statusInfo.color }}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {order.order_items?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--suya-smoke)' }}>
                        <span>{item.item_name} × {item.qty}</span>
                        <span style={{ fontFamily: 'var(--font-price)', fontWeight: 700 }}>
                          ₦{(Number(item.unit_price) * item.qty).toLocaleString('en-NG')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total + mode */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(26,16,8,0.08)', paddingTop: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--suya-smoke)', opacity: 0.6 }}>
                      {order.fulfillment_mode === 'delivery' ? <Motorcycle size={14} /> : <Storefront size={14} />}
                      {order.fulfillment_mode === 'delivery' ? 'Delivery' : 'Pickup'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-price)', fontWeight: 700, fontSize: '15px', color: 'var(--palm-oil)' }}>
                      ₦{Number(order.total).toLocaleString('en-NG')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right — zones */}
          <div className="flex flex-col gap-5">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px', color: 'var(--suya-smoke)', marginBottom: '4px' }}>
              Delivery Zones
            </h3>

            {zones.map((z) => (
              <div key={z.area} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: 'var(--ash-white)', borderRadius: '14px', boxShadow: 'var(--shadow-card)', borderLeft: '4px solid var(--palm-oil)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MapPin size={18} style={{ color: 'var(--palm-oil)' }} />
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--suya-smoke)' }}>{z.area}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-price)', fontSize: '13px', fontWeight: 700, background: 'var(--plantain-gold)', color: 'var(--suya-smoke)', padding: '4px 12px', borderRadius: '999px' }}>
                  <Clock size={13} />{z.eta}
                </div>
              </div>
            ))}

            <div style={{ padding: '22px 24px', borderRadius: '14px', background: 'var(--suya-smoke)', color: 'var(--ash-white)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={22} weight="fill" style={{ color: 'var(--plantain-gold)', flexShrink: 0 }} />
              <p style={{ fontSize: '15px', lineHeight: 1.65 }}>
                <strong>Free delivery</strong> on all orders above &#x20A6;5,000. Order more, save more.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
