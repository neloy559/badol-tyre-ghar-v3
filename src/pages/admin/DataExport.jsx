import React, { useState } from 'react';
import { Download, FileText, Database, Loader2 } from 'lucide-react';
import api from '../../services/api';

/**
 * BUG-030 fix: plain <a href> sends no Authorization header → always 401.
 * Now uses api.get() with responseType: 'blob' to carry the auth token,
 * then creates a temporary object URL to trigger the browser download.
 */
const DataExport = () => {
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await api.get('/admin/catalog/export/products', {
        responseType: 'blob',
      });

      // Create a temporary link and trigger download
      const url  = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href  = url;
      link.download = `btg_products_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Data Export</h2>
      <p className="admin-sub-desc">Export system data for offline analysis or backup.</p>

      <div className="export-grid">
        <button
          onClick={handleExport}
          disabled={downloading}
          className="export-card"
          style={{ cursor: downloading ? 'not-allowed' : 'pointer', opacity: downloading ? 0.7 : 1, border: 'none', textAlign: 'left' }}
        >
          <div className="export-card-icon">
            {downloading ? <Loader2 size={32} className="spin" /> : <FileText size={32} />}
          </div>
          <div className="export-card-info">
            <p className="export-title">{downloading ? 'Exporting...' : 'Product Catalog'}</p>
            <p className="export-meta">Full list of SKUs, Brands, Categories, and Prices in CSV format.</p>
          </div>
          <div className="export-card-action">
            <Download size={20} />
          </div>
        </button>

        {/* Placeholder for future exports */}
        <div className="export-card export-card--disabled" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
          <div className="export-card-icon">
            <Database size={32} />
          </div>
          <div className="export-card-info">
            <p className="export-title">Dealer Master List</p>
            <p className="export-meta">Coming Soon: Full list of verified dealers and sales partners.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExport;
