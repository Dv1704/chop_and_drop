'use client';

import { useState } from 'react';
import { MapPin, Clock, CheckCircle } from '@phosphor-icons/react';

export default function DeliverySection() {
  const [address, setAddress] = useState('');
  const [checked, setChecked] = useState<null | boolean>(null);

  function handleCheck() {
    if (!address.trim()) return;
    // Simulate a delivery zone check
    const covered = ['lagos', 'abuja', 'island', 'mainland', 'lekki', 'vi', 'yaba', 'surulere', 'ikeja'];
    const hit = covered.some((z) => address.toLowerCase().includes(z));
    setChecked(hit);
  }

  const zones = [
    { area: 'Lagos Island',   eta: '25–35 min' },
    { area: 'Lagos Mainland', eta: '30–45 min' },
    { area: 'Abuja',          eta: '40–55 min' },
  ];

  return (
    <section id="delivery" style={{ background: 'var(--egusi-cream)' }} className="py-28">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">

          {/* Left — form */}
          <div className="flex flex-col gap-8">
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 40px)', color: 'var(--suya-smoke)', lineHeight: 1.2 }}>
                We Deliver Everywhere
              </h2>
              <p style={{ color: 'var(--suya-smoke)', opacity: 0.65, marginTop: '12px', fontSize: '16px', lineHeight: 1.7 }}>
                Enter your address to confirm delivery availability and see your estimated arrival time.
              </p>
            </div>

            {/* Address input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="delivery-address" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--suya-smoke)' }}>
                Your delivery address
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin
                  size={18}
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--palm-oil)' }}
                />
                <input
                  id="delivery-address"
                  type="text"
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setChecked(null); }}
                  placeholder="e.g. 5 Admiralty Way, Lekki Phase 1, Lagos"
                  style={{
                    width: '100%',
                    padding: '14px 14px 14px 44px',
                    borderRadius: '8px',
                    border: '2px solid rgba(26,16,8,0.15)',
                    background: 'var(--ash-white)',
                    fontSize: '15px',
                    color: 'var(--suya-smoke)',
                    outline: 'none',
                    transition: 'border 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.border = '2px solid var(--palm-oil)')}
                  onBlur={(e) => (e.target.style.border = '2px solid rgba(26,16,8,0.15)')}
                />
              </div>
            </div>

            <button onClick={handleCheck} className="btn-stew" style={{ alignSelf: 'flex-start' }}>
              <MapPin size={18} /> Check My Area
            </button>

            {checked !== null && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  background: checked ? 'rgba(196,82,26,0.08)' : 'rgba(139,32,0,0.08)',
                  border: `1.5px solid ${checked ? 'var(--palm-oil)' : 'var(--stew-red)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: checked ? 'var(--palm-oil)' : 'var(--stew-red)',
                }}
              >
                <CheckCircle size={18} weight={checked ? 'fill' : 'regular'} />
                {checked
                  ? 'Great news — we deliver to your area!'
                  : 'Sorry, your area isn’t covered yet. Check back soon!'}
              </div>
            )}

            {/* Track order */}
            <div
              style={{
                marginTop: '8px',
                padding: '16px',
                borderRadius: '10px',
                background: 'var(--ash-white)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--suya-smoke)', marginBottom: '8px' }}>
                Already ordered? Track your delivery
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Order ID — e.g. CD-00123"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '2px solid rgba(26,16,8,0.12)',
                    background: 'var(--egusi-cream)',
                    fontSize: '14px',
                    color: 'var(--suya-smoke)',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.border = '2px solid var(--palm-oil)')}
                  onBlur={(e) => (e.target.style.border = '2px solid rgba(26,16,8,0.12)')}
                />
                <button className="btn-stew" style={{ padding: '10px 18px', fontSize: '13px' }}>
                  Track
                </button>
              </div>
            </div>
          </div>

          {/* Right — delivery zones */}
          <div className="flex flex-col gap-5">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px', color: 'var(--suya-smoke)', marginBottom: '4px' }}>
              Delivery Zones
            </h3>

            {zones.map((z) => (
              <div
                key={z.area}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  background: 'var(--ash-white)',
                  borderRadius: '14px',
                  boxShadow: 'var(--shadow-card)',
                  borderLeft: '4px solid var(--palm-oil)',
                }}
              >
                <div className="flex items-center gap-3">
                  <MapPin size={18} style={{ color: 'var(--palm-oil)' }} />
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--suya-smoke)' }}>{z.area}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'var(--font-price)',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'var(--plantain-gold)',
                    color: 'var(--suya-smoke)',
                    padding: '4px 12px',
                    borderRadius: '999px',
                  }}
                >
                  <Clock size={13} />
                  {z.eta}
                </div>
              </div>
            ))}

            {/* Free delivery callout */}
            <div
              style={{
                padding: '22px 24px',
                borderRadius: '14px',
                background: 'var(--suya-smoke)',
                color: 'var(--ash-white)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
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
