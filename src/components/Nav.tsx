'use client';

import { useState } from 'react';
import { Motorcycle, ShoppingCartSimple, List, X, MagnifyingGlass } from '@phosphor-icons/react';
import { useCart } from '@/context/CartContext';

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount } = useCart();

  const links = [
    { label: 'Menu',     href: '#menu' },
    { label: 'Order',    href: '#order' },
    { label: 'Delivery', href: '#delivery' },
    { label: 'About',    href: '#about' },
    { label: 'Contact',  href: '#contact' },
  ];

  return (
    <>
      {/* Delivery strip */}
      <div style={{ background: 'var(--stew-red)', color: 'var(--ash-white)' }}
        className="text-center py-2 text-xs font-semibold tracking-wide">
        <Motorcycle size={14} weight="fill" className="inline mr-1.5 align-middle" />
        Free delivery on orders above &#x20A6;5,000 &nbsp;·&nbsp; Lagos Island · Mainland · Abuja
      </div>

      {/* Main nav */}
      <nav
        className="sticky top-0 z-50"
        style={{ background: 'var(--suya-smoke)', borderBottom: '1px solid rgba(250,246,240,0.08)' }}
      >
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex flex-col leading-none">
            <span style={{ color: 'var(--plantain-gold)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px' }}>
              CHOP
            </span>
            <span style={{ color: 'var(--ash-white)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '12px', letterSpacing: '0.15em' }}>
              &amp; DROP
            </span>
          </a>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-8 list-none">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  style={{ color: 'var(--ash-white)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
                  className="nav-link hover:text-palm-oil transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--palm-oil)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ash-white)')}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              aria-label="Search"
              style={{ color: 'var(--ash-white)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
            >
              <MagnifyingGlass size={20} />
            </button>

            <a href="#order" className="relative" style={{ color: 'var(--ash-white)', textDecoration: 'none', padding: '6px' }}>
              <ShoppingCartSimple size={22} />
              {itemCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                  style={{ background: 'var(--palm-oil)', color: 'var(--ash-white)' }}
                >
                  {itemCount}
                </span>
              )}
            </a>

            <a href="#order" className="btn-primary hidden md:inline-flex text-sm px-5 py-2.5">
              Order Now
            </a>

            {/* Mobile hamburger */}
            <button
              className="md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ color: 'var(--ash-white)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} /> : <List size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div style={{ background: 'var(--warm-dark)', borderTop: '1px solid rgba(250,246,240,0.08)' }}>
            <ul className="container py-4 flex flex-col gap-1 list-none">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    style={{ color: 'var(--ash-white)', textDecoration: 'none', display: 'block', padding: '12px 0', fontSize: '16px', fontWeight: 500, borderBottom: '1px solid rgba(250,246,240,0.06)' }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li className="pt-3">
                <a href="#order" onClick={() => setMenuOpen(false)} className="btn-primary w-full justify-center">
                  Order Now
                </a>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </>
  );
}
