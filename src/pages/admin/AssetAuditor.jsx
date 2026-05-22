import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCcw, ExternalLink, Search } from 'lucide-react';
import api from '../../services/api';
import { getCloudinaryUrl, CLOUDINARY_PRESETS } from '../../utils/cloudinary';
import './AssetAuditor.css';

const AssetAuditor = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // BUG-028 fix: was using public /products endpoint which defaults to limit:24.
  // Admin auditor should see ALL products — use admin endpoint with high limit.
  const { data: products, isLoading } = useQuery({
    queryKey: ['products-audit'],
    queryFn: async () => {
      const res = await api.get('/admin/catalog/products?limit=500&page=1');
      return res.data.data.products;
    }
  });

  // 2. Individual Sync Mutation
  const syncItem = useMutation({
    mutationFn: (productId) => api.patch(`/admin/catalog/products/${productId}`, {
      // Logic: If sync is triggered, we should probably fetch the mapped URL from a registry
      // or just mark it as needing a manual upload.
      // For now, let's allow updating a 'syncStatus' or similar.
      isAssetVerified: true
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['products-audit']);
    }
  });

  const filtered = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="auditor-loading">Analyzing Assets...</div>;

  return (
    <div className="btg-asset-auditor">
      <header className="auditor-header">
        <div className="header-left">
          <ShieldCheck size={24} color="var(--color-primary)" />
          <h2>Manual Asset Auditor</h2>
        </div>
        <div className="auditor-search">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search SKU or Name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="auditor-summary">
        <div className="summary-stat">
          <span className="stat-label">Total Catalog</span>
          <span className="stat-value">{products?.length || 0}</span>
        </div>
        <div className="summary-stat warning">
          <span className="stat-label">Legacy Assets</span>
          <span className="stat-value">
            {products?.filter(p => p.media?.[0]?.includes('ibb.co')).length || 0}
          </span>
        </div>
      </div>

      <div className="auditor-grid">
        {filtered?.map((product) => {
          const isLegacy = product.media?.[0]?.includes('ibb.co');
          
          return (
            <div key={product._id} className={`auditor-card ${isLegacy ? 'is-legacy' : ''}`}>
              <div className="card-top">
                <div className="product-info">
                  <span className="sku">{product.sku}</span>
                  <h3 className="name">{product.name}</h3>
                </div>
                {isLegacy ? (
                  <span className="badge legacy">Legacy ImgBB</span>
                ) : (
                  <span className="badge verified">Cloudinary OK</span>
                )}
              </div>

              <div className="image-comparison">
                <div className="img-box">
                  <span className="label">Current Source</span>
                  <div className="img-wrap">
                    <img src={product.media?.[0]} alt="Current" />
                  </div>
                </div>
                
                {isLegacy && (
                  <div className="img-box preview">
                    <span className="label">Cloudinary (Preview)</span>
                    <div className="img-wrap">
                      <div className="placeholder-preview">
                        <ImageIcon size={24} />
                        <span>Ready for Sync</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="card-actions">
                {/* BUG-029 fix: was /product/:slug — correct route is /catalog/:slug */}
                <a 
                  href={`/catalog/${product.slug}`} 
                  target="_blank" 
                  className="btn-secondary"
                  rel="noreferrer"
                >
                  <ExternalLink size={14} /> View Live
                </a>
                
                {isLegacy && (
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      // Manual intervention: Prompt or logic for sync
                      alert('Manual Inspection Protocol: Please update this asset via Single Product Uploader in Catalog Manager for 100% integrity.');
                    }}
                  >
                    <RefreshCcw size={14} /> Manual Fix
                  </button>
                )}
                
                {!isLegacy && (
                  <div className="verified-status">
                    <CheckCircle2 size={16} /> Verified Integrity
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AssetAuditor;
