import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, RefreshCw, CheckCircle, AlertCircle, Clock, BarChart2, Download, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import api, { authApi } from '../../services/api';
import CatalogDocument from '../../components/pdf/CatalogDocument';
import { logPdfDownload } from '../../hooks/usePdfCache';

const STATUS_CONFIG = {
  ready:      { label: 'Ready',      color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle },
  generating: { label: 'Generating', color: '#d97706', bg: '#fffbeb', icon: Loader2 },
  failed:     { label: 'Failed',     color: '#dc2626', bg: '#fef2f2', icon: AlertCircle },
  pending:    { label: 'Pending',    color: '#6b7280', bg: '#f9fafb', icon: Clock },
};

const CATEGORY_LABELS = {
  'tubes':         'Tubes',
  'tyres':         'Tyres',
  'tyre-sealants': 'Tyre Sealants',
  'patches':       'Patches',
  'flaps':         'Flaps',
  'gadgets':       'Gadgets',
  'all':           'All Products',
};

export default function PdfManager() {
  const queryClient = useQueryClient();
  const [generatingSlug, setGeneratingSlug] = useState(null);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'analytics'

  // ── Fetch manifest ───────────────────────────────────────────
  const { data: manifestData, isLoading } = useQuery({
    queryKey: ['admin-pdf-manifest'],
    queryFn: async () => (await api.get('/admin/pdf/manifest')).data?.data || [],
    refetchInterval: generatingSlug ? 3000 : false, // poll while generating
  });

  // ── Fetch analytics ──────────────────────────────────────────
  const { data: analyticsData } = useQuery({
    queryKey: ['admin-pdf-analytics'],
    queryFn: async () => (await api.get('/admin/pdf/analytics')).data?.data || [],
    enabled: activeTab === 'analytics',
  });

  // ── Fetch branding for whatsapp number ───────────────────────
  const { data: brandingData } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => (await api.get('/branding')).data?.data,
  });
  const whatsapp = brandingData?.config?.contact?.whatsapp || import.meta.env.VITE_WHATSAPP_NUMBER || '';

  // ── Generate PDF for a category ─────────────────────────────
  const handleGenerate = async (categorySlug) => {
    if (generatingSlug) return;
    setGeneratingSlug(categorySlug);

    try {
      // 1. Mark as generating
      await api.post('/admin/pdf/mark-generating', { categorySlug });
      queryClient.invalidateQueries({ queryKey: ['admin-pdf-manifest'] });

      // 2. Fetch products
      const params = new URLSearchParams({ limit: '500' });
      if (categorySlug !== 'all') params.set('category', categorySlug);
      const res = await authApi.get('/catalog', { params });
      const products = res.data?.data?.products || [];

      if (products.length === 0) {
        await api.post('/admin/pdf/mark-failed', { categorySlug, error: 'No products found' });
        queryClient.invalidateQueries({ queryKey: ['admin-pdf-manifest'] });
        alert(`No products found for "${categorySlug}"`);
        return;
      }

      // 3. Generate PDF blob
      const categoryName = CATEGORY_LABELS[categorySlug] || categorySlug;
      const blob = await pdf(
        <CatalogDocument products={products} categoryName={categoryName} whatsapp={whatsapp} />
      ).blob();

      // 4. Upload to Cloudinary via admin upload endpoint
      const formData = new FormData();
      formData.append('images', blob, `btg_catalog_${categorySlug}.pdf`);
      formData.append('folder', 'btg/catalogs');
      formData.append('resourceType', 'raw');

      const uploadRes = await api.post('/admin/catalog/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const pdfUrl = uploadRes.data?.data?.[0]?.url || uploadRes.data?.data?.url;

      if (!pdfUrl) throw new Error('Upload failed — no URL returned');

      // 5. Compute version hash from product IDs + prices (browser-safe)
      const payload = products.map(p => `${p._id}:${p.variants?.[0]?.pricing?.retail || 0}:${p.updatedAt}`).join('|');
      const versionHash = btoa(unescape(encodeURIComponent(payload))).slice(0, 12);

      // 6. Mark as ready
      await api.post('/admin/pdf/mark-ready', {
        categorySlug,
        pdfUrl,
        productCount: products.length,
        versionHash,
      });

      queryClient.invalidateQueries({ queryKey: ['admin-pdf-manifest'] });
      queryClient.invalidateQueries({ queryKey: ['branding'] });

    } catch (err) {
      console.error('PDF generation error:', err);
      await api.post('/admin/pdf/mark-failed', {
        categorySlug,
        error: err.message || 'Unknown error',
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['admin-pdf-manifest'] });
      alert(`Failed to generate PDF for "${categorySlug}": ${err.message}`);
    } finally {
      setGeneratingSlug(null);
    }
  };

  // ── Generate all categories ──────────────────────────────────
  const handleGenerateAll = async () => {
    if (!window.confirm('Regenerate PDFs for ALL categories? This may take a few minutes.')) return;
    const slugs = Object.keys(CATEGORY_LABELS);
    for (const slug of slugs) {
      await handleGenerate(slug);
    }
  };

  const manifests = manifestData || [];

  return (
    <div className="admin-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="admin-section-title">PDF Catalog Manager</h2>
          <p className="admin-sub-desc" style={{ marginTop: '4px' }}>
            Generate and manage downloadable PDF catalogs for B2B dealers. PDFs are dealer-only and include wholesale pricing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleGenerateAll}
            disabled={!!generatingSlug}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              background: 'var(--color-brand)', color: '#fff',
              border: 'none', fontWeight: 600, fontSize: '13px',
              cursor: generatingSlug ? 'not-allowed' : 'pointer',
              opacity: generatingSlug ? 0.6 : 1,
            }}
          >
            <RefreshCw size={15} />
            Regenerate All
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="crm-tabs">
        <button className={`crm-tab ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}>
          📄 Catalog Status
        </button>
        <button className={`crm-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          📊 Download Analytics
        </button>
      </div>

      {activeTab === 'catalog' ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Status</th>
                <th>Products</th>
                <th>Last Generated</th>
                <th>Downloads</th>
                <th>Version</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>Loading...</td></tr>
              ) : manifests.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>No manifest entries yet. Click "Regenerate All" to start.</td></tr>
              ) : manifests.map((m) => {
                const statusCfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusCfg.icon;
                const isThisGenerating = generatingSlug === m.categorySlug;

                return (
                  <tr key={m.categorySlug}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={15} color="var(--color-brand)" />
                        <span style={{ fontWeight: 600 }}>{m.categoryLabel || CATEGORY_LABELS[m.categorySlug]}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        background: statusCfg.bg, color: statusCfg.color,
                        padding: '3px 10px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: 700,
                      }}>
                        <StatusIcon size={11} className={m.status === 'generating' ? 'spin' : ''} />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      {m.productCount || '—'}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {m.generatedAt
                        ? new Date(m.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'
                      }
                    </td>
                    <td style={{ fontWeight: 600, color: m.downloadCount > 0 ? 'var(--color-brand)' : 'var(--color-text-muted)' }}>
                      {m.downloadCount || 0}
                    </td>
                    <td>
                      {m.versionHash
                        ? <code style={{ fontSize: '11px', background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>{m.versionHash}</code>
                        : <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
                      }
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          className="btn-edit-tiny"
                          onClick={() => handleGenerate(m.categorySlug)}
                          disabled={!!generatingSlug}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {isThisGenerating
                            ? <><Loader2 size={12} className="spin" /> Generating...</>
                            : <><RefreshCw size={12} /> Regenerate</>
                          }
                        </button>
                        {m.pdfUrl && (
                          <a
                            href={m.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '4px 10px', borderRadius: '6px',
                              border: '1px solid #BBF7D0', color: '#16a34a',
                              fontSize: '11px', fontWeight: 600, textDecoration: 'none',
                            }}
                          >
                            <Download size={12} /> View
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Analytics Tab */
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: 'center' }}>Total Downloads</th>
                <th style={{ textAlign: 'center' }}>WiFi Downloads</th>
                <th style={{ textAlign: 'center' }}>Cache Hits</th>
                <th style={{ textAlign: 'center' }}>Unique Dealers</th>
                <th>Last Download</th>
              </tr>
            </thead>
            <tbody>
              {!analyticsData || analyticsData.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>No download data yet.</td></tr>
              ) : analyticsData.map((row) => (
                <tr key={row.category}>
                  <td style={{ fontWeight: 600 }}>{CATEGORY_LABELS[row.category] || row.category}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-brand)' }}>{row.totalDownloads}</td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>{row.wifiDownloads}</td>
                  <td style={{ textAlign: 'center', color: '#2563eb' }}>{row.cacheHits}</td>
                  <td style={{ textAlign: 'center' }}>{row.uniqueDealerCount}</td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {row.lastDownload
                      ? new Date(row.lastDownload).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info box */}
      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px',
        padding: '12px 16px', fontSize: '12px', color: '#92400e',
        display: 'flex', alignItems: 'flex-start', gap: '8px',
      }}>
        <span>⏰</span>
        <span>
          <strong>Nightly Auto-Regeneration:</strong> PDFs are automatically regenerated every night at 3:00 AM Bangladesh time (9:00 PM UTC) via the scheduled cron job. You can also force-regenerate any category manually above.
        </span>
      </div>
    </div>
  );
}
