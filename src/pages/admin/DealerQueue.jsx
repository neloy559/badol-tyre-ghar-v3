import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, XCircle, ExternalLink, Percent, Loader2, UserCheck } from 'lucide-react';
import api from '../../services/api';

const DealerQueue = () => {
  const queryClient = useQueryClient();
  const [multiplier, setMultiplier] = useState({}); // { [dealerId]: value }

  const { data: dealers, isLoading } = useQuery({
    queryKey: ['pending-dealers'],
    queryFn: async () => (await api.get('/admin/dealers/pending')).data.data,
  });

  const verify = useMutation({
    mutationFn: ({ id, approve }) => api.patch(`/admin/dealers/${id}/verify`, { approve }),
    onSuccess: () => queryClient.invalidateQueries(['pending-dealers']),
  });

  const updateDiscount = useMutation({
    mutationFn: ({ id, multiplier }) => api.patch(`/admin/dealers/${id}/discount`, { multiplier: +multiplier }),
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-dealers']);
      alert('Discount multiplier updated successfully.');
    },
  });

  if (isLoading) return <div className="admin-loading"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Dealer Verification Queue</h2>
        <span className="admin-badge">{dealers?.length || 0} Pending</span>
      </div>

      {dealers?.length === 0 && (
        <div className="admin-empty-state">
          <UserCheck size={48} opacity={0.2} />
          <p>No pending dealer verifications at the moment.</p>
        </div>
      )}

      <div className="dealer-grid">
        {dealers?.map((d) => (
          <div key={d._id} className="dealer-card-premium">
            <div className="dealer-card-main">
              <div className="dealer-header">
                <h3 className="dealer-name">{d.profile?.name || 'Anonymous'}</h3>
                <span className="dealer-role-tag">{d.role}</span>
              </div>
              
              <div className="dealer-details">
                <p><strong>Phone:</strong> {d.phone}</p>
                {d.profile?.shopName && <p><strong>Shop:</strong> {d.profile.shopName}</p>}
                {d.profile?.district && <p><strong>District:</strong> {d.profile.district}</p>}
              </div>

              {d.verificationDetails?.tradeLicense && (
                <div className="dealer-docs">
                  <a 
                    href={d.verificationDetails.tradeLicense} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="dealer-doc-link"
                  >
                    <ExternalLink size={14} /> Trade License
                  </a>
                </div>
              )}
            </div>

            <div className="dealer-controls">
              <div className="discount-setter">
                <label><Percent size={14} /> Multiplier</label>
                <div className="discount-input-group">
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="e.g. 0.95"
                    value={multiplier[d._id] ?? d.discountMultiplier ?? 1.0}
                    onChange={(e) => setMultiplier({ ...multiplier, [d._id]: e.target.value })}
                  />
                  <button 
                    onClick={() => {
                      // BUG-027 fix: multiplier[d._id] could be undefined if admin
                      // never changed the input — sends NaN to backend.
                      const val = multiplier[d._id];
                      if (val === undefined || val === '') {
                        alert('Please enter a multiplier value first.');
                        return;
                      }
                      updateDiscount.mutate({ id: d._id, multiplier: val });
                    }}
                    disabled={updateDiscount.isPending}
                  >
                    Set
                  </button>
                </div>
              </div>

              <div className="dealer-actions-horizontal">
                <button 
                  className="btn-approve-lg" 
                  onClick={() => verify.mutate({ id: d._id, approve: true })}
                  disabled={verify.isPending}
                >
                  <ShieldCheck size={18} /> Approve Dealer
                </button>
                <button 
                  className="btn-reject-icon" 
                  onClick={() => verify.mutate({ id: d._id, approve: false })}
                  disabled={verify.isPending}
                  title="Reject"
                >
                  <XCircle size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DealerQueue;
