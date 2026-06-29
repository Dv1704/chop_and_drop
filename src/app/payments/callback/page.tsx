'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, SpinnerGap } from '@phosphor-icons/react';

function CallbackContent() {
  const params = useSearchParams();
  const reference = params.get('reference');
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [detail, setDetail] = useState<{ amount?: number; email?: string } | null>(null);

  useEffect(() => {
    if (!reference) { setStatus('failed'); return; }

    fetch(`/api/payments/verify?reference=${reference}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.paid) {
          setStatus('success');
          setDetail({ amount: data.amount, email: data.email });
        } else {
          setStatus('failed');
        }
      })
      .catch(() => setStatus('failed'));
  }, [reference]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--suya-smoke)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}
    >
      <div
        style={{
          background: 'var(--ash-white)',
          borderRadius: '20px',
          padding: '48px 40px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        }}
      >
        {status === 'loading' && (
          <>
            <SpinnerGap size={48} style={{ color: 'var(--palm-oil)', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ fontWeight: 600, color: 'var(--suya-smoke)' }}>Verifying your payment…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={64} weight="fill" style={{ color: '#22c55e', margin: '0 auto 20px' }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '28px', color: 'var(--suya-smoke)', marginBottom: '12px' }}>
              Order Confirmed!
            </h1>
            <p style={{ color: 'var(--suya-smoke)', opacity: 0.7, fontSize: '16px', lineHeight: 1.6, marginBottom: '8px' }}>
              {detail?.email && `Receipt sent to ${detail.email}.`}
            </p>
            {detail?.amount && (
              <p style={{ fontFamily: 'var(--font-price)', fontSize: '22px', fontWeight: 700, color: 'var(--palm-oil)', marginBottom: '32px' }}>
                ₦{detail.amount.toLocaleString('en-NG')} paid
              </p>
            )}
            <p style={{ color: 'var(--suya-smoke)', opacity: 0.6, fontSize: '14px', marginBottom: '32px' }}>
              Your food is being prepared. Track your order using the ID sent to your email.
            </p>
            <a href="/" className="btn-primary" style={{ display: 'inline-flex', margin: '0 auto' }}>
              Back to Menu
            </a>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle size={64} weight="fill" style={{ color: 'var(--stew-red)', margin: '0 auto 20px' }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '28px', color: 'var(--suya-smoke)', marginBottom: '12px' }}>
              Payment Failed
            </h1>
            <p style={{ color: 'var(--suya-smoke)', opacity: 0.7, fontSize: '16px', lineHeight: 1.6, marginBottom: '32px' }}>
              Something went wrong with your payment. Your cart is still saved — please try again.
            </p>
            <a href="/#order" className="btn-primary">
              Try Again
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
