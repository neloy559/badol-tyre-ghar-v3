import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api from '../../services/api';
import { CATEGORIES } from '../../utils/constants';

const ALL_TABS = [
  { label: 'All Products', slug: 'all' },
  ...CATEGORIES
];

const TagsManager = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products-tags', activeTab, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit });
      if (activeTab !== 'all') params.set('category', activeTab);
      return (await api.get(`/admin/catalog/products?${params}`)).data?.data;
    },
    keepPreviousData: true
  });

  const products = data?.products || [];
  const totalPages = Math.ceil((data?.total || 0) / limit);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const s = searchTerm.toLowerCase();
    return products.filter(p => 
      (p.name?.toLowerCase() || '').includes(s) || 
      (p.sku?.toLowerCase() || '').includes(s)
    );
  }, [products, searchTerm]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Tag Modal State
  const [customTags, setCustomTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditTags = (product) => {
    setSelectedProduct(product);
    setCustomTags(product.customTags || []);
  };

  const addTag = (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    const val = newTag.trim().toLowerCase();
    if (!customTags.includes(val)) {
      setCustomTags([...customTags, val]);
    }
    setNewTag('');
  };

  const removeTag = (tagToRemove) => {
    setCustomTags(customTags.filter(t => t !== tagToRemove));
  };

  const saveTags = async () => {
    try {
      setIsSaving(true);
      await api.patch(`/admin/catalog/products/${selectedProduct._id}`, { customTags });
      queryClient.invalidateQueries({ queryKey: ['products-tags'] });
      setSelectedProduct(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update tags');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Tags & Synonyms Manager</h2>
      </div>
      <p className="admin-sub-desc">Manage manual search aliases for products. System automatically covers tyre size variations and common brand translations.</p>

      <div className="crm-tabs" style={{ marginBottom: '20px', flexWrap: 'wrap' }}>
        {ALL_TABS.map(tab => (
          <button
            key={tab.slug}
            className={`crm-tab ${activeTab === tab.slug ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.slug); setPage(1); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <input 
          type="text" 
          placeholder="Search product by SKU or Name..." 
          className="admin-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Custom Tags Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="5" style={{textAlign:'center'}}>Loading...</td></tr>
            ) : filteredProducts.map(p => (
              <tr key={p._id}>
                <td><code style={{fontSize:'12px'}}>{p.sku}</code></td>
                <td>{p.name}</td>
                <td><span className="badge-cat">{p.category?.name || p.category?.slug || '—'}</span></td>
                <td>
                  {p.customTags?.length > 0 ? (
                    <span style={{background:'var(--color-primary-light, #fee2e2)', color:'var(--color-primary, #b91c1c)', padding:'2px 8px', borderRadius:'10px', fontSize:'12px', fontWeight:'600'}}>
                      {p.customTags.length} custom tags
                    </span>
                  ) : (
                    <span style={{color:'var(--color-text-muted)', fontSize:'12px'}}>No custom tags</span>
                  )}
                </td>
                <td>
                  <button className="btn-edit-tiny" onClick={() => handleEditTags(p)}>Manage Tags</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px' }}>Previous</button>
          <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center' }}>Page {page} of {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px' }}>Next</button>
        </div>
      )}

      {selectedProduct && (
        <div className="btg-modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="btg-edit-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h3>Manage Tags: {selectedProduct.sku}</h3>
              <button className="close-btn" onClick={() => setSelectedProduct(null)}><X size={20} /></button>
            </header>
            
            <div style={{ padding: '20px' }}>
              <form onSubmit={addTag} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input 
                  type="text" 
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Type a synonym (e.g. cng tire) and press Enter"
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', outline: 'none' }}
                />
                <button type="submit" className="btn-markup" style={{ padding: '0 20px', cursor: 'pointer' }}>Add</button>
              </form>

              <div>
                <h4 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--color-text-muted)' }}>Custom Tags</h4>
                {customTags.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No custom tags added yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {customTags.map(tag => (
                      <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--color-primary, #e53e3e)', color: '#fff', padding: '4px 10px', borderRadius: '16px', fontSize: '13px' }}>
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: '#fff', marginLeft: '6px', cursor: 'pointer', padding: 0, display: 'flex' }}>
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid var(--color-border)' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--color-text-muted)' }}>Auto-Generated System Tags (Read Only)</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                  {selectedProduct.searchTags?.filter(t => !customTags.includes(t)).map(tag => (
                    <span key={tag} style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ padding: '15px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => setSelectedProduct(null)} disabled={isSaving}>Cancel</button>
              <button className="btn-save" onClick={saveTags} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Tags'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsManager;
