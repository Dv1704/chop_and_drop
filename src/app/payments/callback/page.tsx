'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, SpinnerGap, WhatsappLogo, ArrowLeft } from '@phosphor-icons/react';

// Clear persisted cart on confirmed payment without needing CartContext
function clearPersistedCart() {
  try { localStorage.removeItem('cnd_cart_v1'); } catch { /* ignore */ }
}

// Shows both the 8-char short reference and the full UUID with a copy button
function OrderIdBox({ shortId, fullId }: { shortId: string; fullId?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const text = fullId ?? shortId;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ background: 'var(--egusi-cream)', borderRadius: '10px', padding: '14px 20px', marginBottom: '16px' }}>
      <p style={{ fontSize: '12px', color: 'var(--suya-smoke)', opacity: 0.55, marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Your Order Reference
      </p>

      {/* Short ref — easy to remember, works in the tracker */}
      <p style={{ fontFamily: 'var(--font-price)', fontSize: '24px', fontWeight: 700, color: 'var(--suya-smoke)', letterSpacing: '3px', marginBottom: '8px' }}>
        #{shortId}
      </p>

      {/* Full UUID — copyable, also works in the tracker */}
      {fullId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(26,16,8,0.06)', borderRadius: '6px', padding: '8px 10px' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--suya-smoke)', opacity: 0.6, flex: 1, wordBreak: 'break-all', textAlign: 'left' }}>
            {fullId}
          </span>
          <button
            onClick={copy}
            style={{ background: copied ? 'var(--palm-oil)' : 'none', border: '1px solid rgba(26,16,8,0.2)', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: copied ? 'white' : 'var(--suya-smoke)', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      <p style={{ fontSize: '11px', color: 'var(--suya-smoke)', opacity: 0.45, marginTop: '8px' }}>
        Use either the 8-char code or the full ID to track your order
      </p>
    </div>
  );
}

function CallbackContent() {
  const params     = useSearchParams();
  const reference  = params.get('reference') ?? params.get('trxref');
  const urlOrderId = params.get('orderId');

  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [detail, setDetail] = useState<{
    amount?: number; email?: string; orderId?: string; paidAt?: string;
  } | null>(null);

  useEffect(() => {
    if (!reference) { setStatus('failed'); return; }

    fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.paid) {
          clearPersistedCart(); // payment confirmed — safe to wipe the cart
          setStatus('success');
          setDetail({
            amount:  data.amount,
            email:   data.email,
            orderId: data.orderId ?? urlOrderId ?? undefined,
            paidAt:  data.paidAt,
          });
        } else {
          setStatus('failed');
        }
      })
      .catch(() => setStatus('failed'));
  }, [reference, urlOrderId]);

  const shortId = detail?.orderId?.slice(0, 8).toUpperCase();

  return (
    <main style={{ minHeight: '100vh', background: 'var(--suya-smoke)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      <div style={{ background: 'var(--ash-white)', borderRadius: '20px', padding: '48px 40px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>

        {/* Loading */}
        {status === 'loading' && (
          <>
            <SpinnerGap size={52} weight="bold" style={{ color: 'var(--palm-oil)', animation: 'spin 0.9s linear infinite', margin: '0 auto 20px' }} />
            <p style={{ fontWeight: 600, fontSize: '16px', color: 'var(--suya-smoke)' }}>Verifying your payment…</p>
            <p style={{ fontSize: '13px', color: 'var(--suya-smoke)', opacity: 0.5, marginTop: '6px' }}>This only takes a moment.</p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle size={52} weight="fill" style={{ color: '#22c55e' }} />
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '26px', color: 'var(--suya-smoke)', marginBottom: '10px' }}>
              Order Confirmed!
            </h1>

            {detail?.amount && (
              <p style={{ fontFamily: 'var(--font-price)', fontSize: '24px', fontWeight: 700, color: 'var(--palm-oil)', marginBottom: '20px' }}>
                ₦{detail.amount.toLocaleString('en-NG')} paid
              </p>
            )}

            {shortId && (
              <OrderIdBox shortId={shortId} fullId={detail?.orderId} />
            )}

            <div style={{ background: 'rgba(37,211,102,0.08)', border: '1.5px solid rgba(37,211,102,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <WhatsappLogo size={20} style={{ color: '#25d366', flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: 'var(--suya-smoke)', opacity: 0.75, textAlign: 'left', lineHeight: 1.5 }}>
                A WhatsApp confirmation with your order details has been sent to your phone.
              </p>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--suya-smoke)', opacity: 0.55, marginBottom: '28px', lineHeight: 1.6 }}>
              Your food is being prepared. Use your Order ID above to track delivery on our website.
            </p>

            <a href="/" className="btn-primary" style={{ display: 'inline-flex', margin: '0 auto', gap: '8px' }}>
              <ArrowLeft size={16} /> Back to Menu
            </a>
          </>
        )}

        {/* Failed */}
        {status === 'failed' && (
          <>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(139,32,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <XCircle size={52} weight="fill" style={{ color: 'var(--stew-red)' }} />
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '26px', color: 'var(--suya-smoke)', marginBottom: '10px' }}>
              Payment Failed
            </h1>
            <p style={{ color: 'var(--suya-smoke)', opacity: 0.65, fontSize: '15px', lineHeight: 1.65, marginBottom: '28px' }}>
              Something went wrong or you cancelled the payment. Go back to try again — your items are still in the menu.
            </p>
            <a href="/" className="btn-primary" style={{ display: 'inline-flex', margin: '0 auto', gap: '8px' }}>
              <ArrowLeft size={16} /> Back to Menu
            </a>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
