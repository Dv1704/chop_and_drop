'use client';

import { useCart } from '@/context/CartContext';
import CartSidebar from './CartSidebar';

const FREE_DELIVERY_THRESHOLD = 5000;

function formatPrice(n: number) {
  return `₦${n.toLocaleString('en-NG')}`;
}

export default function FloatingCart() {
  const { itemCount, subtotal, total, openCart } = useCart();
  const remaining = FREE_DELIVERY_THRESHOLD - subtotal;

  return (
    <>
      {itemCount > 0 && (
        <div
          className="lg:hidden"
          style={{
            position:   'fixed',
            left:       0,
            right:      0,
            bottom:     0,
            background: 'var(--ash-white)',
            boxShadow:  '0 -6px 24px rgba(26,16,8,0.14)',
            padding:    '12px 16px calc(16px + env(safe-area-inset-bottom))',
            zIndex:     70,
          }}
        >
          {remaining > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--suya-smoke)', opacity: 0.75, marginBottom: '6px' }}>
                Reach {formatPrice(FREE_DELIVERY_THRESHOLD)} for free delivery
              </p>
              <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(26,16,8,0.1)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%`,
                    background: 'var(--palm-oil)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )}

          <button
            onClick={openCart}
            className="btn-primary w-full justify-center"
            style={{ gap: '10px' }}
          >
            <span
              style={{
                background: 'rgba(255,255,255,0.25)',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 800,
              }}
            >
              {itemCount}
            </span>
            Go to cart &nbsp;&middot;&nbsp;
            <span style={{ fontFamily: 'var(--font-price)' }}>{formatPrice(total)}</span>
          </button>
        </div>
      )}

      <CartSidebar />
    </>
  );
}
