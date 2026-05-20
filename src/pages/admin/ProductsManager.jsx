import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { CATEGORIES } from '../../utils/constants';
import './ProductsManager.css';

const ALL_TABS = [
  { label: 'All Products', slug: 'all' },
  ...CATEGORIES
];

/* ── Inline Toggle Switch ──────────────────────────────────── */
const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px', cursor: disabled ? 'not-allowed' : 'pointer' }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={e => !disabled && onChange(e.target.checked)}
      style={{ opacity: 0, width: 0, height: 0 }}
    />
    <span style={{
      position: 'absolute', inset: 0,
      backgroundColor: checked ? 'var(--color-primary, #e53e3e)' : '#ccc',
      borderRadius: '22px', transition: '0.25s',
    }} />
    <span style={{
      position: 'absolute', height: '16px', width: '16px',
      left: checked ? '19px' : '3px', bottom: '3px',
      backgroundColor: 'white', borderRadius: '50%', transition: '0.25s',
    }} />
  </label>
);

/* ── Product Table ─────────────────────────────────────────── */
const ProductTable = ({ products, isLoading, startIndex = 0, onEdit, onToggle, toggling }) => {
  if (isLoading) return <p style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>Loading...</p>;
  if (!products || products.length === 0) return <p style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>No products found.</p>;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Image</th>
            <th className="hide-mobile">SKU</th>
            <th>Product Name</th>
            <th className="hide-mobile">Brand</th>
            <th className="hide-mobile">Category</th>
            <th>Retail / Wholesale</th>
            <th style={{ textAlign: 'center' }}>Visible</th>
            <th style={{ textAlign: 'center' }}>Show Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => {
            const catName = p.category?.name || p.category?.slug || '—';
            const brandName = p.brand?.name || '—';
            const retail = p.variants?.[0]?.pricing?.retail ?? p.variants?.[0]?.price ?? '—';
            const wholesale = p.variants?.[0]?.pricing?.wholesale ?? '—';
            const isTogglingVisible   = toggling[`${p._id}-isVisible`];
            const isTogglingShowPrice = toggling[`${p._id}-showPrice`];
            return (
              <tr key={p._id} style={{ opacity: (isTogglingVisible || isTogglingShowPrice) ? 0.6 : 1 }}>
                <td style={{ color: 'var(--color-text-muted)', fontWeight: '600', width: '40px' }}>{startIndex + idx + 1}</td>
                <td>
                  <img
                    src={p.media?.[0]}
                    alt=""
                    style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px' }}
                    onError={e => { e.target.style.opacity = '0.3'; }}
                  />
                </td>
                <td className="hide-mobile"><code style={{ fontSize: '12px' }}>{p.sku}</code></td>
                <td style={{ maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</td>
                <td className="hide-mobile" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{brandName}</td>
                <td className="hide-mobile"><span className="badge-cat">{catName}</span></td>
                <td>৳{retail} / ৳{wholesale}</td>
                <td style={{ textAlign: 'center' }}>
                  <ToggleSwitch
                    checked={p.isVisible !== false}
                    disabled={isTogglingVisible}
                    onChange={val => onToggle(p._id, 'isVisible', val)}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <ToggleSwitch
                    checked={p.showPrice !== false}
                    disabled={isTogglingShowPrice}
                    onChange={val => onToggle(p._id, 'showPrice', val)}
                  />
                </td>
                <td>
                  <button className="btn-edit-tiny" onClick={() => onEdit(p)}>Edit</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ── Category Tab ──────────────────────────────────────────── */
const CategoryTab = ({ slug, onEdit }) => {
  const [page, setPage] = useState(1);
  const [toggling, setToggling] = useState({});
  const limit = 100;
  const queryClient = useQueryClient();

  const queryKey = ['products-customisation', slug, page];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit });
      if (slug !== 'all') params.set('category', slug);
      return (await api.get(`/admin/catalog/products?${params}`)).data?.data;
    },
    keepPreviousData: true,
  });

  const products = data?.products || [];
  const totalProducts = data?.total || 0;
  const totalPages = Math.ceil(totalProducts / limit);
  const startIndex = (page - 1) * limit;

  const handleToggle = useCallback(async (id, field, value) => {
    const key = `${id}-${field}`;
    setToggling(prev => ({ ...prev, [key]: true }));
    try {
      await api.patch(`/admin/catalog/products/${id}/toggle`, { field, value });
      // Optimistically update the local cache
      queryClient.setQueryData(queryKey, old => {
        if (!old?.products) return old;
        return {
          ...old,
          products: old.products.map(p => p._id === id ? { ...p, [field]: value } : p)
        };
      });
    } catch (e) {
      console.error('Toggle failed:', e);
    } finally {
      setToggling(prev => ({ ...prev, [key]: false }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const handleBulkToggle = async (field, value) => {
    if (!window.confirm(`Are you sure you want to ${value ? 'show' : 'hide'} ${field === 'isVisible' ? 'all products' : 'prices'} for ${slug === 'all' ? 'All Products' : slug.toUpperCase()}?`)) return;
    try {
      await api.patch('/admin/catalog/products/bulk-toggle', { field, value, category: slug });
      queryClient.invalidateQueries({ queryKey: ['products-customisation'] });
      alert('Bulk update successful.');
    } catch (e) {
      console.error('Bulk toggle failed:', e);
      alert('Bulk toggle failed. See console.');
    }
  };

  return (
    <div>
      <div className="pm-bulk-header">
        <div className="pm-bulk-info">
          <h3>Bulk Actions ({slug === 'all' ? 'Global' : slug.toUpperCase()})</h3>
          <p>{isLoading ? 'Loading...' : `${totalProducts} products total`}</p>
        </div>
        
        <div className="pm-bulk-actions">
          <div className="pm-action-group">
            <span className="pm-action-label">Visibility</span>
            <div className="pm-btn-group">
               <button className="pm-btn pm-btn-show" onClick={() => handleBulkToggle('isVisible', true)}>Show All</button>
               <button className="pm-btn pm-btn-hide" onClick={() => handleBulkToggle('isVisible', false)}>Hide All</button>
            </div>
          </div>
          
          <div className="pm-action-group">
            <span className="pm-action-label">Prices</span>
            <div className="pm-btn-group">
               <button className="pm-btn pm-btn-show" onClick={() => handleBulkToggle('showPrice', true)}>Show All</button>
               <button className="pm-btn pm-btn-hide" onClick={() => handleBulkToggle('showPrice', false)}>Hide All</button>
            </div>
          </div>
        </div>
      </div>

      <ProductTable
        products={products}
        isLoading={isLoading}
        startIndex={startIndex}
        onEdit={onEdit}
        onToggle={handleToggle}
        toggling={toggling}
      />

      {totalPages > 1 && (
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px' }}>
            Previous
          </button>
          <span style={{ fontWeight: '500' }}>Page {page} of {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px' }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

import ProductEditModal from '../../components/organisms/ProductEditModal';

/* ── Main Component ────────────────────────────────────────── */
const ProductsManager = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Products Customisation</h2>

      <div className="crm-tabs" style={{ marginBottom: '20px', flexWrap: 'wrap' }}>
        {ALL_TABS.map(tab => (
          <button
            key={tab.slug}
            className={`crm-tab ${activeTab === tab.slug ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.slug)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <CategoryTab key={activeTab} slug={activeTab} onEdit={handleEdit} />

      <ProductEditModal 
        product={selectedProduct} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default ProductsManager;
