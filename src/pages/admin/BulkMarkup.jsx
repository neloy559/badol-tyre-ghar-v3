import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { CATEGORIES } from '../../utils/constants';

const BulkMarkup = () => {
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/products/brands')).data.data,
  });

  const [form, setForm] = useState({ type: 'percentage', value: '', priceField: 'retail', brand: '', category: '' });
  const [result, setResult] = useState(null);
  const [isPending, setIsPending] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const run = async (e) => {
    e.preventDefault(); 
    setResult(null);
    setIsPending(true);
    
    try {
      const filter = {};
      if (form.brand)    filter.brand    = form.brand;
      if (form.category) filter.category = form.category;

      const res = await api.post('/admin/products/bulk-markup', {
        filter,
        type:       form.type,
        value:      +form.value,
        priceField: form.priceField,
      });
      setResult(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk markup failed');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Bulk Price Markup</h2>
      <div className="admin-alert-warning">
        <AlertTriangle size={18} />
        <p>Warning: This will permanently modify prices for all selected products. Proceed with caution.</p>
      </div>

      <form onSubmit={run} className="markup-form">
        <div className="form-row">
          <div className="form-field">
            <label>Filter by Brand (Optional)</label>
            <select value={form.brand} onChange={update('brand')}>
              <option value="">All Brands</option>
              {brands?.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Filter by Category (Optional)</label>
            <select value={form.category} onChange={update('category')}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Target Price Field</label>
            <select value={form.priceField} onChange={update('priceField')}>
              <option value="retail">Retail Price</option>
              <option value="wholesale">Wholesale Price</option>
            </select>
          </div>
          <div className="form-field">
            <label>Adjustment Type</label>
            <select value={form.type} onChange={update('type')}>
              <option value="percentage">Add Percentage (%)</option>
              <option value="fixed_markup">Add Fixed Amount (৳)</option>
            </select>
          </div>
        </div>

        <div className="form-field">
          <label>Value</label>
          <input type="number" placeholder="e.g. 5" value={form.value} onChange={update('value')} required />
        </div>

        <button type="submit" className="btn-markup btn-markup-danger" disabled={isPending}>
          {isPending ? 'Processing...' : (form.brand || form.category 
            ? `Apply to ${[form.brand, form.category].filter(Boolean).join(' / ')}` 
            : 'Apply to ENTIRE CATALOG'
          )}
        </button>
      </form>

      {result && (
        <div className="markup-result-card">
          <CheckCircle2 size={24} color="#10b981" />
          <p>Success! Applied markup to <strong>{result.updatedCount}</strong> products.</p>
        </div>
      )}
    </div>
  );
};

export default BulkMarkup;
