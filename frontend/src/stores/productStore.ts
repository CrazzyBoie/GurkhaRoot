import { create } from 'zustand';
import { productsApi } from '@/services/api';
import type { Product, Category, Pagination, ProductFilters } from '@/types';

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
    set({ isProductLoading: true, error: null, currentProduct: null });
    try {
      const response = await productsApi.getProduct(id);
      set({ currentProduct: response.data });
    } catch (error: any) {
      set({ error: error?.message || 'Failed to load product' });
    } finally {
      set({ isProductLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const response = await productsApi.getCategories();
      set({ categories: response.data.categories });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  },

  fetchFeaturedProducts: async () => {
    set({ isFeaturedLoading: true });
    try {
      const response = await productsApi.getProducts({ featured: true, limit: 8 });
      set({ featuredProducts: response.data.products });
    } catch (error) {
      console.error('Failed to fetch featured products:', error);
    } finally {
      set({ isFeaturedLoading: false });
    }
  },

  fetchNewArrivals: async () => {
    set({ isNewArrivalsLoading: true });
    try {
      const response = await productsApi.getProducts({ newArrival: true, limit: 8 });
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