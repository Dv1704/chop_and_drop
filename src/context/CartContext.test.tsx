import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CartProvider, useCart } from './CartContext';
import type { MenuItem, CartItem } from '@/types';

// ── Fixtures ────────────────────────────────────────────────────────────────
// Real MenuItem shape (from src/types/index.ts): has `categoryId`, NOT `category`.
const jollof: MenuItem = {
  id: 'l1',
  categoryId: 'local',
  name: 'Jollof Rice',
  description: 'Party jollof.',
  price: 4500,
  isAvailable: true,
};

const egusi: MenuItem = {
  id: 'l2',
  categoryId: 'local',
  name: 'Egusi Soup',
  description: 'Melon seed stew.',
  price: 5000,
  isAvailable: true,
};

const CART_KEY = 'cnd_cart_v1';

// ── Test harness ──────────────────────────────────────────────────────────────
// Grabs the live context value so tests can call actions via act() and read
// derived values off the DOM.
let cart: ReturnType<typeof useCart>;

function Probe() {
  cart = useCart();
  return (
    <div>
      <span data-testid="itemCount">{cart.itemCount}</span>
      <span data-testid="lines">{cart.items.length}</span>
      <span data-testid="subtotal">{cart.subtotal}</span>
      <span data-testid="deliveryFee">{cart.deliveryFee}</span>
      <span data-testid="total">{cart.total}</span>
      <span data-testid="mode">{cart.mode}</span>
      <span data-testid="address">{cart.deliveryAddress}</span>
      <span data-testid="names">{cart.items.map((i) => i.menuItem.name).join(',')}</span>
    </div>
  );
}

function renderCart() {
  return render(
    <CartProvider>
      <Probe />
    </CartProvider>
  );
}

const read = (id: string) => screen.getByTestId(id).textContent;

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('CartContext actions', () => {
  it('addItem adds a new line at qty 1, then increments the same menuItem.id instead of duplicating', () => {
    renderCart();
    act(() => cart.addItem(jollof));
    expect(read('lines')).toBe('1');
    expect(read('itemCount')).toBe('1');

    act(() => cart.addItem(jollof));
    expect(read('lines')).toBe('1'); // still one line
    expect(read('itemCount')).toBe('2'); // qty incremented
  });

  it('addItem(item, 3) adds with quantity 3', () => {
    renderCart();
    act(() => cart.addItem(jollof, 3));
    expect(read('lines')).toBe('1');
    expect(read('itemCount')).toBe('3');
  });

  it('removeItem(id) removes that line entirely', () => {
    renderCart();
    act(() => cart.addItem(jollof));
    const lineId = cart.items[0].id;
    act(() => cart.removeItem(lineId));
    expect(read('lines')).toBe('0');
  });

  it('updateQty(id, 0) removes the line', () => {
    renderCart();
    act(() => cart.addItem(jollof, 2));
    const lineId = cart.items[0].id;
    act(() => cart.updateQty(lineId, 0));
    expect(read('lines')).toBe('0');
  });

  it('updateQty(id, 5) sets quantity to 5 without duplicating', () => {
    renderCart();
    act(() => cart.addItem(jollof));
    const lineId = cart.items[0].id;
    act(() => cart.updateQty(lineId, 5));
    expect(read('lines')).toBe('1');
    expect(read('itemCount')).toBe('5');
  });

  it('subtotal sums unitPrice * qty across multiple lines', () => {
    renderCart();
    act(() => cart.addItem(jollof, 2)); // 4500 * 2 = 9000
    act(() => cart.addItem(egusi, 1)); // 5000 * 1 = 5000
    expect(read('subtotal')).toBe('14000');
  });

  it('clear() empties items but keeps mode and deliveryAddress', () => {
    renderCart();
    act(() => cart.addItem(jollof));
    act(() => cart.setMode('pickup'));
    act(() => cart.setDeliveryAddress('12 Allen Ave'));
    act(() => cart.clear());
    expect(read('lines')).toBe('0');
    expect(read('mode')).toBe('pickup');
    expect(read('address')).toBe('12 Allen Ave');
  });
});

describe('CartContext delivery fee + total', () => {
  it('deliveryFee is 1500 in delivery mode with a non-empty cart', () => {
    renderCart();
    act(() => cart.addItem(jollof)); // default mode is 'delivery'
    expect(read('mode')).toBe('delivery');
    expect(read('deliveryFee')).toBe('1500');
    expect(read('total')).toBe('6000'); // 4500 + 1500
  });

  it('deliveryFee is 0 in pickup mode', () => {
    renderCart();
    act(() => cart.addItem(jollof));
    act(() => cart.setMode('pickup'));
    expect(read('deliveryFee')).toBe('0');
    expect(read('total')).toBe('4500'); // subtotal only
  });

  it('deliveryFee is 0 for an empty cart even in delivery mode (subtotal is 0)', () => {
    renderCart();
    expect(read('mode')).toBe('delivery');
    expect(read('subtotal')).toBe('0');
    expect(read('deliveryFee')).toBe('0');
    expect(read('total')).toBe('0');
  });
});

describe('CartContext localStorage hydration', () => {
  it('does not crash on corrupted JSON; cart starts empty', async () => {
    localStorage.setItem(CART_KEY, 'not valid json{{{');
    renderCart();
    // hydration effect runs on mount; nothing to hydrate → stays empty
    await waitFor(() => expect(read('lines')).toBe('0'));
  });

  it('discards a persisted cart with a mismatched version; cart starts empty', async () => {
    const persistedItem: CartItem = {
      id: 'line-1',
      menuItem: jollof,
      qty: 2,
      unitPrice: jollof.price,
    };
    localStorage.setItem(
      CART_KEY,
      JSON.stringify({ items: [persistedItem], mode: 'delivery', deliveryAddress: '', version: 999 })
    );
    renderCart();
    await waitFor(() => expect(read('lines')).toBe('0'));
  });

  // Regression test: isValidMenuItem previously checked `m.category`, a field
  // that never exists on a real MenuItem (they carry `categoryId`), so every
  // valid persisted cart item failed validation and was silently dropped on
  // reload. Fixed to check `categoryId`. This test guards against a repeat.
  it('persists a valid cart item across reload (real MenuItem shape, categoryId not category)', async () => {
    const persistedItem: CartItem = {
      id: 'line-1',
      menuItem: jollof, // real shape: has categoryId, no category
      qty: 2,
      unitPrice: jollof.price,
    };
    localStorage.setItem(
      CART_KEY,
      JSON.stringify({ items: [persistedItem], mode: 'delivery', deliveryAddress: '', version: 1 })
    );

    renderCart();

    await waitFor(() => expect(read('lines')).toBe('1'));
    expect(read('names')).toBe('Jollof Rice');
    expect(read('itemCount')).toBe('2');
  });
});
