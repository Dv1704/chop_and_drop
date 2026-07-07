'use client';

import { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';
import { CartItem, MenuItem, FulfillmentMode } from '@/types';

// ── Persistence ───────────────────────────────────────────────────────────────
// Cart is stored in localStorage under this key.
// Bump CART_VERSION whenever CartItem or CartState shape changes —
// stale entries are silently discarded.
const CART_KEY     = 'cnd_cart_v1';
const CART_VERSION = 1;

const DEFAULT_STATE: CartState = { items: [], mode: 'delivery', deliveryAddress: '' };

// ── Shape validators (prevents corrupted / tampered localStorage crashing the app)
function isValidMenuItem(v: unknown): v is MenuItem {
  if (!v || typeof v !== 'object') return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.id         === 'string' && m.id.length > 0 &&
    typeof m.name       === 'string' && m.name.length > 0 &&
    typeof m.price      === 'number' && m.price >= 0 &&
    typeof m.categoryId === 'string'
  );
}

function isValidCartItem(v: unknown): v is CartItem {
  if (!v || typeof v !== 'object') return false;
  const i = v as Record<string, unknown>;
  return (
    typeof i.id        === 'string'  && i.id.length > 0 &&
    typeof i.qty       === 'number'  && i.qty > 0 && i.qty <= 99 &&
    typeof i.unitPrice === 'number'  && i.unitPrice >= 0 &&
    isValidMenuItem(i.menuItem)
  );
}

function loadFromStorage(): CartState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed: Record<string, unknown> = JSON.parse(raw);

    // Version gate — rejects data from older schemas
    if (parsed.version !== CART_VERSION) return DEFAULT_STATE;

    const items = Array.isArray(parsed.items)
      ? parsed.items.filter(isValidCartItem)
      : [];

    return {
      items,
      mode:            parsed.mode === 'pickup' ? 'pickup' : 'delivery',
      deliveryAddress: typeof parsed.deliveryAddress === 'string'
        ? parsed.deliveryAddress.slice(0, 500)
        : '',
    };
  } catch {
    // Corrupt JSON — discard silently
    return DEFAULT_STATE;
  }
}

function saveToStorage(state: CartState) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify({ ...state, version: CART_VERSION }));
  } catch {
    // localStorage full or blocked (private browsing with strict settings) — ignore
  }
}

// ── State + Actions ───────────────────────────────────────────────────────────

interface CartState {
  items:           CartItem[];
  mode:            FulfillmentMode;
  deliveryAddress: string;
}

type CartAction =
  | { type: 'HYDRATE';      state: CartState }
  | { type: 'ADD_ITEM';     item: MenuItem; qty?: number }
  | { type: 'REMOVE_ITEM';  id: string }
  | { type: 'UPDATE_QTY';   id: string; qty: number }
  | { type: 'CLEAR' }
  | { type: 'SET_MODE';     mode: FulfillmentMode }
  | { type: 'SET_ADDRESS';  address: string };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {

    case 'HYDRATE':
      return action.state;

    case 'ADD_ITEM': {
      const qty = action.qty ?? 1;
      const existing = state.items.find((i) => i.menuItem.id === action.item.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.menuItem.id === action.item.id ? { ...i, qty: i.qty + qty } : i
          ),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          { id: crypto.randomUUID(), menuItem: action.item, qty, unitPrice: action.item.price },
        ],
      };
    }

    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };

    case 'UPDATE_QTY':
      return {
        ...state,
        items: action.qty <= 0
          ? state.items.filter((i) => i.id !== action.id)
          : state.items.map((i) => (i.id === action.id ? { ...i, qty: action.qty } : i)),
      };

    case 'CLEAR':
      return { ...state, items: [] };

    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'SET_ADDRESS':
      return { ...state, deliveryAddress: action.address };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface CartContextValue {
  items:              CartItem[];
  mode:               FulfillmentMode;
  deliveryAddress:    string;
  itemCount:          number;
  subtotal:           number;
  deliveryFee:        number;
  total:              number;
  isOpen:             boolean;
  addItem:            (item: MenuItem, qty?: number) => void;
  removeItem:         (id: string) => void;
  updateQty:          (id: string, qty: number) => void;
  clear:              () => void;
  setMode:            (mode: FulfillmentMode) => void;
  setDeliveryAddress: (address: string) => void;
  openCart:           () => void;
  closeCart:          () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const DELIVERY_FEE = 1500;

export function CartProvider({ children }: { children: ReactNode }) {
  // Start with DEFAULT_STATE on first render (SSR-safe), then hydrate from
  // localStorage in the effect below. Two-phase init avoids hydration mismatch.
  const [state, dispatch] = useReducer(cartReducer, DEFAULT_STATE);
  const [isOpen, setIsOpen] = useState(false);

  // Phase 1 — hydrate from localStorage after first mount
  useEffect(() => {
    const persisted = loadFromStorage();
    if (persisted.items.length > 0 || persisted.mode !== 'delivery') {
      dispatch({ type: 'HYDRATE', state: persisted });
    }
  }, []);

  // Phase 2 — persist every state change
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const subtotal    = state.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const deliveryFee = state.mode === 'delivery' && subtotal > 0 ? DELIVERY_FEE : 0;

  const value: CartContextValue = {
    items:           state.items,
    mode:            state.mode,
    deliveryAddress: state.deliveryAddress,
    itemCount:       state.items.reduce((n, i) => n + i.qty, 0),
    subtotal,
    deliveryFee,
    total:           subtotal + deliveryFee,
    isOpen,
    // Adding an item just updates the cart in place (docked panel on desktop,
    // bottom bar on mobile) — it no longer forces the drawer open, since that
    // interrupted browsing when adding several items in a row.
    addItem:            (item, qty = 1) => dispatch({ type: 'ADD_ITEM', item, qty }),
    removeItem:         (id)      => dispatch({ type: 'REMOVE_ITEM', id }),
    updateQty:          (id, qty) => dispatch({ type: 'UPDATE_QTY',  id, qty }),
    clear:              ()        => dispatch({ type: 'CLEAR' }),
    setMode:            (mode)    => dispatch({ type: 'SET_MODE',    mode }),
    setDeliveryAddress: (address) => dispatch({ type: 'SET_ADDRESS', address }),
    openCart:           () => setIsOpen(true),
    closeCart:          () => setIsOpen(false),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
