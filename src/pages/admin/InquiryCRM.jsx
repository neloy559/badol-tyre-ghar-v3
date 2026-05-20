import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, TrendingUp, XCircle, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const InquiryCRM = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('inquired');
  const [saleModal, setSaleModal] = useState(null);
  const [saleAmount, setSaleAmount] = useState('');

  const { data: inquiries, isLoading } = useQuery({
    queryKey: ['inquiries', filter],
    queryFn: async () => (await api.get('/admin/inquiries', { params: { status: filter } })).data.data,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, amount }) => api.patch(`/admin/inquiries/${id}/status`, { status, saleAmount: amount }),
    onSuccess: () => {
      queryClient.invalidateQueries(['inquiries']);
      setSaleModal(null);
      setSaleAmount('');
    },
  });

  const STATUS_TABS = ['inquired', 'replied', 'converted_to_sale', 'closed'];

  if (isLoading) return <div className="admin-loading">Loading Inquiries...</div>;

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Inquiry CRM</h2>
      
      <div className="crm-tabs">
        {STATUS_TABS.map((s) => (
          <button 
            key={s} 
            className={`crm-tab ${filter === s ? 'active' : ''}`} 
            onClick={() => setFilter(s)}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {inquiries?.length === 0 && (
        <div className="admin-empty-state">
          <MessageSquare size={48} opacity={0.2} />
          <p>No inquiries found in this category.</p>
        </div>
      )}

      <div className="inquiry-list">
        {inquiries?.map((inq) => (
          <div key={inq._id} className="inquiry-card">
            <div className="inquiry-info">
              <div className="inquiry-header">
                <p className="inquiry-user">{inq.userId?.profile?.name || inq.userId?.phone || 'Guest'}</p>
                <span className={`status-badge status-${inq.status}`}>{inq.status}</span>
              </div>
              <p className="inquiry-meta">
                <Clock size={12} /> {new Date(inq.updatedAt).toLocaleDateString()} · {inq.items?.length || 0} items
              </p>
              {inq.saleDetails?.amount && (
                <p className="inquiry-sale-amount">
                  <DollarSign size={12} /> Sale: ৳{inq.saleDetails.amount}
                </p>
              )}
            </div>

            <div className="inquiry-actions">
              {filter === 'inquired' && (
                <button className="btn-status" onClick={() => updateStatus.mutate({ id: inq._id, status: 'replied' })}>
                  Mark Replied
                </button>
              )}
              {filter === 'replied' && (
                <button className="btn-status btn-convert" onClick={() => setSaleModal(inq)}>
                  <TrendingUp size={13} /> Convert to Sale
                </button>
              )}
              {filter !== 'closed' && (
                <button className="btn-close" onClick={() => updateStatus.mutate({ id: inq._id, status: 'closed' })}>
                  <XCircle size={14} /> Close
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {saleModal && (
          <div className="admin-modal-overlay" onClick={() => setSaleModal(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="admin-modal" 
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Convert to Sale</h3>
              <p>Enter finalized amount for <strong>{saleModal.userId?.profile?.name || saleModal.userId?.phone}</strong></p>
              
              <div className="form-field">
                <label>Amount (BDT)</label>
                <input 
                  type="number" 
                  autoFocus
                  placeholder="e.g. 15000" 
                  value={saleAmount} 
                  onChange={(e) => setSaleAmount(e.target.value)} 
                />
              </div>

              <div className="admin-modal-actions">
                <button className="btn-cancel" onClick={() => setSaleModal(null)}>Cancel</button>
                <button 
                  className="btn-confirm" 
                  disabled={!saleAmount || updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ id: saleModal._id, status: 'converted_to_sale', amount: +saleAmount })}
                >
                  {updateStatus.isPending ? 'Processing...' : 'Confirm Sale'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InquiryCRM;
