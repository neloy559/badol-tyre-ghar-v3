/**
 * Frontend Smoke Tests
 *
 * Purpose: Verify the app renders without crashing and
 * critical routes are accessible. These are Black Box tests —
 * we don't care about internals, just "does it work?"
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mock heavy context providers so smoke tests stay fast ──────
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, isAdmin: false }),
  AuthProvider: ({ children }) => children,
}));

// ── Mock lazy-loaded pages ──────────────────────────────────────
vi.mock('../pages/Home',     () => ({ default: () => <div data-testid="page-home">Home Page</div> }));
vi.mock('../pages/Catalog',  () => ({ default: () => <div data-testid="page-catalog">Catalog Page</div> }));
vi.mock('../pages/Login',    () => ({ default: () => <div data-testid="page-login">Login Page</div> }));
vi.mock('../pages/NotFound', () => ({ default: () => <div data-testid="page-notfound">404 Not Found</div> }));
vi.mock('../components/Layout', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom');
    return <div data-testid="layout"><Outlet /></div>;
  },
}));

import App from '../App';

// ── Helper: render app at a given route ────────────────────────
const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

// ── Smoke Tests ────────────────────────────────────────────────
describe('🔥 Frontend Smoke Tests', () => {

  it('renders without crashing', () => {
    const { container } = renderAt('/');
    expect(container).toBeTruthy();
  });

  it('Home page renders at /', async () => {
    renderAt('/');
    expect(await screen.findByTestId('page-home')).toBeInTheDocument();
  });

  it('Catalog page renders at /catalog', async () => {
    renderAt('/catalog');
    expect(await screen.findByTestId('page-catalog')).toBeInTheDocument();
  });

  it('Login page renders at /login', async () => {
    renderAt('/login');
    expect(await screen.findByTestId('page-login')).toBeInTheDocument();
  });

  it('Unknown route shows 404 page', async () => {
    renderAt('/this-does-not-exist');
    expect(await screen.findByTestId('page-notfound')).toBeInTheDocument();
  });

  it('Protected /profile redirects to /login when not authenticated', async () => {
    renderAt('/profile');
    // ProtectedRoute redirects unauthenticated users to /login
    expect(await screen.findByTestId('page-login')).toBeInTheDocument();
  });

});
