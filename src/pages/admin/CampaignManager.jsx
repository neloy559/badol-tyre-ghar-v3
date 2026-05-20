import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, PlusCircle, AlertCircle, Clock } from 'lucide-react';
import api from '../../services/api';
import { CATEGORIES } from '../../utils/constants';

const CampaignManager = () => {
  const queryClient = useQueryClient();
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/products/brands')).data.data,
  });
  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => (await api.get('/admin/campaigns')).data.data,
  });

  const [form, setForm] = useState({ 
    name: '', type: 'percentage', value: '', badgeText: 'OFFER', 
    startDate: '', endDate: '', targetBrand: '', targetCategory: '' 
  });
  
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  
  const create = useMutation({
    mutationFn: () => api.post('/admin/campaigns', { 
      ...form, 
      value: +form.value,
      appliesTo: {
        brand:    form.targetBrand    || undefined,
        category: form.targetCategory || undefined,
      }
    }),
    onSuccess: () => { 
      queryClient.invalidateQueries(['campaigns']); 
      setForm({ name: '', type: 'percentage', value: '', badgeText: 'OFFER', startDate: '', endDate: '', targetBrand: '', targetCategory: '' }); 
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/admin/campaigns/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries(['campaigns']),
  });

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Campaign Manager</h2>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="campaign-form">
        <div className="form-row">
          <div className="form-field"><label>Campaign Name</label><input type="text" placeholder="e.g. Eid Offer 2026" value={form.name} onChange={update('name')} required /></div>
          <div className="form-field"><label>Badge Text</label><input type="text" placeholder="OFFER" value={form.badgeText} onChange={update('badgeText')} /></div>
        </div>
        <div className="form-row">
          <div className="form-field"><label>Type</label><select value={form.type} onChange={update('type')}><option value="percentage">Percentage</option><option value="fixed_discount">Fixed</option></select></div>
          <div className="form-field"><label>Value</label><input type="number" placeholder="10" value={form.value} onChange={update('value')} required /></div>
        </div>
        <div className="form-row">
          <div className="form-field"><label>Start Date</label><input type="date" value={form.startDate} onChange={update('startDate')} required /></div>
          <div className="form-field"><label>End Date</label><input type="date" value={form.endDate} onChange={update('endDate')} required /></div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Target Brand (Optional)</label>
            <select value={form.targetBrand} onChange={update('targetBrand')}>
              <option value="">All Brands</option>
              {brands?.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Target Category (Optional)</label>
            <select value={form.targetCategory} onChange={update('targetCategory')}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" className="btn-markup" disabled={create.isPending}>
          {create.isPending ? 'Creating...' : 'Create Campaign'}
        </button>
      </form>

      <div className="campaign-list">
        {campaigns?.map((c) => (
          <div key={c._id} className="campaign-card">
            <div className="campaign-info">
              <p className="campaign-name">{c.name}</p>
              <p className="campaign-meta">
                {c.type === 'percentage' ? `${c.value}% off` : `৳${c.value} off`} · <strong>{c.badgeText}</strong>
              </p>
              <p className="campaign-dates">
                <Clock size={12} /> {new Date(c.startDate).toLocaleDateString()} → {new Date(c.endDate).toLocaleDateString()}
              </p>
            </div>
            <button
              className={`btn-toggle ${c.isActive ? 'active' : ''}`}
              onClick={() => toggle.mutate({ id: c._id, isActive: !c.isActive })}
            >
              {c.isActive ? 'Active' : 'Inactive'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CampaignManager;
