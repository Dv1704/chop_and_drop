'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, PlusCircle, Fire, Heart } from '@phosphor-icons/react';
import { categories, getItemsByCategory, getTopPicks } from '@/lib/menu-data';
import { MenuItem } from '@/types';
import ItemModal from './ItemModal';

function formatPrice(n: number) {
  return `₦${n.toLocaleString('en-NG')}`;
}

function MenuCard({ item, featured, onSelect }: { item: MenuItem; featured?: boolean; onSelect: (item: MenuItem) => void }) {
  return (
    <div
      className="card flex flex-col overflow-hidden"
      style={{
        transform: featured ? 'scale(1.04)' : undefined,
        borderTop: featured ? '3px solid var(--palm-oil)' : undefined,
      }}
    >
      {/* Food image */}
      <div style={{ position: 'relative', height: '210px', overflow: 'hidden', background: 'var(--warm-dark)' }}>
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="33vw"
            style={{ objectFit: 'cover', transition: 'transform 0.35s ease' }}
            className="menu-card-img"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--warm-dark), #3D2410)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--plantain-gold)', opacity: 0.2 }}>C&amp;D</span>
          </div>
        )}

        {/* Overlay on hover */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,16,8,0.45) 0%, transparent 60%)', pointerEvents: 'none' }} />

        {item.rating && item.rating >= 4.9 && (
          <span
            className="pill"
            style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--stew-red)', color: 'var(--ash-white)', fontSize: '10px', padding: '4px 10px' }}
          >
            <Fire size={11} weight="fill" /> Popular
          </span>
        )}
        <button
          aria-label={`Favourite ${item.name}`}
          style={{ position: 'absolute', top: '10px', right: '10px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(26,16,8,0.45)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash-white)' }}
        >
          <Heart size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-5 flex-1">
        {item.rating && (
          <div className="flex items-center gap-1">
            <Star size={13} weight="fill" style={{ color: 'var(--plantain-gold)' }} />
            <span style={{ fontFamily: 'var(--font-price)', fontSize: '12px', fontWeight: 700, color: 'var(--suya-smoke)' }}>
              {item.rating.toFixed(1)}
            </span>
          </div>
        )}

        <h3 style={{ fontWeight: 600, fontSize: '16px', color: 'var(--suya-smoke)', lineHeight: 1.3 }}>
          {item.name}
        </h3>
        <p
          style={{ fontSize: '13px', color: 'var(--suya-smoke)', opacity: 0.65, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {item.description}
        </p>

        {item.dietaryTags && item.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.dietaryTags.map((t) => (
              <span key={t} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(196,82,26,0.1)', color: 'var(--palm-oil)', fontWeight: 600 }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-5 pt-2">
        <span style={{ fontFamily: 'var(--font-price)', fontSize: '17px', fontWeight: 700, color: 'var(--palm-oil)' }}>
          {formatPrice(item.price)}
        </span>
        <button
          onClick={() => onSelect(item)}
          disabled={!item.isAvailable}
          aria-label={`Add ${item.name} to cart`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: 'var(--stew-red)',
            color: 'var(--ash-white)',
            border: 'none',
            borderRadius: '8px',
            cursor: item.isAvailable ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'background 0.2s',
          }}
        >
          <PlusCircle size={15} weight="bold" />
          Add
        </button>
      </div>
    </div>
  );
}

// Keeps the grid at full rows of 3 — trims any trailing 1-2 items that would
// otherwise leave an incomplete last row.
function fullRowsOfThree<T>(list: T[]): T[] {
  return list.slice(0, Math.floor(list.length / 3) * 3);
}

export default function MenuSection() {
  const [activeCategory, setActiveCategory] = useState<string | 'top'>('top');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const topPicks = getTopPicks();
  const items = fullRowsOfThree(activeCategory === 'top' ? topPicks : getItemsByCategory(activeCategory));

  const tabs = [{ id: 'top', name: 'Top Picks' }, ...categories];

  return (
    <>
      {/* Top Picks spotlight */}
      <section id="menu" style={{ background: 'var(--egusi-cream)' }} className="py-24">
        <div className="container">
          <div className="text-center mb-14">
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 40px)', color: 'var(--suya-smoke)' }}>
              Top Picks
            </h2>
            <p style={{ color: 'var(--suya-smoke)', opacity: 0.6, marginTop: '14px', fontSize: '16px' }}>
              Our mainstay — ordered the most, loved the hardest
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-5 lg:gap-8">
            {fullRowsOfThree(topPicks).slice(0, 6).map((item, i) => (
              <MenuCard key={item.id} item={item} featured={i === 1} onSelect={setSelectedItem} />
            ))}
          </div>
        </div>
      </section>

      {/* Full menu with category tabs */}
      <section id="order" style={{ background: 'var(--ash-white)' }} className="py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 40px)', color: 'var(--suya-smoke)' }}>
              Full Menu
            </h2>
            <p style={{ color: 'var(--suya-smoke)', opacity: 0.6, marginTop: '14px', fontSize: '16px' }}>
              Local · Continental · Snacks · Junk · Desserts · Drinks
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-3 justify-center mb-14 pb-1">
            {tabs.map((tab) => {
              const active = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '999px',
                    border: active ? 'none' : '2px solid rgba(26,16,8,0.15)',
                    background: active ? 'linear-gradient(90deg, #C4521A, #E8A020)' : 'transparent',
                    color: active ? 'var(--ash-white)' : 'var(--suya-smoke)',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-3 gap-3 sm:gap-5 lg:gap-8">
            {items.map((item, i) => (
              <MenuCard key={item.id} item={item} featured={activeCategory !== 'top' && i === 0} onSelect={setSelectedItem} />
            ))}
          </div>
        </div>
      </section>

      <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
}
