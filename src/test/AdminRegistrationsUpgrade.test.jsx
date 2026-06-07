/**
 * Unit Tests for AdminRegistrations — Upgrade Requests tab
 * Validates: Requirements 9.5, 9.6, 9.10, 9.11
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

// ── Mock api service ───────────────────────────────────────────
vi.mock('../services/api', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

// ── Mock ConfirmDialog ─────────────────────────────────────────
vi.mock('../components/ui/ConfirmDialog', () => ({
  default: ({ open, onConfirm, onCancel }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

// ── Mock CSS module ────────────────────────────────────────────
vi.mock('../pages/admin/AdminRegistrations.module.css', () => ({ default: {} }));

// ── Mock lucide-react icons ────────────────────────────────────
vi.mock('lucide-react', () => ({
  Loader2: () => null,
  CheckCircle: () => null,
  XCircle: () => null,
}));

// ── Import component (after mocks) ────────────────────────────
import AdminRegistrations from '../pages/admin/AdminRegistrations';

// ── Shared mock data ──────────────────────────────────────────
const mockUser = {
  _id: 'user-001',
  phone: '01700000001',
  profile: { name: 'Test User' },
  upgradeDetails: {
    businessName: 'Test Business',
    ownerName: 'Test Owner',
    address: '123 Test Street',
    appliedAt: '2024-01-15T10:00:00Z',
  },
};

const defaultMutation = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
};

/**
 * Sets up useQuery mock with per-key responses.
 * @param {object} overrides — keys: 'upgrade-requests-count', 'upgrade-requests', 'dealer-registrations'
 */
function setupUseQuery(overrides = {}) {
  useQuery.mockImplementation(({ queryKey }) => {
    const key = queryKey[0];

    if (key === 'upgrade-requests-count') {
      return {
        data: overrides['upgrade-requests-count'] ?? { total: 0 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        ...overrides['upgrade-requests-count-extra'],
      };
    }

    if (key === 'upgrade-requests') {
      return {
        data: overrides['upgrade-requests'] ?? { users: [], total: 0, page: 1, limit: 20 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        ...overrides['upgrade-requests-extra'],
      };
    }

    // dealer-registrations (default)
    return {
      data: overrides['dealer-registrations'] ?? { dealers: [], total: 0, limit: 20 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      ...overrides['dealer-registrations-extra'],
    };
  });
}

// ── Tests ─────────────────────────────────────────────────────
describe('AdminRegistrations — Upgrade Requests tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMutation.mockReturnValue(defaultMutation);
  });

  /**
   * Test 1: Badge count reflects `total` from count query
   * Validates: Requirement 9.10
   */
  it('badge count reflects total from count query', () => {
    setupUseQuery({
      'upgrade-requests-count': { total: 5 },
      'dealer-registrations': { dealers: [], total: 0, limit: 20 },
    });

    render(<AdminRegistrations />);

    const badge = screen.getByTestId('upgrade-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('5');
  });

  /**
   * Test 2: Empty state "No pending upgrade requests." when list is empty
   * Validates: Requirement 9.5
   */
  it('shows empty state message when upgrade list is empty', async () => {
    setupUseQuery({
      'upgrade-requests-count': { total: 0 },
      'upgrade-requests': { users: [], total: 0, page: 1, limit: 20 },
      'dealer-registrations': { dealers: [], total: 0, limit: 20 },
    });

    render(<AdminRegistrations />);

    // Click the "Upgrade Requests" tab
    fireEvent.click(screen.getByTestId('upgrade-tab'));

    await waitFor(() => {
      const emptyEl = screen.getByTestId('upgrade-empty');
      expect(emptyEl).toBeInTheDocument();
      expect(emptyEl).toHaveTextContent('No pending upgrade requests.');
    });
  });

  /**
   * Test 3: Pagination hidden when total ≤ 20
   * Validates: Requirement 9.11
   */
  it('does not render pagination controls when total is 15', async () => {
    setupUseQuery({
      'upgrade-requests-count': { total: 15 },
      'upgrade-requests': { users: [mockUser], total: 15, page: 1, limit: 20 },
      'dealer-registrations': { dealers: [], total: 0, limit: 20 },
    });

    render(<AdminRegistrations />);

    fireEvent.click(screen.getByTestId('upgrade-tab'));

    await waitFor(() => {
      expect(screen.queryByTestId('upgrade-pagination')).not.toBeInTheDocument();
    });
  });

  /**
   * Test 4: profile.name hidden when absent from API response
   * Validates: Requirement 9.6
   */
  it('does not render profile name field when profile.name is absent', async () => {
    const userWithoutName = {
      _id: 'user-002',
      phone: '01700000002',
      profile: {}, // no name
      upgradeDetails: {
        businessName: 'Biz',
        ownerName: 'Owner',
        address: 'Address',
        appliedAt: '2024-01-15T10:00:00Z',
      },
    };

    setupUseQuery({
      'upgrade-requests-count': { total: 1 },
      'upgrade-requests': { users: [userWithoutName], total: 1, page: 1, limit: 20 },
      'dealer-registrations': { dealers: [], total: 0, limit: 20 },
    });

    render(<AdminRegistrations />);

    fireEvent.click(screen.getByTestId('upgrade-tab'));

    await waitFor(() => {
      expect(screen.queryByTestId('card-profile-name')).not.toBeInTheDocument();
    });
  });
});
