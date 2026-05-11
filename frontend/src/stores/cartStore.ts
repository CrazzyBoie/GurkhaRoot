import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, Variant } from '@/types';

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  discount: number;
  giftWrap: boolean;
  giftNote: string;
  addItem: (product: Product, variant: Variant, quantity: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  setCoupon: (code: string | null, discount: number) => void;
  setGiftWrap: (enabled: boolean, note?: string) => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      discount: 0,
      giftWrap: false,
      giftNote: '',

      addItem: (product, variant, quantity) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.variantId === variant.id);
          
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.variantId === variant.id
                  ? { ...item, quantity: Math.min(item.quantity + quantity, variant.stock) }
                  : item
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                variantId: variant.id,
                name: product.name,
                image: product.images[0] || '',
                size: variant.size,
                color: variant.color,
                colorHex: variant.colorHex,
                price: product.price,
                quantity: Math.min(quantity, variant.stock),
                stock: variant.stock,
              },
            ],
          };
        });
      },

      removeItem: (variantId) => {
        set((state) => ({
          items: state.items.filter((item) => item.variantId !== variantId),
        }));
      },

      updateQuantity: (variantId, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.variantId === variantId
              ? { ...item, quantity: Math.min(Math.max(quantity, 1), item.stock) }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [], couponCode: null, discount: 0, giftWrap: false, giftNote: '' });
      },

      setCoupon: (code, discount) => {
        set({ couponCode: code, discount });
      },

      setGiftWrap: (enabled, note = '') => {
        set({ giftWrap: enabled, giftNote: note });
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        return Math.max(0, subtotal - get().discount);
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
