'use client';

import { useCart } from '@/context/CartContext';
import CartPanelBody from './CartPanelBody';

// Mobile-only slide-in drawer. On desktop the cart lives in a persistent
// docked panel (CartDock) instead, so this stays hidden at the lg breakpoint.
export default function CartSidebar() {
  const { isOpen, closeCart } = useCart();

  return (
    <div className="lg:hidden">
      {isOpen && (
        <div
          onClick={closeCart}
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
          transform:  isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          boxShadow:  isOpen ? '-8px 0 40px rgba(196,82,26,0.15)' : 'none',
        }}
      >
        <CartPanelBody onClose={closeCart} />
      </aside>
    </div>
  );
}
