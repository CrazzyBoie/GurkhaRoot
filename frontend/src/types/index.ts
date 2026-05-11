export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'inventory_manager' | 'super_admin';
  createdAt: string;
}

export interface Variant {
  id: string;
  productId: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  material: string;
  featured: boolean;
  newArrival: boolean;
  images: string[];
  variants: Variant[];
  rating?: number;
  reviewCount?: number;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  image: string;
  size: string;
  color: string;
  colorHex: string;
  price: number;
  quantity: number;
  stock: number;
}

export interface Address {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  guestEmail?: string;
  items: OrderItem[];
  address?: Address;
  shippingSnap: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  paymentMethod: 'stripe' | 'cod';
  status: OrderStatus;
  total: number;
  couponCode?: string;
  discount: number;
  giftWrap: boolean;
  giftNote?: string;
  stripePayId?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  user: { name: string };
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  usageLimit: number;
  usedCount: number;
  expiryDate: string;
  active: boolean;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  createdAt: string;
}

export interface Category {
  name: string;
  count: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ProductFilters {
  category?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  featured?: boolean;
  newArrival?: boolean;
}
