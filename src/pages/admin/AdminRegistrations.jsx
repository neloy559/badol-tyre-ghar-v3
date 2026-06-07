import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import styles from './AdminRegistrations.module.css';

const STATUS_TABS = ['pending', 'approved', 'rejected'];

export default function AdminRegistrations() {
  const queryClient = useQueryClient();

  // ── Dealer registration state ────────────────────────────────
  const [status, setStatus]   = useState('pending');
  const [page, setPage]       = useState(1);
  const [dialog, setDialog]   = useState({ open: false, dealerId: null });

  // ── Upgrade tab state ────────────────────────────────────────
  const [showUpgradeTab, setShowUpgradeTab] = useState(false);
  const [upgradePage, setUpgradePage]       = useState(1);
  const [upgradeDialog, setUpgradeDialog]   = useState({ open: false, userId: null });
  const [cardErrors, setCardErrors]         = useState({}); // { [userId]: errorMsg }

  // ── Dealer registrations query ───────────────────────────────
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dealer-registrations', { status, page }],
    queryFn: () =>
      api.get('/admin/dealers/registrations', { params: { status, page, limit: 20 } })
         .then(r => r.data.data),
  });

  // ── Upgrade requests count (always runs for badge) ───────────
  const { data: countData } = useQuery({
    queryKey: ['upgrade-requests-count'],
    queryFn: () =>
      api.get('/admin/upgrade-requests', { params: { status: 'pending', limit: 1 } })
         .then(r => r.data.data),
  });

  // ── Upgrade requests list (only when tab is active) ──────────
  const {
    data: upgradeData,
    isLoading: upgradeLoading,
    isError: upgradeError,
    refetch: upgradeRefetch,
  } = useQuery({
    queryKey: ['upgrade-requests', { status: 'pending', page: upgradePage }],
    queryFn: () =>
      api.get('/admin/upgrade-requests', {
        params: { status: 'pending', page: upgradePage, limit: 20 },
      }).then(r => r.data.data),
    enabled: showUpgradeTab,
  });

  // ── Dealer mutations ─────────────────────────────────────────
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

  // ── Upgrade mutations ────────────────────────────────────────
  const upgradeApproveMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/upgrade-requests/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upgrade-requests'] });
    },
    onError: (err, id) => {
      const msg =
        err?.response?.data?.message ?? err?.message ?? 'Approval failed.';
      setCardErrors(prev => ({ ...prev, [id]: msg }));
    },
  });

  const upgradeRejectMutation = useMutation({
    mutationFn: ({ id, rejectionReason }) =>
      api.patch(`/admin/upgrade-requests/${id}/reject`, { rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upgrade-requests'] });
      setUpgradeDialog({ open: false, userId: null });
    },
    onError: (err, { id }) => {
      const msg =
        err?.response?.data?.message ?? err?.message ?? 'Rejection failed.';
      setCardErrors(prev => ({ ...prev, [id]: msg }));
    },
  });

  // ── Helpers ──────────────────────────────────────────────────
  const handleTabChange = (s) => {
    setStatus(s);
    setPage(1);
    setShowUpgradeTab(false);
  };

  const handleUpgradeTabClick = () => {
    setShowUpgradeTab(true);
    setUpgradePage(1);
  };

  // ── Dealer loading / error ───────────────────────────────────
  if (!showUpgradeTab && isLoading) {
    return (
      <div className={styles.section}>
        <h2 className={styles.title}>Dealer Registrations</h2>
        <div className={styles.skeleton}>
          {[1,2,3,4,5].map(i => <div key={i} className={styles.skeletonRow} />)}
        </div>
      </div>
    );
  }

  if (!showUpgradeTab && isError) {
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

  // ── Upgrade tab data ─────────────────────────────────────────
  const upgradeUsers  = upgradeData?.users  ?? [];
  const upgradeTotal  = upgradeData?.total  ?? 0;
  const upgradeLimit  = upgradeData?.limit  ?? 20;
  const upgradeTotalPages = Math.ceil(upgradeTotal / upgradeLimit);
  const upgradeBadge  = countData?.total ?? 0;

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Dealer Registrations</h2>

      {/* ── Tab Bar ─────────────────────────────────────────── */}
      <div className={styles.tabs}>
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => handleTabChange(s)}
            className={`${styles.tab} ${!showUpgradeTab && status === s ? styles.tabActive : ''}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'pending' && total > 0 && !showUpgradeTab && status === 'pending' && (
              <span className={styles.tabBadge}>{total}</span>
            )}
          </button>
        ))}

        {/* Upgrade Requests tab */}
        <button
          data-testid="upgrade-tab"
          onClick={handleUpgradeTabClick}
          className={`${styles.tab} ${showUpgradeTab ? styles.tabActive : ''}`}
        >
          Upgrade Requests
          {upgradeBadge > 0 && (
            <span className={styles.tabBadge} data-testid="upgrade-badge">
              {upgradeBadge}
            </span>
          )}
        </button>
      </div>

      {/* ── Dealer Registration Content ──────────────────────── */}
      {!showUpgradeTab && (
        <>
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

                {/* Actions — only for pending */}
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

          {/* Dealer Pagination */}
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

          {/* Dealer Reject Dialog */}
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
        </>
      )}

      {/* ── Upgrade Requests Content ─────────────────────────── */}
      {showUpgradeTab && (
        <>
          {/* Loading */}
          {upgradeLoading && (
            <div className={styles.skeleton}>
              {[1,2,3,4,5].map(i => <div key={i} className={styles.skeletonRow} />)}
            </div>
          )}

          {/* Error */}
          {upgradeError && !upgradeLoading && (
            <div className={styles.errorState}>
              <p>Failed to load upgrade requests.</p>
              <button onClick={() => upgradeRefetch()} className={styles.retryBtn}>Retry</button>
            </div>
          )}

          {/* Empty state */}
          {!upgradeLoading && !upgradeError && upgradeUsers.length === 0 && (
            <div className={styles.emptyState} data-testid="upgrade-empty">
              No pending upgrade requests.
            </div>
          )}

          {/* Upgrade Cards */}
          {!upgradeLoading && !upgradeError && (
            <div className={styles.grid}>
              {upgradeUsers.map(user => (
                <div key={user._id} className={styles.card} data-testid={`upgrade-card-${user._id}`}>
                  <div className={styles.cardInfo}>
                    {/* phone — always shown if present */}
                    {user.phone && (
                      <p className={styles.detail}><strong>Phone:</strong> {user.phone}</p>
                    )}

                    {/* profile.name — only if present */}
                    {user.profile?.name && (
                      <p className={styles.detail} data-testid="card-profile-name">
                        <strong>Name:</strong> {user.profile.name}
                      </p>
                    )}

                    {/* upgradeDetails fields */}
                    {user.upgradeDetails?.businessName && (
                      <p className={styles.detail}>
                        <strong>Business:</strong> {user.upgradeDetails.businessName}
                      </p>
                    )}
                    {user.upgradeDetails?.ownerName && (
                      <p className={styles.detail}>
                        <strong>Owner:</strong> {user.upgradeDetails.ownerName}
                      </p>
                    )}
                    {user.upgradeDetails?.address && (
                      <p className={styles.detail}>
                        <strong>Address:</strong> {user.upgradeDetails.address}
                      </p>
                    )}
                    {user.upgradeDetails?.appliedAt && (
                      <p className={styles.detail}>
                        <strong>Applied:</strong>{' '}
                        {new Date(user.upgradeDetails.appliedAt).toLocaleDateString()}
                      </p>
                    )}

                    {/* Inline card error */}
                    {cardErrors[user._id] && (
                      <p className={styles.rejectionReason}>{cardErrors[user._id]}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={styles.actions}>
                    <button
                      className={styles.approveBtn}
                      onClick={() => {
                        setCardErrors(prev => ({ ...prev, [user._id]: null }));
                        upgradeApproveMutation.mutate(user._id);
                      }}
                      disabled={upgradeApproveMutation.isPending}
                    >
                      {upgradeApproveMutation.isPending
                        ? <Loader2 size={14} className={styles.spin} />
                        : <CheckCircle size={14} />
                      }
                      Approve
                    </button>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => {
                        setCardErrors(prev => ({ ...prev, [user._id]: null }));
                        setUpgradeDialog({ open: true, userId: user._id });
                      }}
                      disabled={upgradeRejectMutation.isPending}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upgrade Pagination */}
          {upgradeTotalPages > 1 && (
            <div className={styles.pagination} data-testid="upgrade-pagination">
              <button
                onClick={() => setUpgradePage(p => Math.max(1, p - 1))}
                disabled={upgradePage <= 1}
                className={styles.pageBtn}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {upgradePage} of {upgradeTotalPages}
              </span>
              <button
                onClick={() => setUpgradePage(p => Math.min(upgradeTotalPages, p + 1))}
                disabled={upgradePage >= upgradeTotalPages}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          )}

          {/* Upgrade Reject Dialog */}
          <ConfirmDialog
            open={upgradeDialog.open}
            title="Reject Upgrade Request"
            message="Are you sure you want to reject this upgrade request?"
            withReason
            confirmLabel="Reject"
            confirmVariant="danger"
            onConfirm={(reason) =>
              upgradeRejectMutation.mutate({
                id: upgradeDialog.userId,
                rejectionReason: reason ?? '',
              })
            }
            onCancel={() => setUpgradeDialog({ open: false, userId: null })}
          />
        </>
      )}
    </div>
  );
}
