import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';

// Pages — lazy loaded
const Home      = lazy(() => import('./pages/Home'));
const Catalog   = lazy(() => import('./pages/Catalog'));
const Product   = lazy(() => import('./pages/Product'));
const Cart      = lazy(() => import('./pages/Cart'));
const Login     = lazy(() => import('./pages/Login'));
const Register  = lazy(() => import('./pages/Register'));
const Profile   = lazy(() => import('./pages/Profile'));
const Shops     = lazy(() => import('./pages/Shops'));
const Admin     = lazy(() => import('./pages/Admin'));
const NotFound  = lazy(() => import('./pages/NotFound'));

// Scroll Restoration
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

// Protected route wrapper
const ProtectedRoute = ({ children, requireAdmin }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="page-loader">Loading...</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <Suspense fallback={<div className="page-loader">Loading...</div>}>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index           element={<Home />} />
          <Route path="catalog"  element={<Catalog />} />
          <Route path="catalog/:slug" element={<Product />} />
          <Route path="shops"    element={<Shops />} />
          <Route path="login"    element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="cart"     element={<Cart />} />
          <Route path="profile"  element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="admin/*"  element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
          <Route path="*"        element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
