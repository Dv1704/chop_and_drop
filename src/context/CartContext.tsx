'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { CartItem, MenuItem, FulfillmentMode } from '@/types';

interface CartState {
  items: CartItem[];
  mode: FulfillmentMode;
  deliveryAddress: string;
}

type CartAction =
  | { type: 'ADD_ITEM'; item: MenuItem }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'UPDATE_QTY'; id: string; qty: number }
  | { type: 'CLEAR' }
  | { type: 'SET_MODE'; mode: FulfillmentMode }
  | { type: 'SET_ADDRESS'; address: string };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i.menuItem.id === action.item.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.menuItem.id === action.item.id ? { ...i, qty: i.qty + 1 } : i
          ),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          {
            id: crypto.randomUUID(),
            menuItem: action.item,
            qty: 1,
            unitPrice: action.item.price,
          },
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

const DELIVERY_FEE = 1500;

interface CartContextValue {
  items: CartItem[];
  mode: FulfillmentMode;
  deliveryAddress: string;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  addItem: (item: MenuItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  setMode: (mode: FulfillmentMode) => void;
  setDeliveryAddress: (address: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    mode: 'delivery',
    deliveryAddress: '',
  });

  const subtotal = state.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const deliveryFee = state.mode === 'delivery' && subtotal > 0 ? DELIVERY_FEE : 0;

  const value: CartContextValue = {
    items: state.items,
    mode: state.mode,
    deliveryAddress: state.deliveryAddress,
    itemCount: state.items.reduce((n, i) => n + i.qty, 0),
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    addItem: (item) => dispatch({ type: 'ADD_ITEM', item }),
    removeItem: (id) => dispatch({ type: 'REMOVE_ITEM', id }),
    updateQty: (id, qty) => dispatch({ type: 'UPDATE_QTY', id, qty }),
    clear: () => dispatch({ type: 'CLEAR' }),
    setMode: (mode) => dispatch({ type: 'SET_MODE', mode }),
    setDeliveryAddress: (address) => dispatch({ type: 'SET_ADDRESS', address }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
