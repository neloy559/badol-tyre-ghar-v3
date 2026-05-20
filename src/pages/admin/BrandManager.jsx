import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Pencil, Trash2, Eye, EyeOff, Check, X, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';
import { CATEGORIES } from '../../utils/constants';

const ALL_CATEGORY_SLUGS = CATEGORIES.map(c => c.slug);

const defaultForm = { name: '', categories: [], origin: '', description: '' };

const BrandManager = () => {
  const queryClient = useQueryClient();
  const [addForm, setAddForm]     = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm]   = useState(defaultForm);
  const [toast, setToast]         = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Data ──────────────────────────────────────────────────────
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: async () => (await api.get('/admin/catalog/brands')).data?.data || [],
  });

  // ── Mutations ─────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries(['admin-brands']);
    queryClient.invalidateQueries(['brands']); // also refresh the catalog form's brand list
  };

  const createMut = useMutation({
    mutationFn: (data) => api.post('/admin/catalog/brands', data),
    onSuccess: () => { setAddForm(defaultForm); invalidate(); showToast('Brand created!'); },
    onError:   (e) => showToast(e.response?.data?.message || 'Create failed.', 'error'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/admin/catalog/brands/${id}`, data),
    onSuccess: () => { setEditingId(null); invalidate(); showToast('Brand updated!'); },
    onError:   (e) => showToast(e.response?.data?.message || 'Update failed.', 'error'),
  });

  const toggleMut = useMutation({
    mutationFn: (id) => api.patch(`/admin/catalog/brands/${id}/toggle`),
    onSuccess: (res) => { invalidate(); showToast(res.data?.message || 'Toggled.'); },
    onError:   (e) => showToast(e.response?.data?.message || 'Toggle failed.', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/admin/catalog/brands/${id}`),
    onSuccess: () => { setConfirmDelete(null); invalidate(); showToast('Brand deleted.'); },
    onError:   (e) => { setConfirmDelete(null); showToast(e.response?.data?.message || 'Delete failed.', 'error'); },
  });

  // ── Helpers ───────────────────────────────────────────────────
  const toggleCat = (slug, formState, setFormState) => {
    setFormState(prev => ({
      ...prev,
      categories: prev.categories.includes(slug)
        ? prev.categories.filter(c => c !== slug)
        : [...prev.categories, slug],
    }));
  };

  const handleSelectAll = (formState, setFormState) => {
    setFormState(prev => ({
      ...prev,
      categories: prev.categories.length === ALL_CATEGORY_SLUGS.length ? [] : [...ALL_CATEGORY_SLUGS],
    }));
  };

  const startEdit = (brand) => {
    setEditingId(brand._id);
    setEditForm({ name: brand.name, categories: brand.categories || [], origin: brand.origin || '', description: brand.description || '' });
  };

  // ── Render helpers ────────────────────────────────────────────
  const CategoryPills = ({ form, setForm }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
      <button
        type="button"
        onClick={() => handleSelectAll(form, setForm)}
        style={{
          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
          background: form.categories.length === ALL_CATEGORY_SLUGS.length ? 'var(--color-primary)' : 'transparent',
          color: form.categories.length === ALL_CATEGORY_SLUGS.length ? '#fff' : 'var(--color-text-muted)',
          border: '1px solid var(--color-primary)',
        }}
      >All</button>
      {CATEGORIES.map(c => {
        const selected = form.categories.includes(c.slug);
        return (
          <button
            key={c.slug} type="button"
            onClick={() => toggleCat(c.slug, form, setForm)}
            style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
              background: selected ? 'var(--color-primary)' : 'transparent',
              color: selected ? '#fff' : 'var(--color-text-muted)',
              border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
              transition: 'all 0.15s',
            }}
          >{c.label}</button>
        );
      })}
    </div>
  );

  // ── JSX ───────────────────────────────────────────────────────
  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Brand Manager</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '24px' }}>
        Add, edit, hide, or delete brands. Product count shown per brand — brands with active products cannot be deleted (hide them instead).
      </p>

      {/* Toast */}
      {toast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
          borderRadius: '8px', marginBottom: '16px', fontSize: '13px',
          background: toast.type === 'error' ? 'var(--color-danger-light, #fee2e2)' : 'var(--color-success-light, #dcfce7)',
          color: toast.type === 'error' ? 'var(--color-danger, #dc2626)' : 'var(--color-success, #16a34a)',
          border: `1px solid ${toast.type === 'error' ? 'var(--color-danger, #dc2626)' : 'var(--color-success, #16a34a)'}`,
        }}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />} {toast.msg}
        </div>
      )}

      {/* ── Add Brand Form ── */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '12px', padding: '20px', marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px' }}>➕ Add New Brand</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Brand Name*</label>
            <input
              type="text" placeholder="e.g. Bridgestone"
              value={addForm.name}
              onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px' }}
            />
          </div>
          <div style={{ flex: '1', minWidth: '120px' }}>
            <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Origin (optional)</label>
            <input
              type="text" placeholder="e.g. Japan"
              value={addForm.origin}
              onChange={e => setAddForm(p => ({ ...p, origin: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px' }}
            />
          </div>
          <button
            onClick={() => createMut.mutate(addForm)}
            disabled={!addForm.name.trim() || createMut.isPending}
            className="btn-markup"
            style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px', height: '38px' }}
          >
            <PlusCircle size={15} /> {createMut.isPending ? 'Saving...' : 'Add Brand'}
          </button>
        </div>
        <div style={{ marginTop: '10px' }}>
          <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Assign to Categories</label>
          <CategoryPills form={addForm} setForm={setAddForm} />
        </div>
      </div>

      {/* ── Brand Table ── */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Brand Name</th>
              <th>Categories</th>
              <th>Origin</th>
              <th style={{ textAlign: 'center' }}>Products</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Loading brands...</td></tr>
            ) : brands.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No brands found.</td></tr>
            ) : brands.map(brand => (
              <React.Fragment key={brand._id}>
                <tr style={{ opacity: brand.isActive ? 1 : 0.5 }}>
                  {editingId === brand._id ? (
                    /* ── EDIT ROW ── */
                    <>
                      <td>
                        <input
                          type="text" value={editForm.name}
                          onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-primary)', fontSize: '13px' }}
                          autoFocus
                        />
                      </td>
                      <td colSpan="3">
                        <div>
                          <CategoryPills form={editForm} setForm={setEditForm} />
                          <input
                            type="text" placeholder="Origin" value={editForm.origin}
                            onChange={e => setEditForm(p => ({ ...p, origin: e.target.value }))}
                            style={{ marginTop: '6px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '12px', width: '140px' }}
                          />
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                          background: brand.isActive ? 'var(--color-success-light, #dcfce7)' : '#fee2e2',
                          color: brand.isActive ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)',
                        }}>{brand.isActive ? 'Active' : 'Hidden'}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => updateMut.mutate({ id: brand._id, data: editForm })}
                            disabled={updateMut.isPending}
                            title="Save"
                            style={{ background: 'var(--color-success, #16a34a)', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                          ><Check size={13} /> Save</button>
                          <button
                            onClick={() => setEditingId(null)}
                            title="Cancel"
                            style={{ background: 'var(--color-surface-2, #f3f4f6)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                          ><X size={13} /> Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    /* ── VIEW ROW ── */
                    <>
                      <td style={{ fontWeight: '500', fontSize: '13px' }}>{brand.name}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(brand.categories?.length > 0)
                            ? brand.categories.map(slug => {
                                const cat = CATEGORIES.find(c => c.slug === slug);
                                return (
                                  <span key={slug} style={{
                                    padding: '2px 8px', borderRadius: '20px', fontSize: '10px',
                                    background: 'var(--color-primary-light, #fee2e2)', color: 'var(--color-primary)',
                                    border: '1px solid var(--color-primary)',
                                  }}>{cat?.label || slug}</span>
                                );
                              })
                            : <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>All</span>
                          }
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{brand.origin || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontWeight: '600', fontSize: '13px',
                          color: brand.productCount > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        }}>{brand.productCount}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                          background: brand.isActive ? 'var(--color-success-light, #dcfce7)' : '#fee2e2',
                          color: brand.isActive ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)',
                        }}>{brand.isActive ? 'Active' : 'Hidden'}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => startEdit(brand)} title="Edit" style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: 'var(--color-text)' }}><Pencil size={13} /></button>
                          <button onClick={() => toggleMut.mutate(brand._id)} title={brand.isActive ? 'Hide' : 'Show'} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: brand.isActive ? 'var(--color-warning, #f59e0b)' : 'var(--color-success, #16a34a)' }}>
                            {brand.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(brand)}
                            title="Delete"
                            disabled={brand.productCount > 0}
                            style={{
                              background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '5px 8px', cursor: brand.productCount > 0 ? 'not-allowed' : 'pointer',
                              color: brand.productCount > 0 ? 'var(--color-text-muted)' : 'var(--color-danger, #dc2626)',
                              opacity: brand.productCount > 0 ? 0.4 : 1,
                            }}
                            title={brand.productCount > 0 ? `${brand.productCount} products linked — hide instead` : 'Delete brand'}
                          ><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Delete Confirm Modal ── */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', maxWidth: '380px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontWeight: '700', marginBottom: '10px', color: 'var(--color-danger, #dc2626)' }}>Delete Brand?</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
              Are you sure you want to permanently delete <strong>"{confirmDelete.name}"</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => deleteMut.mutate(confirmDelete._id)}
                disabled={deleteMut.isPending}
                style={{ flex: 1, padding: '10px', background: 'var(--color-danger, #dc2626)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >{deleteMut.isPending ? 'Deleting...' : 'Yes, Delete'}</button>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: '10px', background: 'var(--color-surface-2, #f3f4f6)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer' }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandManager;
