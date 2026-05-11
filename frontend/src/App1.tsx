import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
  OrderConfirmation 
} from '@/pages';
import './App.css';

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
      <Routes>
        {/* Public routes with layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
        </Route>

        {/* Auth routes without layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route element={<Layout />}>
          <Route 
            path="/checkout" 
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            } 
          />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
