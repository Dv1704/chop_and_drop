'use client';

import { useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import CartPanelBody from './CartPanelBody';

// Desktop-only persistent cart panel — always visible once an item is added,
// no open/close step needed. `.container` reserves space for it via the
// `has-cart-dock` class toggled below (see globals.css).
export default function CartDock() {
  const { itemCount } = useCart();

  useEffect(() => {
    document.documentElement.classList.toggle('has-cart-dock', itemCount > 0);
  }, [itemCount]);

  useEffect(() => {
    return () => document.documentElement.classList.remove('has-cart-dock');
  }, []);

  if (itemCount === 0) return null;

  return (
    <aside
      className="hidden lg:flex"
      style={{
        position:      'fixed',
        top:           '88px',
        right:         '24px',
        width:         '380px',
        height:        'calc(100vh - 112px)',
        background:    'var(--ash-white)',
        borderRadius:  '16px',
        boxShadow:     '0 8px 40px rgba(26,16,8,0.18)',
        zIndex:        60,
        flexDirection: 'column',
        overflow:      'hidden',
      }}
    >
      <CartPanelBody />
    </aside>
  );
}
