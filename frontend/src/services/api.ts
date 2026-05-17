import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  try {
    const keys = ['auth-storage', 'auth_store', 'user', 'token'];
    let token = null;
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          token = parsed?.state?.token || parsed?.token || parsed;
          if (typeof token === 'string' && token.startsWith('eyJ')) break;
        } catch {
          if (raw.startsWith('eyJ')) { token = raw; break; }
        }
      }
    }
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      const isTokenError =
        error.response?.data?.code === 'TOKEN_EXPIRED' ||
        error.response?.data?.message === 'Authentication required' ||
        error.response?.data?.message === 'Unauthorized';
      if (isTokenError) {
        originalRequest._retry = true;
        try {
          await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
          return api(originalRequest);
        } catch (refreshError) {
          try {
            const raw = localStorage.getItem('auth-storage');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.state) {
                parsed.state.token = null;
                parsed.state.user = null;
                parsed.state.isAuthenticated = false;
                localStorage.setItem('auth-storage', JSON.stringify(parsed));
              }
            }
          } catch {}
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: (token?: string) => api.get('/auth/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; password: string }) =>
    api.post('/auth/reset-password', data),
};

export const productsApi = {
  getProducts: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/products', { params }),
  getProduct: (id: string) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  createProduct: (data: FormData | Record<string, unknown>) => api.post('/products', data),
  updateProduct: (id: string, data: FormData | Record<string, unknown>) => api.put(`/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),
};

export const ordersApi = {
  createOrder: (data: unknown) => api.post('/orders', data),
  getMyOrders: (params?: { page?: number; limit?: number }) =>
    api.get('/orders/my', { params }),
  getOrder: (id: string) => api.get(`/orders/${id}`),
  getAllOrders: (params?: Record<string, string | number | undefined>) =>
    api.get('/orders', { params }),
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
  // ── Public guest order tracking (no auth required) ──────────────────────────
  trackOrder: (orderNumber: string, email: string) =>
    api.get('/orders/track', { params: { orderNumber, email } }),
};

export const userApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: { name?: string; email?: string; phone?: string }) =>
    api.put('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/users/me/change-password', data),
  getAddresses: () => api.get('/users/me/addresses'),
  addAddress: (data: unknown) => api.post('/users/me/addresses', data),
  updateAddress: (id: string, data: unknown) => api.put(`/users/me/addresses/${id}`, data),
  deleteAddress: (id: string) => api.delete(`/users/me/addresses/${id}`),
  getWishlist: () => api.get('/users/me/wishlist'),
  addToWishlist: (productId: string) => api.post(`/users/me/wishlist/${productId}`),
  removeFromWishlist: (productId: string) => api.delete(`/users/me/wishlist/${productId}`),
  getAllUsers: (params?: Record<string, string | number | undefined>) =>
    api.get('/users', { params }),
  updateUser: (id: string, data: { name?: string; email?: string; phone?: string; role?: string }) =>
    api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  adminSetPassword: (id: string, password: string) =>
    api.post(`/users/${id}/set-password`, { password }),
  createUser: (data: { name: string; email: string; phone?: string; role: string; password: string }) =>
    api.post('/users/admin/create', data),
};

export const couponsApi = {
  validate: (code: string, cartTotal: number) =>
    api.post('/coupons/validate', { code, cartTotal }),
  getCoupons: () => api.get('/coupons'),
  createCoupon: (data: unknown) => api.post('/coupons', data),
  updateCoupon: (id: string, data: unknown) => api.put(`/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete(`/coupons/${id}`),
};

export const paymentApi = {
  createIntent: (amount: number, orderId?: string) =>
    api.post('/payments/create-intent', { amount, orderId }),
  getStatus: (paymentIntentId: string) =>
    api.get(`/payments/status/${paymentIntentId}`),
  refund: (orderId: string) =>
    api.post('/payments/refund', { orderId }),
  // Call this after Stripe payment succeeds — writes stripePayId to Firestore
  // without depending on webhook timing
  confirm: (orderId: string, paymentIntentId: string) =>
    api.post('/payments/confirm', { orderId, paymentIntentId }),
};

export const reviewsApi = {
  getProductReviews: (productId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/reviews/${productId}`, { params }),
  createReview: (productId: string, data: { rating: number; comment: string }) =>
    api.post(`/reviews/${productId}`, data),
  updateReview: (id: string, data: { rating?: number; comment?: string }) =>
    api.put(`/reviews/${id}`, data),
  deleteReview: (id: string) => api.delete(`/reviews/${id}`),
};

// Public shipping (used by checkout)
export const shippingApi = {
  getCost: (country: string, method?: string) =>
    api.get('/shipping/cost', { params: { country, method } }),
  getMethods: (country: string) =>
    api.get('/shipping/methods', { params: { country } }),
};

// Admin shipping config
export const adminShippingApi = {
  // Countries
  getCountries: () => api.get('/shipping/admin/countries'),
  createCountry: (data: {
    name: string; code: string; baseCost: number;
    freeThreshold?: number | null; currency?: string; active?: boolean;
  }) => api.post('/shipping/admin/countries', data),
  updateCountry: (id: string, data: Partial<{
    name: string; baseCost: number;
    freeThreshold: number | null; currency: string; active: boolean;
  }>) => api.patch(`/shipping/admin/countries/${id}`, data),
  deleteCountry: (id: string) => api.delete(`/shipping/admin/countries/${id}`),
  // Methods
  getMethods: () => api.get('/shipping/admin/methods'),
  updateMethod: (id: string, data: Partial<{
    label: string; description: string; cost: number; active: boolean;
  }>) => api.patch(`/shipping/admin/methods/${id}`, data),

  getInternational: () => api.get('/shipping/admin/international'),
  updateInternational: (data: Partial<{
    label: string; description: string; cost: number; active: boolean;
  }>) => api.patch('/shipping/admin/international', data),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getSalesChart: (days?: number) => api.get('/admin/sales-chart', { params: { days } }),
  getLowStock: () => api.get('/admin/low-stock'),
  getRecentOrders: (limit?: number) => api.get('/admin/recent-orders', { params: { limit } }),
  updateUserRole: (id: string, role: string) =>
    api.patch(`/admin/users/${id}/role`, { role }),
  // Stock management
  getStockOverview: () => api.get('/admin/stock-overview'),
  updateDamagedStock: (variantId: string, damagedQty: number) =>
    api.patch(`/admin/variants/${variantId}/damaged`, { damagedQty }),
};

export default api;