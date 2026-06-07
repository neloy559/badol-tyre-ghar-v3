import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import api from '../services/api';
import ConfirmDialog from '../components/ui/ConfirmDialog';

// ── Zod schema — mirrors the backend submitSchema ─────────────
const upgradeSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  ownerName:    z.string().min(2, 'Owner name must be at least 2 characters'),
  address:      z.string().min(5, 'Address must be at least 5 characters'),
});

// ── Upgrade Application Form ──────────────────────────────────
function UpgradeForm({ upgradeStatus, upgradeRejectionReason, onSuccess }) {
  const [apiError, setApiError] = useState('');
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(upgradeSchema) });

  const submitMutation = useMutation({
    mutationFn: (data) => api.post('/users/me/upgrade-request', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-upgrade-request'] });
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      setApiError(err.response?.data?.message || 'Failed to submit upgrade request.');
    },
  });

  const onSubmit = (data) => {
    setApiError('');
    submitMutation.mutate(data);
  };

  return (
    <div className="upgrade-form-container" data-testid="upgrade-form">
      {upgradeStatus === 'rejected' && upgradeRejectionReason && (
        <div className="upgrade-rejection-banner" data-testid="rejection-banner">
          <strong>Application Rejected:</strong> {upgradeRejectionReason}
        </div>
      )}

      <h3 className="upgrade-section-title">Become a Dealer</h3>
      <p className="upgrade-section-desc">
        Submit your business details to apply for wholesale dealer pricing.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="upgrade-form">
        <div className="upgrade-field">
          <label htmlFor="businessName" className="upgrade-label">Business Name</label>
          <input
            id="businessName"
            className={`upgrade-input${errors.businessName ? ' upgrade-input--error' : ''}`}
            placeholder="Your business / shop name"
            {...register('businessName')}
          />
          {errors.businessName && (
            <p className="upgrade-field-error" role="alert">{errors.businessName.message}</p>
          )}
        </div>

        <div className="upgrade-field">
          <label htmlFor="ownerName" className="upgrade-label">Owner Name</label>
          <input
            id="ownerName"
            className={`upgrade-input${errors.ownerName ? ' upgrade-input--error' : ''}`}
            placeholder="Full name of the business owner"
            {...register('ownerName')}
          />
          {errors.ownerName && (
            <p className="upgrade-field-error" role="alert">{errors.ownerName.message}</p>
          )}
        </div>

        <div className="upgrade-field">
          <label htmlFor="address" className="upgrade-label">Address</label>
          <input
            id="address"
            className={`upgrade-input${errors.address ? ' upgrade-input--error' : ''}`}
            placeholder="Business address"
            {...register('address')}
          />
          {errors.address && (
            <p className="upgrade-field-error" role="alert">{errors.address.message}</p>
          )}
        </div>

        {apiError && (
          <p className="upgrade-api-error" role="alert" data-testid="upgrade-api-error">
            {apiError}
          </p>
        )}

        <button
          type="submit"
          className="upgrade-submit-btn"
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 size={14} className="upgrade-spinner" />
              Submitting...
            </>
          ) : (
            'Apply for Dealer Account'
          )}
        </button>
      </form>
    </div>
  );
}

// ── Pending Panel ─────────────────────────────────────────────
function PendingPanel({ upgradeDetails }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const queryClient = useQueryClient();

  const withdrawMutation = useMutation({
    mutationFn: () => api.delete('/users/me/upgrade-request'),
    onSuccess: () => {
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['my-upgrade-request'] });
    },
    onError: (err) => {
      // Dialog stays open; error shows in panel
      setWithdrawError(err.response?.data?.message || 'Failed to withdraw request.');
    },
  });

  const appliedAtFormatted = upgradeDetails?.appliedAt
    ? new Date(upgradeDetails.appliedAt).toLocaleDateString()
    : '—';

  return (
    <div className="upgrade-pending-panel" data-testid="pending-panel">
      <h3 className="upgrade-section-title">Dealer Upgrade — Pending Review</h3>
      <p className="upgrade-pending-desc">
        Your application is under review. We'll notify you once a decision is made.
      </p>

      <dl className="upgrade-details-list">
        <div className="upgrade-details-row">
          <dt className="upgrade-details-label">Business Name</dt>
          <dd className="upgrade-details-value" data-testid="detail-businessName">
            {upgradeDetails?.businessName ?? '—'}
          </dd>
        </div>
        <div className="upgrade-details-row">
          <dt className="upgrade-details-label">Owner Name</dt>
          <dd className="upgrade-details-value" data-testid="detail-ownerName">
            {upgradeDetails?.ownerName ?? '—'}
          </dd>
        </div>
        <div className="upgrade-details-row">
          <dt className="upgrade-details-label">Address</dt>
          <dd className="upgrade-details-value" data-testid="detail-address">
            {upgradeDetails?.address ?? '—'}
          </dd>
        </div>
        <div className="upgrade-details-row">
          <dt className="upgrade-details-label">Applied On</dt>
          <dd className="upgrade-details-value" data-testid="detail-appliedAt">
            {appliedAtFormatted}
          </dd>
        </div>
      </dl>

      {withdrawError && (
        <p className="upgrade-api-error" role="alert" data-testid="withdraw-error">
          {withdrawError}
        </p>
      )}

      <button
        className="upgrade-withdraw-btn"
        onClick={() => setDialogOpen(true)}
        data-testid="withdraw-btn"
      >
        Withdraw Application
      </button>

      <ConfirmDialog
        open={dialogOpen}
        title="Withdraw Upgrade Request"
        message="Are you sure you want to withdraw your dealer upgrade application? You can re-apply later."
        confirmLabel="Withdraw"
        confirmVariant="danger"
        onConfirm={() => withdrawMutation.mutate()}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────
function UpgradeSkeleton() {
  return (
    <div className="upgrade-skeleton" data-testid="upgrade-skeleton">
      <div className="upgrade-skeleton-title" />
      <div className="upgrade-skeleton-field" />
      <div className="upgrade-skeleton-field" />
      <div className="upgrade-skeleton-field" />
      <div className="upgrade-skeleton-btn" />
    </div>
  );
}

// ── Main Section (exported) ───────────────────────────────────
export default function DealerUpgradeSection() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-upgrade-request'],
    queryFn: () =>
      api.get('/users/me/upgrade-request').then((r) => r.data.data),
  });

  if (isLoading) {
    return <UpgradeSkeleton />;
  }

  if (isError) {
    return (
      <div className="upgrade-error-state" data-testid="upgrade-error">
        <p className="upgrade-error-msg">Failed to load upgrade status.</p>
        <button
          className="upgrade-retry-btn"
          onClick={() => refetch()}
          data-testid="upgrade-retry-btn"
        >
          Retry
        </button>
      </div>
    );
  }

  const { upgradeStatus, upgradeRejectionReason, upgradeDetails } = data ?? {};

  if (upgradeStatus === 'approved') {
    return null;
  }

  if (upgradeStatus === 'pending') {
    return <PendingPanel upgradeDetails={upgradeDetails} />;
  }

  // 'none' or 'rejected'
  return (
    <UpgradeForm
      upgradeStatus={upgradeStatus}
      upgradeRejectionReason={upgradeRejectionReason}
    />
  );
}
