import React from 'react';
import { Download, FileText, Database } from 'lucide-react';

const DataExport = () => {
  const exportUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/admin/export/products`;

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Data Export</h2>
      <p className="admin-sub-desc">Export system data for offline analysis or backup.</p>

      <div className="export-grid">
        <a href={exportUrl} className="export-card" download>
          <div className="export-card-icon">
            <FileText size={32} />
          </div>
          <div className="export-card-info">
            <p className="export-title">Product Catalog</p>
            <p className="export-meta">Full list of SKUs, Brands, Categories, and Prices in CSV format.</p>
          </div>
          <div className="export-card-action">
            <Download size={20} />
          </div>
        </a>

        {/* Placeholder for future exports */}
        <div className="export-card export-card--disabled">
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
