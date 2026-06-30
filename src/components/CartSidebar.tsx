'use client';

import { useState } from 'react';
import { X, Trash, Motorcycle, ShoppingCartSimple, ArrowRight, Lock } from '@phosphor-icons/react';
import { useCart } from '@/context/CartContext';

function formatPrice(n: number) {
  return `₦${n.toLocaleString('en-NG')}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 'cart' | 'checkout' | 'processing';

export default function CartSidebar({ open, onClose }: Props) {
  const { items, subtotal, deliveryFee, total, mode, updateQty, removeItem, setMode } = useCart();
  const [step, setStep]               = useState<Step>('cart');
  const [error, setError]             = useState('');
  const [form, setForm]               = useState({ name: '', email: '', phone: '' });

  // Holds the orderId once an order is successfully created.
  // On retry after a payment-init failure, this prevents a second order being created
  // for the same cart — we skip straight to initialising payment with the existing id.
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const effectiveTotal = mode === 'delivery' ? (subtotal >= 5000 ? subtotal : total) : subtotal;
  const effectiveFee   = mode === 'delivery' ? (subtotal >= 5000 ? 0 : deliveryFee) : 0;

  function field(key: keyof typeof form, label: string, type = 'text', placeholder = '') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--suya-smoke)' }}>{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          required
          style={{
            padding:      '12px 14px',
            borderRadius: '8px',
            border:       '2px solid rgba(26,16,8,0.15)',
            background:   'var(--egusi-cream)',
            fontSize:     '14px',
            color:        'var(--suya-smoke)',
            outline:      'none',
          }}
          onFocus={(e) => (e.target.style.border = '2px solid var(--palm-oil)')}
          onBlur={(e)  => (e.target.style.border = '2px solid rgba(26,16,8,0.15)')}
        />
      </div>
    );
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setStep('processing');

    try {
      // ── Step 1: Create order (skip if already created from a prior attempt) ──
      let orderId = pendingOrderId;

      if (!orderId) {
        const orderRes = await fetch('/api/orders', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer:        { name: form.name, email: form.email, phone: form.phone },
            items:           items.map((i) => ({ name: i.menuItem.name, qty: i.qty, unitPrice: i.unitPrice })),
            subtotal,
            deliveryFee:     effectiveFee,
            total:           effectiveTotal,
            fulfillmentMode: mode,
          }),
        });

        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.error ?? 'Failed to create order');

        orderId = orderData.orderId as string;
        setPendingOrderId(orderId); // persist so retries reuse the same order
      }

      // ── Step 2: Initialise Paystack payment ───────────────────────────────
      const payRes = await fetch('/api/payments/initialize', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          email:      form.email,
          amountKobo: effectiveTotal * 100,
        }),
      });

      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error ?? 'Payment init failed');

      // ── Step 3: Redirect to Paystack ──────────────────────────────────────
      // Cart is cleared by the callback page only after payment is confirmed,
      // so the user keeps their items if they cancel or close Paystack.
      window.location.href = payData.authorizationUrl;

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      setStep('checkout');
    }
  }

  function handleClose() {
    setStep('cart');
    setError('');
    onClose();
  }

  // Reset pendingOrderId when user explicitly goes back to cart to change items.
  // A cart change means a new order must be created.
  function handleBackToCart() {
    setPendingOrderId(null);
    setStep('cart');
    setError('');
  }

  return (
    <>
      {open && (
        <div
          onClick={handleClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,16,8,0.55)', zIndex: 90 }}
        />
      )}

      <aside
        style={{
          position:   'fixed',
          top:        0,
          right:      0,
          bottom:     0,
          width:      'min(440px, 100vw)',
          background: 'var(--ash-white)',
          zIndex:     100,
          display:    'flex',
          flexDirection: 'column',
          transform:  open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          boxShadow:  open ? '-8px 0 40px rgba(196,82,26,0.15)' : 'none',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(26,16,8,0.1)', background: 'var(--suya-smoke)' }}>
          <div className="flex items-center gap-2">
            <ShoppingCartSimple size={20} style={{ color: 'var(--plantain-gold)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ash-white)', fontSize: '16px' }}>
              {step === 'checkout' || step === 'processing' ? 'Checkout' : 'Your Order'}
            </span>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash-white)' }}>
            <X size={22} />
          </button>
        </div>

        {/* ── CART STEP ── */}
        {step === 'cart' && (
          <>
            {/* Mode toggle */}
            <div style={{ padding: '16px 24px', background: 'var(--egusi-cream)', borderBottom: '1px solid rgba(26,16,8,0.08)' }}>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '2px solid rgba(196,82,26,0.25)' }}>
                {(['delivery', 'pickup'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                      background: mode === m ? 'var(--palm-oil)' : 'transparent',
                      color:      mode === m ? 'var(--ash-white)' : 'var(--suya-smoke)',
                      transition: 'all 0.2s', textTransform: 'capitalize',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    {m === 'delivery' && <Motorcycle size={14} />}
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--suya-smoke)', opacity: 0.4 }}>
                  <ShoppingCartSimple size={48} style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '15px', fontWeight: 500 }}>Your cart is empty</p>
                  <p style={{ fontSize: '13px', marginTop: '6px' }}>Add items from the menu to get started</p>
                </div>
              ) : items.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--suya-smoke)' }} className="truncate">{item.menuItem.name}</p>
                    <span style={{ fontFamily: 'var(--font-price)', fontSize: '13px', color: 'var(--palm-oil)', fontWeight: 700 }}>
                      {formatPrice(item.unitPrice * item.qty)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(['−', '+'] as const).map((btn) => (
                      <button key={btn}
                        onClick={() => {
                          updateQty(item.id, btn === '−' ? item.qty - 1 : item.qty + 1);
                          setPendingOrderId(null); // cart changed — invalidate pending order
                        }}
                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1.5px solid rgba(196,82,26,0.3)', background: 'none', cursor: 'pointer', fontWeight: 700, color: 'var(--palm-oil)', fontSize: '16px', lineHeight: 1 }}
                      >{btn}</button>
                    ))}
                    <span style={{ width: '24px', textAlign: 'center', fontWeight: 700, fontSize: '14px' }}>{item.qty}</span>
                  </div>
                  <button
                    onClick={() => { removeItem(item.id); setPendingOrderId(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--stew-red)', opacity: 0.7, padding: '4px' }}
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Summary + CTA */}
            {items.length > 0 && (
              <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(26,16,8,0.1)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="flex justify-between text-sm" style={{ color: 'var(--suya-smoke)' }}>
                  <span>Subtotal</span>
                  <span style={{ fontFamily: 'var(--font-price)', fontWeight: 700 }}>{formatPrice(subtotal)}</span>
                </div>
                {mode === 'delivery' && (
                  <div className="flex justify-between text-sm" style={{ color: 'var(--suya-smoke)', opacity: 0.7 }}>
                    <span className="flex items-center gap-1.5"><Motorcycle size={14} /> Delivery</span>
                    <span style={{ fontFamily: 'var(--font-price)' }}>
                      {subtotal >= 5000
                        ? <><s style={{ opacity: 0.5 }}>{formatPrice(deliveryFee)}</s> <span style={{ color: 'var(--palm-oil)' }}>FREE</span></>
                        : formatPrice(deliveryFee)}
                    </span>
                  </div>
                )}
                <div style={{ height: '1px', background: 'rgba(26,16,8,0.1)' }} />
                <div className="flex justify-between" style={{ fontWeight: 700, color: 'var(--suya-smoke)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px' }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-price)', fontSize: '18px', color: 'var(--palm-oil)' }}>{formatPrice(effectiveTotal)}</span>
                </div>
                <button onClick={() => setStep('checkout')} className="btn-primary w-full justify-center mt-2" style={{ gap: '8px' }}>
                  Checkout <ArrowRight size={16} weight="bold" />
                </button>
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--suya-smoke)', opacity: 0.45, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Lock size={11} /> Secured by Paystack
                </p>
              </div>
            )}
          </>
        )}

        {/* ── CHECKOUT / PROCESSING STEP ── */}
        {(step === 'checkout' || step === 'processing') && (
          <form onSubmit={handleCheckout} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--egusi-cream)', fontSize: '13px', color: 'var(--suya-smoke)', opacity: 0.75 }}>
                {items.length} item{items.length !== 1 ? 's' : ''} · {formatPrice(effectiveTotal)} total · {mode === 'delivery' ? 'Delivery' : 'Pickup'}
              </div>

              {field('name',  'Full Name',     'text',  'e.g. Adaeze Okonkwo')}
              {field('email', 'Email Address', 'email', 'e.g. adaeze@email.com')}
              {field('phone', 'Phone Number',  'tel',   'e.g. 08012345678')}

              {error && (
                <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(139,32,0,0.08)', border: '1.5px solid var(--stew-red)', color: 'var(--stew-red)', fontSize: '13px', fontWeight: 600 }}>
                  {error}
                </div>
              )}
            </div>

            <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(26,16,8,0.1)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="flex justify-between" style={{ fontWeight: 700, color: 'var(--suya-smoke)' }}>
                <span style={{ fontSize: '15px' }}>Total to pay</span>
                <span style={{ fontFamily: 'var(--font-price)', fontSize: '18px', color: 'var(--palm-oil)' }}>{formatPrice(effectiveTotal)}</span>
              </div>

              <button
                type="submit"
                disabled={step === 'processing'}
                className="btn-primary w-full justify-center"
                style={{ gap: '8px', opacity: step === 'processing' ? 0.7 : 1, cursor: step === 'processing' ? 'wait' : 'pointer' }}
              >
                {step === 'processing' ? 'Processing…' : `Pay ${formatPrice(effectiveTotal)} with Paystack`}
              </button>

              <button
                type="button"
                onClick={handleBackToCart}
                disabled={step === 'processing'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--suya-smoke)', opacity: 0.55, fontSize: '13px', textDecoration: 'underline' }}
              >
                ← Back to cart
              </button>
            </div>
          </form>
        )}
      </aside>
    </>
  );
}
