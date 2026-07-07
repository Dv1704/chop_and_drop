'use client';

import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { MenuCategory } from '@/types';

function parseTags(input: string): string[] | undefined {
  const tags = input.split(',').map((t) => t.trim()).filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

const inputStyle = {
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1.5px solid rgba(26,16,8,0.15)',
  fontSize: '13px',
  fontFamily: 'inherit',
  width: '100%',
};

export default function AddItemForm({ categories, onAdded }: { categories: MenuCategory[]; onAdded: () => void }) {
  const [name, setName]               = useState('');
  const [price, setPrice]             = useState('');
  const [categoryId, setCategoryId]   = useState(categories[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl]       = useState('');
  const [allergens, setAllergens]     = useState('');
  const [dietaryTags, setDietaryTags] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/admin/menu', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        price: Number(price),
        categoryId,
        description: description || undefined,
        // Plain string URL for now — file upload isn't handled yet.
        imageUrl: imageUrl || undefined,
        allergens: parseTags(allergens),
        dietaryTags: parseTags(dietaryTags),
      }),
    });
    const data = await res.json();

    if (res.ok) {
      setName('');
      setPrice('');
      setDescription('');
      setImageUrl('');
      setAllergens('');
      setDietaryTags('');
      onAdded();
    } else {
      setError(data.error ?? 'Failed to add item');
    }
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'var(--ash-white)', borderRadius: '14px', padding: '20px 24px',
        boxShadow: 'var(--shadow-card)', marginBottom: '24px',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}
    >
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--suya-smoke)' }}>Add new item</h3>

      {error && <p style={{ color: 'var(--stew-red)', fontWeight: 600, fontSize: '13px' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
        <input style={inputStyle} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input style={inputStyle} placeholder="Price (₦)" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <select style={inputStyle} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <textarea
        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        style={inputStyle}
        placeholder="Image URL (optional — paste a link, upload isn't supported yet)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <input style={inputStyle} placeholder="Allergens, comma separated (optional)" value={allergens} onChange={(e) => setAllergens(e.target.value)} />
        <input style={inputStyle} placeholder="Dietary tags, comma separated (optional)" value={dietaryTags} onChange={(e) => setDietaryTags(e.target.value)} />
      </div>

      <button
        type="submit"
        disabled={submitting || !categoryId}
        className="btn-primary"
        style={{ fontSize: '13px', padding: '9px 18px', alignSelf: 'flex-start', opacity: submitting ? 0.6 : 1 }}
      >
        <Plus size={14} />
        {submitting ? 'Adding…' : 'Add item'}
      </button>
    </form>
  );
}
