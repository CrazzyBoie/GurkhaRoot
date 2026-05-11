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
import './App.css';

// Scrolls to top on every route change.
// Temporarily disables css scroll-behavior:smooth on <html> so the jump
// is instant — otherwise the browser animates the scroll across pages.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const html = document.documentElement;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    // Re-enable smooth scrolling after the jump
    requestAnimationFrame(() => {
      html.style.scrollBehavior = '';
    });
  }, [pathname]);
  return null;
}

// Lazy-load heavy pages so the initial bundle stays small
const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })));
const Admin = lazy(() => import('@/pages/Admin').then(m => ({ default: m.Admin })));

// Spinner shown while lazy pages load
function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
      <div className="w-8 h-8 border-4 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Redirects unauthenticated users to /login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  // While the auth state is being restored from cookies/storage, show spinner
  if (isLoading) return <PageSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// Redirects non-admin users away from admin pages
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) return <PageSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'super_admin' && user?.role !== 'inventory_manager') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { fetchUser } = useAuthStore();

  // Restore auth state on every page load / refresh
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
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />

            {/* Checkout — accessible to guests AND logged-in users.
                Guest flow handled inside <Checkout /> itself. */}
            <Route path="/checkout" element={<Checkout />} />
          </Route>

          {/* ── Auth routes (no layout) ── */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Handles the redirect back from Google OAuth */}
          <Route path="/auth/callback" element={<GoogleCallback />} />

          {/* ── Protected routes (must be logged in) ── */}
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

          {/* ── Admin routes (must be admin/inventory_manager) ── */}
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
              path="/admin/*"
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