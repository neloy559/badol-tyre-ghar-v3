import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Trash2, Tag, AlertCircle, CheckCircle, X, TrendingUp, ZapOff, Zap } from 'lucide-react';
import api from '../../services/api';

/* ── Assign Tag Modal ──────────────────────────────────────── */
const AssignModal = ({ log, onClose, onAssigned }) => {
  const [mode, setMode]         = useState('product'); // 'product' | 'category'
  const [query, setQuery]       = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving]     = useState(false);

  const { data: results, isLoading } = useQuery({
    queryKey: ['assign-search', mode, query],
    queryFn: async () => {
      if (query.length < 2) return [];
      if (mode === 'product') {
        const res = await api.get(`/admin/catalog/products?limit=10&search=${encodeURIComponent(query)}`);
        return res.data?.data?.products || [];
      } else {
        const res = await api.get('/catalog/categories');
        const cats = res.data?.data?.categories || [];
        return cats.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
      }
    },
    enabled: query.length >= 2,
  });

  const handleAssign = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const body = mode === 'product'
        ? { productId: selected._id }
        : { categoryId: selected._id };
      await api.post(`/admin/search-intelligence/${log._id}/assign`, body);
      onAssigned();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Assignment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="btg-modal-overlay" onClick={onClose}>
      <div className="btg-edit-modal" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h3>Assign Tag: <code style={{ color: 'var(--color-brand)', fontSize: '14px' }}>"{log.term}"</code></h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <div style={{ padding: '20px' }}>
          {/* Mode Toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {['product', 'category'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setSelected(null); setQuery(''); }}
                style={{
                  padding: '6px 16px', borderRadius: '20px', border: '1px solid',
                  borderColor: mode === m ? 'var(--color-brand)' : 'var(--color-border)',
                  background: mode === m ? 'var(--color-brand)' : '#fff',
                  color: mode === m ? '#fff' : 'var(--color-text-secondary)',
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                }}
              >
                {m === 'product' ? '📦 Product' : '📁 Category'}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <input
            type="text"
            placeholder={`Search ${mode}...`}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); }}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              border: '1px solid var(--color-border)', fontSize: '14px',
              outline: 'none', marginBottom: '12px',
            }}
            autoFocus
          />

          {/* Results */}
          <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            {isLoading && <p style={{ padding: '12px', color: 'var(--color-text-muted)', fontSize: '13px' }}>Searching...</p>}
            {!isLoading && query.length >= 2 && (!results || results.length === 0) && (
              <p style={{ padding: '12px', color: 'var(--color-text-muted)', fontSize: '13px' }}>No results found.</p>
            )}
            {results?.map(item => (
              <div
                key={item._id}
                onClick={() => setSelected(item)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', fontSize: '13px',
                  borderBottom: '1px solid var(--color-border)',
                  background: selected?._id === item._id ? '#FFF5F5' : '#fff',
                  borderLeft: selected?._id === item._id ? '3px solid var(--color-brand)' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}
              >
                {mode === 'product' && (
                  <img src={item.media?.[0]} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px', background: '#fafafa' }} onError={e => e.target.style.display = 'none'} />
                )}
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{item.name}</p>
                  {mode === 'product' && <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '11px' }}>{item.sku} · {item.category?.name}</p>}
                </div>
                {selected?._id === item._id && <CheckCircle size={16} color="var(--color-brand)" style={{ marginLeft: 'auto' }} />}
              </div>
            ))}
          </div>

          {selected && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#FFF5F5', borderRadius: '8px', border: '1px solid #FFCCCC', fontSize: '13px' }}>
              ✅ Will add <strong>"{log.term}"</strong> as a searchTag on <strong>{selected.name}</strong>
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-save" onClick={handleAssign} disabled={!selected || saving}>
            {saving ? 'Assigning...' : 'Assign Tag'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Stat Card ─────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div style={{
    background: '#fff', border: '1px solid var(--color-border)', borderRadius: '12px',
    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '140px',
  }}>
    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={20} color={color} />
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{value ?? '—'}</p>
      <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>{label}</p>
    </div>
  </div>
);

/* ── Main Component ────────────────────────────────────────── */
const SearchIntelligence = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter]     = useState('all');   // all | zero | unassigned | assigned
  const [q, setQ]               = useState('');
  const [page, setPage]         = useState(1);
  const [assignLog, setAssignLog] = useState(null);  // log being assigned
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['search-intelligence', filter, q, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit });
      if (filter !== 'all') params.set('filter', filter);
      if (q) params.set('q', q);
      return (await api.get(`/admin/search-intelligence?${params}`)).data?.data;
    },
    keepPreviousData: true,
  });

  const logs      = data?.logs      || [];
  const stats     = data?.stats     || {};
  const total     = data?.total     || 0;
  const totalPages = Math.ceil(total / limit);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/search-intelligence/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['search-intelligence'] }),
  });

  // BUG-031 fix: was using deleteMutation.isPending which dims ALL rows.
  // Track the specific id being deleted instead.
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  const clearAssignedMutation = useMutation({
    mutationFn: () => api.delete('/admin/search-intelligence/bulk-clear'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['search-intelligence'] }),
  });

  const handleClearAssigned = () => {
    if (!window.confirm('Remove all assigned log entries? This keeps your list clean.')) return;
    clearAssignedMutation.mutate();
  };

  const FILTERS = [
    { key: 'all',        label: 'All Terms' },
    { key: 'zero',       label: '🔴 Zero Results' },
    { key: 'unassigned', label: '⏳ Unassigned' },
    { key: 'assigned',   label: '✅ Assigned' },
  ];

  return (
    <div className="admin-section">
      <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="admin-section-title">Search Intelligence</h2>
          <p className="admin-sub-desc" style={{ marginTop: '4px' }}>
            Every term users search is captured here. Assign high-frequency terms as searchTags to products or categories to improve discoverability and SEO.
          </p>
        </div>
        <button
          onClick={handleClearAssigned}
          disabled={clearAssignedMutation.isPending}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', background: '#fff', fontSize: '13px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
        >
          🧹 Clear Assigned
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <StatCard icon={TrendingUp}  label="Total Terms"   value={stats.totalTerms}  color="#2563eb" />
        <StatCard icon={ZapOff}      label="Zero Results"  value={stats.zeroResults} color="#dc2626" />
        <StatCard icon={AlertCircle} label="Unassigned"    value={stats.unassigned}  color="#d97706" />
        <StatCard icon={Zap}         label="Assigned"      value={stats.assigned}    color="#16a34a" />
      </div>

      {/* Filter Tabs + Search */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
        <div className="crm-tabs" style={{ margin: 0 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`crm-tab ${filter === f.key ? 'active' : ''}`}
              onClick={() => { setFilter(f.key); setPage(1); }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Filter by term..."
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            style={{ paddingLeft: '32px', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', outline: 'none', width: '200px' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Search Term</th>
              <th style={{ textAlign: 'center' }}>Searches</th>
              <th style={{ textAlign: 'center' }}>Results Found</th>
              <th>Last Searched</th>
              <th>Assigned To</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>No search logs found.</td></tr>
            ) : logs.map(log => (
              <tr key={log._id} style={{ opacity: deletingId === log._id ? 0.4 : 1 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <code style={{ background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>
                      {log.term}
                    </code>
                    {log.resultCount === 0 && (
                      <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px' }}>
                        NO RESULTS
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ fontWeight: 700, color: log.count >= 10 ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>
                    {log.count}
                  </span>
                </td>
                <td style={{ textAlign: 'center', color: log.resultCount === 0 ? '#DC2626' : 'var(--color-success)' }}>
                  {log.resultCount}
                </td>
                <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {new Date(log.lastSearchedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td>
                  {log.isAssigned ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-success)' }}>
                      <CheckCircle size={13} />
                      {log.assignedTo?.productId?.name || log.assignedTo?.categoryId?.name || 'Assigned'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>—</span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    {!log.isAssigned && (
                      <button
                        className="btn-edit-tiny"
                        onClick={() => setAssignLog(log)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Tag size={12} /> Assign
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(log._id)}
                      style={{ background: 'none', border: '1px solid #fecaca', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}
                      title="Delete this log"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px' }}>Previous</button>
          <span style={{ fontWeight: 500 }}>Page {page} of {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px' }}>Next</button>
        </div>
      )}

      {/* Assign Modal */}
      {assignLog && (
        <AssignModal
          log={assignLog}
          onClose={() => setAssignLog(null)}
          onAssigned={() => queryClient.invalidateQueries({ queryKey: ['search-intelligence'] })}
        />
      )}
    </div>
  );
};

export default SearchIntelligence;
