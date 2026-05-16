import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { Layout } from '@/components/layout/Layout';
import {
  Home,
  Shop,
  ProductDetail,
  Cart,
  Checkout,
  Login,
  Register,
  OrderConfirmation,
  GoogleCallback,
} from '@/pages';
import { TrackOrder } from '@/pages/TrackOrder'; // ← new import
import './App.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const html = document.documentElement;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      html.style.scrollBehavior = '';
    });
  }, [pathname]);
  return null;
}

const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })));
const Admin = lazy(() => import('@/pages/Admin').then(m => ({ default: m.Admin })));

function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
      <div className="w-8 h-8 border-4 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'super_admin' && user?.role !== 'inventory_manager') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          {/* ── Public routes (with layout) ── */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />

            {/* ── Shop clean routes ── */}
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/page/:page" element={<Shop />} />
            <Route path="/shop/category/:name" element={<Shop />} />
            <Route path="/shop/category/:name/page/:page" element={<Shop />} />
            <Route path="/featured" element={<Shop />} />
            <Route path="/featured/page/:page" element={<Shop />} />
            <Route path="/new-arrivals" element={<Shop />} />
            <Route path="/new-arrivals/page/:page" element={<Shop />} />
            <Route path="/search/:query" element={<Shop />} />
            <Route path="/search/:query/page/:page" element={<Shop />} />

            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />

            {/* ── Guest order tracking ── */}
            <Route path="/track-order" element={<TrackOrder />} />
          </Route>

          {/* ── Auth routes (no layout) ── */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<GoogleCallback />} />

          {/* ── Protected routes ── */}
          <Route element={<Layout />}>
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* ── Admin routes ── */}
          <Route element={<Layout />}>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/:tab"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/:tab/:id"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
          </Route>

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;