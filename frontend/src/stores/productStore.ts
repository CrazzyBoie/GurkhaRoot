import { create } from 'zustand';
import { productsApi } from '@/services/api';
import type { Product, Category, Pagination, ProductFilters } from '@/types';

// ── Simple in-memory TTL cache (2 min) to avoid redundant Firestore fetches ──
const CACHE_TTL_MS = 2 * 60 * 1000;
const cache: Record<string, { data: unknown; ts: number }> = {};
function cacheGet<T>(key: string): T | null {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data as T;
  return null;
}
function cacheSet(key: string, data: unknown) {
  cache[key] = { data, ts: Date.now() };
}

interface ProductState {
  products: Product[];
  categories: Category[];
  featuredProducts: Product[];
  newArrivals: Product[];
  currentProduct: Product | null;
  pagination: Pagination | null;
  isLoading: boolean;
  isFeaturedLoading: boolean;
  isNewArrivalsLoading: boolean;
  isProductLoading: boolean;
  filters: ProductFilters;
  error: string | null;
  setFilters: (filters: ProductFilters) => void;
  fetchProducts: (filters?: ProductFilters, page?: number, limit?: number) => Promise<void>;
  fetchProduct: (id: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchFeaturedProducts: () => Promise<void>;
  fetchNewArrivals: () => Promise<void>;
  searchProducts: (query: string) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  featuredProducts: [],
  newArrivals: [],
  currentProduct: null,
  pagination: null,
  isLoading: false,
  isFeaturedLoading: false,
  isNewArrivalsLoading: false,
  isProductLoading: false,
  filters: {},
  error: null,

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  fetchProducts: async (filters = {}, page = 1, limit = 12) => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, string | number | boolean> = { page, limit };
      
      if (filters.category) params.category = filters.category;
      if (filters.size) params.size = filters.size;
      if (filters.color) params.color = filters.color;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.search) params.search = filters.search;
      if (filters.sort) params.sort = filters.sort;
      if (filters.featured) params.featured = true;
      if (filters.newArrival) params.newArrival = true;

      const response = await productsApi.getProducts(params);
      set({ 
        products: response.data.products,
        pagination: response.data.pagination,
      });
    } catch (error: any) {
      set({ error: error?.message || 'Failed to load products' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProduct: async (id) => {
    // Return from cache if still fresh
    const cached = cacheGet<Product>(`product:${id}`);
    if (cached) {
      set({ currentProduct: cached, isProductLoading: false });
      return;
    }
    set({ isProductLoading: true, error: null, currentProduct: null });
    try {
      const response = await productsApi.getProduct(id);
      cacheSet(`product:${id}`, response.data);
      set({ currentProduct: response.data });
    } catch (error: any) {
      set({ error: error?.message || 'Failed to load product' });
    } finally {
      set({ isProductLoading: false });
    }
  },

  fetchCategories: async () => {
    const cached = cacheGet<Category[]>('categories');
    if (cached) { set({ categories: cached }); return; }
    try {
      const response = await productsApi.getCategories();
      cacheSet('categories', response.data.categories);
      set({ categories: response.data.categories });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  },

  fetchFeaturedProducts: async () => {
    const cached = cacheGet<Product[]>('featured');
    if (cached) { set({ featuredProducts: cached, isFeaturedLoading: false }); return; }
    set({ isFeaturedLoading: true });
    try {
      const response = await productsApi.getProducts({ featured: true, limit: 8 });
      cacheSet('featured', response.data.products);
      set({ featuredProducts: response.data.products });
    } catch (error) {
      console.error('Failed to fetch featured products:', error);
    } finally {
      set({ isFeaturedLoading: false });
    }
  },

  fetchNewArrivals: async () => {
    const cached = cacheGet<Product[]>('newArrivals');
    if (cached) { set({ newArrivals: cached, isNewArrivalsLoading: false }); return; }
    set({ isNewArrivalsLoading: true });
    try {
      const response = await productsApi.getProducts({ newArrival: true, limit: 8 });
      cacheSet('newArrivals', response.data.products);
      set({ newArrivals: response.data.products });
    } catch (error) {
      console.error('Failed to fetch new arrivals:', error);
    } finally {
      set({ isNewArrivalsLoading: false });
    }
  },

  searchProducts: async (query) => {
    set({ isLoading: true });
    try {
      const response = await productsApi.getProducts({ search: query, limit: 12 });
      set({ 
        products: response.data.products,
        pagination: response.data.pagination,
      });
    } catch (error) {
      console.error('Failed to search products:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));