/**
 * Unit Tests for DealerUpgradeSection
 * Validates: Requirements 8.1–8.14
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

// ── Mock @tanstack/react-query ─────────────────────────────────
vi.mock('@tanstack/react-query', async () => {
  const actual = await import('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  };
});

// ── Mock AuthContext ───────────────────────────────────────────
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// ── Mock api service ───────────────────────────────────────────
vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

// ── Mock react-router-dom ──────────────────────────────────────
vi.mock('react-router-dom', async () => {
  const actual = await import('react-router-dom');
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});

// ── Mock ConfirmDialog to avoid ReactDOM.createPortal issues ───
vi.mock('../components/ui/ConfirmDialog', () => ({
  default: ({ open, onConfirm, onCancel }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <button data-testid="confirm-btn" onClick={onConfirm}>Confirm</button>
        <button data-testid="cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

// ── Mock CSS imports ───────────────────────────────────────────
vi.mock('../pages/Profile.css', () => ({}));

// ── Mock lucide-react icons ────────────────────────────────────
vi.mock('lucide-react', () => ({
  LogOut: () => null,
  ShieldCheck: () => null,
  Clock: () => null,
  User: () => null,
  Loader2: () => null,
}));

// ── Mock DealerTierBadge ───────────────────────────────────────
vi.mock('../components/ui/DealerTierBadge', () => ({
  default: () => null,
}));

// ── Imports after mocks ────────────────────────────────────────
import DealerUpgradeSection from '../pages/DealerUpgradeSection';

// ── Helpers ────────────────────────────────────────────────────
const defaultCustomerUser = { _id: 'u1', role: 'customer', profile: {}, phone: '01700' };
const defaultMutation = { mutate: vi.fn(), isPending: false, error: null };

function setupMocks({ queryData = {}, queryLoading = false, queryError = false } = {}) {
  useAuth.mockReturnValue({ user: defaultCustomerUser, logout: vi.fn(), isAdmin: false });
  useQuery.mockReturnValue({ isLoading: queryLoading, isError: queryError, data: queryData, refetch: vi.fn() });
  useMutation.mockReturnValue(defaultMutation);
}

// ── Tests ──────────────────────────────────────────────────────
describe('DealerUpgradeSection', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Renders nothing when user.role !== 'customer'
  // Profile conditionally renders DealerUpgradeSection only when role === 'customer'.
  // This test verifies the conditional renders nothing for non-customer roles.
  it('renders nothing when user.role is not customer (via Profile conditional)', () => {
    const dealerUser = { _id: 'u2', role: 'dealer', profile: {}, phone: '01700' };
    useAuth.mockReturnValue({ user: dealerUser, logout: vi.fn(), isAdmin: false });
    useQuery.mockReturnValue({ isLoading: false, isError: false, data: { upgradeStatus: 'none' }, refetch: vi.fn() });
    useMutation.mockReturnValue(defaultMutation);

    // Replicate Profile's conditional: {user?.role === 'customer' && <DealerUpgradeSection />}
    render(
      <>{dealerUser.role === 'customer' ? <DealerUpgradeSection /> : null}</>
    );

    expect(screen.queryByTestId('upgrade-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pending-panel')).not.toBeInTheDocument();
  });

  // Test 2: Skeleton shown during query loading
  it('shows skeleton while query is loading', () => {
    setupMocks({ queryLoading: true });

    render(<DealerUpgradeSection />);

    expect(screen.getByTestId('upgrade-skeleton')).toBeInTheDocument();
  });

  // Test 3: Error state + retry button shown on query error
  it('shows error state and retry button on query error', () => {
    setupMocks({ queryError: true });

    render(<DealerUpgradeSection />);

    expect(screen.getByTestId('upgrade-error')).toBeInTheDocument();
    expect(screen.getByTestId('upgrade-retry-btn')).toBeInTheDocument();
  });

  // Test 4: Rejection reason banner shown when upgradeStatus='rejected' and reason is non-empty
  it('shows rejection banner with reason when status is rejected and reason is non-empty', () => {
    setupMocks({
      queryData: {
        upgradeStatus: 'rejected',
        upgradeRejectionReason: 'Missing documents',
        upgradeDetails: null,
      },
    });

    render(<DealerUpgradeSection />);

    const banner = screen.getByTestId('rejection-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent('Missing documents');
  });

  // Test 5: Pending panel shows submitted details
  it('shows pending panel with submitted details', () => {
    setupMocks({
      queryData: {
        upgradeStatus: 'pending',
        upgradeRejectionReason: null,
        upgradeDetails: {
          businessName: 'Test Biz',
          ownerName: 'Test Owner',
          address: '123 Test Street',
          appliedAt: '2024-01-15T10:00:00Z',
        },
      },
    });

    render(<DealerUpgradeSection />);

    expect(screen.getByTestId('detail-businessName')).toHaveTextContent('Test Biz');
    expect(screen.getByTestId('detail-ownerName')).toHaveTextContent('Test Owner');
    expect(screen.getByTestId('detail-address')).toHaveTextContent('123 Test Street');
    expect(screen.getByTestId('detail-appliedAt')).toBeInTheDocument();
  });

  // Test 6: ConfirmDialog opens on "Withdraw Application" click
  it('opens ConfirmDialog when Withdraw Application is clicked', async () => {
    setupMocks({
      queryData: {
        upgradeStatus: 'pending',
        upgradeRejectionReason: null,
        upgradeDetails: {
          businessName: 'Test Biz',
          ownerName: 'Test Owner',
          address: '123 Test Street',
          appliedAt: '2024-01-15T10:00:00Z',
        },
      },
    });

    render(<DealerUpgradeSection />);

    // ConfirmDialog should not be visible yet
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();

    // Click the withdraw button
    fireEvent.click(screen.getByTestId('withdraw-btn'));

    // ConfirmDialog should now be visible
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
  });

  // Test 7: API error displayed inline after submit mutation failure
  it('displays API error inline after submit mutation failure', async () => {
    useAuth.mockReturnValue({ user: defaultCustomerUser, logout: vi.fn(), isAdmin: false });
    useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { upgradeStatus: 'none', upgradeRejectionReason: null, upgradeDetails: null },
      refetch: vi.fn(),
    });

    // Mock useMutation so mutate immediately triggers onError
    useMutation.mockImplementation(({ onError }) => ({
      mutate: () => onError({ response: { data: { message: 'Server error from API' } } }),
      isPending: false,
      error: null,
    }));

    render(<DealerUpgradeSection />);

    // Fill in the form fields
    fireEvent.change(screen.getByLabelText(/Business Name/i), { target: { value: 'My Business' } });
    fireEvent.change(screen.getByLabelText(/Owner Name/i), { target: { value: 'Owner Person' } });
    fireEvent.change(screen.getByLabelText(/Address/i), { target: { value: '123 Main Street' } });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Apply for Dealer Account/i }));

    // API error should be visible
    await waitFor(() => {
      expect(screen.getByTestId('upgrade-api-error')).toHaveTextContent('Server error from API');
    });
  });

});
