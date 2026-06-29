export type CartStatus = 'active' | 'checkout' | 'completed';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';
export type PaymentStatus = 'pending' | 'captured' | 'refunded' | 'failed';
export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed';
export type PaymentProvider = 'paystack' | 'cash';
export type DeliveryProvider = 'in_house' | 'kwik' | 'gokada';
export type FulfillmentMode = 'delivery' | 'pickup';

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  rating?: number;
  imageUrl?: string;
  allergens?: string[];
  dietaryTags?: string[];
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  qty: number;
  unitPrice: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface Address {
  id: string;
  customerId: string;
  line1: string;
  city: string;
  postalCode?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}
