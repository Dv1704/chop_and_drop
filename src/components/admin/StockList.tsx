'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, CheckCircle, XCircle } from '@phosphor-icons/react';
import { MenuCategory, MenuItem } from '@/types';
import AddItemForm from './AddItemForm';

function formatPrice(n: number) {
  return `₦${n.toLocaleString('en-NG')}`;
}

export default function StockList() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems]           = useState<MenuItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [updating, setUpdating]     = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await fetch('/api/menu');
    const data = await res.json();
    if (res.ok) {
      setCategories(data.categories);
      setItems(data.items);
    } else {
      setError(data.error ?? 'Failed to load menu');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  async function toggleAvailability(item: MenuItem) {
    setUpdating(item.id);
    const res = await fetch('/api/admin/menu', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ itemId: item.id, isAvailable: !item.isAvailable }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i)));
    } else {
      setError('Failed to update item — please retry.');
    }
    setUpdating(null);
  }

  if (loading) {
    return <p style={{ textAlign: 'center', padding: '60px', color: 'var(--suya-smoke)', opacity: 0.45 }}>Loading menu…</p>;
  }

  // Nothing to show underneath (e.g. the initial menu fetch failed) — show
  // the error full-page instead of an empty list with a banner above it.
  if (error && items.length === 0) {
    return <p style={{ color: 'var(--stew-red)', fontWeight: 600, padding: '20px' }}>{error}</p>;
  }

  return (
    <div>
      {categories.length > 0 && <AddItemForm categories={categories} onAdded={fetchMenu} />}
      {error && <p style={{ color: 'var(--stew-red)', fontWeight: 600, marginBottom: '16px' }}>{error}</p>}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--ash-white)', borderRadius: '16px' }}>
          <Package size={40} style={{ color: 'var(--palm-oil)', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--suya-smoke)', opacity: 0.55 }}>No menu items found</p>
        </div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {categories.map((cat) => {
          const catItems = items.filter((i) => i.categoryId === cat.id);
          if (catItems.length === 0) return null;
          return (
            <div key={cat.id}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--suya-smoke)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '18px 0 8px' }}>
                {cat.name}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--ash-white)', borderRadius: '12px', padding: '14px 20px',
                      boxShadow: 'var(--shadow-card)', opacity: item.isAvailable ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--suya-smoke)' }}>{item.name}</span>
                      <span style={{ fontSize: '13px', color: 'var(--palm-oil)', fontWeight: 700 }}>{formatPrice(item.price)}</span>
                      <span
                        style={{
                          fontSize: '11px', padding: '2px 10px', borderRadius: '999px', fontWeight: 700,
                          background: item.isAvailable ? '#D4EDDA' : '#F8D7DA',
                          color: item.isAvailable ? '#155724' : '#721C24',
                        }}
                      >
                        {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleAvailability(item)}
                      disabled={updating === item.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600,
                        padding: '7px 16px', borderRadius: '8px', cursor: 'pointer',
                        border: item.isAvailable ? '1.5px solid var(--stew-red)' : '1.5px solid #25a244',
                        background: 'none',
                        color: item.isAvailable ? 'var(--stew-red)' : '#25a244',
                        opacity: updating === item.id ? 0.6 : 1,
                      }}
                    >
                      {item.isAvailable ? <XCircle size={13} /> : <CheckCircle size={13} />}
                      {updating === item.id ? 'Updating…' : item.isAvailable ? 'Mark unavailable' : 'Mark available'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
