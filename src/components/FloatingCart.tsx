'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import CartSidebar from './CartSidebar';

export default function FloatingCart() {
  const [open, setOpen] = useState(false);
  const { itemCount, total } = useCart();

  return (
    <>
      {itemCount > 0 && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            bottom: '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--gradient-cta)',
            color: 'var(--ash-white)',
            border: 'none',
            borderRadius: '999px',
            padding: '14px 28px',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            boxShadow: '0 6px 28px rgba(196,82,26,0.40)',
            zIndex: 70,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              background: 'rgba(255,255,255,0.25)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 800,
            }}
          >
            {itemCount}
          </span>
          View Order &nbsp;&middot;&nbsp;
          <span style={{ fontFamily: 'var(--font-price)' }}>
            &#x20A6;{total.toLocaleString('en-NG')}
          </span>
        </button>
      )}

      <CartSidebar open={open} onClose={() => setOpen(false)} />
    </>
  );
}
