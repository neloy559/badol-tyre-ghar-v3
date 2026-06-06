import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import styles from './AdminRegistrations.module.css';

const STATUS_TABS = ['pending', 'approved', 'rejected'];

export default function AdminRegistrations() {
  const queryClient = useQueryClient();
  const [status, setStatus]       = useState('pending');
  const [page, setPage]           = useState(1);
  const [dialog, setDialog]       = useState({ open: false, dealerId: null });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dealer-registrations', { status, page }],
    queryFn: () =>
      api.get('/admin/dealers/registrations', { params: { status, page, limit: 20 } })
         .then(r => r.data.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/dealers/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dealer-registrations'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejectionReason }) =>
      api.patch(`/admin/dealers/${id}/reject`, { rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealer-registrations'] });
      setDialog({ open: false, dealerId: null });
    },
  });

  const tierMutation = useMutation({
    mutationFn: ({ id, tier }) => api.patch(`/admin/dealers/${id}/tier`, { tier }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dealer-registrations'] }),
  });

  const handleTabChange = (s) => {
    setStatus(s);
    setPage(1);
  };

  // ── Skeleton ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.section}>
        <h2 className={styles.title}>Dealer Registrations</h2>
        <div className={styles.skeleton}>
          {[1,2,3,4,5].map(i => <div key={i} className={styles.skeletonRow} />)}
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className={styles.section}>
        <h2 className={styles.title}>Dealer Registrations</h2>
        <div className={styles.errorState}>
          <p>Failed to load registrations.</p>
          <button onClick={() => refetch()} className={styles.retryBtn}>Retry</button>
        </div>
      </div>
    );
  }

  const dealers    = data?.dealers    ?? [];
  const total      = data?.total      ?? 0;
  const limit      = data?.limit      ?? 20;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Dealer Registrations</h2>

      {/* Status Tabs */}
      <div className={styles.tabs}>
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => handleTabChange(s)}
            className={`${styles.tab} ${status === s ? styles.tabActive : ''}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'pending' && total > 0 && status === 'pending' && (
              <span className={styles.tabBadge}>{total}</span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {dealers.length === 0 && (
        <div className={styles.emptyState}>
          <p>No {status} registrations.</p>
        </div>
      )}

      {/* Dealer Cards */}
      <div className={styles.grid}>
        {dealers.map(dealer => (
          <div key={dealer._id} className={styles.card}>
            {/* Info */}
            <div className={styles.cardInfo}>
              <div className={styles.cardHeader}>
                <h3 className={styles.dealerName}>{dealer.profile?.name ?? 'Unknown'}</h3>
                <span className={`${styles.statusTag} ${styles[`status_${dealer.registrationStatus}`]}`}>
                  {dealer.registrationStatus}
                </span>
              </div>
              <p className={styles.shopName}>{dealer.profile?.shopName}</p>
              <p className={styles.detail}><strong>Phone:</strong> {dealer.phone}</p>
              {dealer.profile?.address && (
                <p className={styles.detail}><strong>Address:</strong> {dealer.profile.address}</p>
              )}
              {dealer.verificationDetails?.appliedAt && (
                <p className={styles.detail}>
                  <strong>Applied:</strong>{' '}
                  {new Date(dealer.verificationDetails.appliedAt).toLocaleDateString()}
                </p>
              )}
              {dealer.rejectionReason && (
                <p className={styles.rejectionReason}>
                  <strong>Reason:</strong> {dealer.rejectionReason}
                </p>
              )}
            </div>

            {/* Tier Dropdown */}
            <div className={styles.tierRow}>
              <label className={styles.tierLabel}>Tier</label>
              <select
                className={styles.tierSelect}
                defaultValue={dealer.tier ?? 'standard'}
                onChange={(e) => tierMutation.mutate({ id: dealer._id, tier: e.target.value })}
                disabled={tierMutation.isPending}
              >
                <option value="standard">Standard</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>

            {/* Actions — only shown for pending dealers */}
            {dealer.registrationStatus === 'pending' && (
              <div className={styles.actions}>
                <button
                  className={styles.approveBtn}
                  onClick={() => approveMutation.mutate(dealer._id)}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending
                    ? <Loader2 size={14} className={styles.spin} />
                    : <CheckCircle size={14} />
                  }
                  Approve
                </button>
                <button
                  className={styles.rejectBtn}
                  onClick={() => setDialog({ open: true, dealerId: dealer._id })}
                  disabled={rejectMutation.isPending}
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={styles.pageBtn}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={styles.pageBtn}
          >
            Next
          </button>
        </div>
      )}

      {/* Reject Confirm Dialog */}
      <ConfirmDialog
        open={dialog.open}
        title="Reject Dealer Registration"
        message="Are you sure you want to reject this dealer? This will prevent them from logging in."
        withReason
        confirmLabel="Reject"
        confirmVariant="danger"
        onConfirm={(reason) =>
          rejectMutation.mutate({ id: dialog.dealerId, rejectionReason: reason ?? '' })
        }
        onCancel={() => setDialog({ open: false, dealerId: null })}
      />
    </div>
  );
}
