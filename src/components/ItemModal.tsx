'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Minus, Plus } from '@phosphor-icons/react';
import { useCart } from '@/context/CartContext';
import { MenuItem } from '@/types';

function formatPrice(n: number) {
  return `₦${n.toLocaleString('en-NG')}`;
}

interface Props {
  item: MenuItem | null;
  onClose: () => void;
}

export default function ItemModal({ item, onClose }: Props) {
  if (!item) return null;
  // Keyed by item.id so switching items remounts this subtree and resets qty,
  // instead of reaching for an effect to sync state we already own.
  return <ItemModalContent key={item.id} item={item} onClose={onClose} />;
}

function ItemModalContent({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);

  function handleAdd() {
    addItem(item, qty);
    onClose();
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(26,16,8,0.55)', zIndex: 110 }}
      />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          pointerEvents: 'none',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={item.name}
          style={{
            pointerEvents: 'auto',
            width: 'min(420px, 100%)',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'var(--ash-white)',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(26,16,8,0.35)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Image */}
          <div style={{ position: 'relative', height: '220px', flexShrink: 0, background: 'var(--warm-dark)', borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt={item.name} fill sizes="420px" style={{ objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--warm-dark), #3D2410)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--plantain-gold)', opacity: 0.2 }}>C&amp;D</span>
              </div>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--ash-white)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--suya-smoke)' }}
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: 'var(--suya-smoke)' }}>
              {item.name}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--suya-smoke)', opacity: 0.7, lineHeight: 1.5 }}>
              {item.description}
            </p>

            {item.dietaryTags && item.dietaryTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.dietaryTags.map((t) => (
                  <span key={t} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(196,82,26,0.1)', color: 'var(--palm-oil)', fontWeight: 600 }}>
                    {t}
                  </span>
                ))}
              </div>
            )}

            <span style={{ fontFamily: 'var(--font-price)', fontSize: '18px', fontWeight: 700, color: 'var(--palm-oil)', marginTop: '4px' }}>
              {formatPrice(item.price)}
            </span>

            {/* Quantity stepper */}
            <div className="flex items-center gap-4" style={{ marginTop: '8px' }}>
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
                style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1.5px solid rgba(196,82,26,0.3)', background: 'none', cursor: qty <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--palm-oil)', opacity: qty <= 1 ? 0.4 : 1 }}
              >
                <Minus size={16} weight="bold" />
              </button>
              <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700, fontSize: '16px', color: 'var(--suya-smoke)' }}>
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                aria-label="Increase quantity"
                style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1.5px solid rgba(196,82,26,0.3)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--palm-oil)' }}
              >
                <Plus size={16} weight="bold" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px 24px' }}>
            <button
              onClick={handleAdd}
              disabled={!item.isAvailable}
              className="btn-primary w-full justify-center"
              style={{ opacity: item.isAvailable ? 1 : 0.5, cursor: item.isAvailable ? 'pointer' : 'not-allowed' }}
            >
              {item.isAvailable ? `Add ${qty} for ${formatPrice(item.price * qty)}` : 'Currently unavailable'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
