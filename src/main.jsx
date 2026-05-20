import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 1, // 1 minute stale time
      gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
      refetchOnWindowFocus: false, // Disable revalidation on window focus
      retry: 1,
    },
  },
});

// Use HashRouter for APKs/Capacitor to prevent routing issues with file protocols
const isAppEnvironment = typeof window !== 'undefined' && 
  (window.Capacitor !== undefined || 
   window.cordova !== undefined || 
   window.location.protocol === 'file:' || 
   window.location.protocol === 'capacitor:');

const Router = isAppEnvironment ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <Router>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </AuthProvider>
        </QueryClientProvider>
      </Router>
    </HelmetProvider>
  </StrictMode>
);
