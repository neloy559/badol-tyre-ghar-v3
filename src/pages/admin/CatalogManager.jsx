import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, ImagePlus, Eye, X, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { CATEGORIES } from '../../utils/constants';

const EXPECTED_COLS = ['sku', 'name', 'size', 'pattern', 'ply', 'designModel', 'retailPrice', 'wholesalePrice', 'stock', 'image'];

const CatalogManager = () => {
  const queryClient = useQueryClient();

  // --- 1. Basic State ---
  const [activeTab, setActiveTab] = useState('single');
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 100;

  // --- 2. Single Form State ---
  const [singleForm, setSingleForm] = useState({
    name: '', sku: '', brand: '', category: '',
    size: '', pattern: '', ply: 'STD', designModel: 'DEF',
    retailPrice: '', wholesalePrice: ''
  });
  const [existingMedia, setExistingMedia] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [singleError, setSingleError] = useState('');
  const [singleSuccess, setSingleSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // --- 3. Bulk Upload State ---
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // --- 4. Refs ---
  const imageInputRef = useRef();
  const fileInputRef = useRef();

  // --- 5. Data Queries ---
  const { data: brandsData } = useQuery({ 
    queryKey: ['brands'], 
    queryFn: async () => (await api.get('/products/brands')).data?.data || [] 
  });
  const brands = Array.isArray(brandsData) ? brandsData : [];

  const { data: adminResponse, isLoading: loadingList } = useQuery({
    queryKey: ['products-list', page],
    queryFn: async () => (await api.get(`/admin/catalog/products?page=${page}&limit=${limit}`)).data?.data
  });
  const catalogProducts = adminResponse?.products || [];
  const totalProducts = adminResponse?.total || 0;
  const totalPages = Math.ceil(totalProducts / limit);

  // --- 6. Memoized Values ---
  const filteredBrands = useMemo(() => {
    if (!brands.length) return [];
    const cat = singleForm?.category;
    if (!cat) return brands.filter(b => b.isActive !== false);
    return brands.filter(b => b.isActive !== false && (b.categories?.includes(cat) || b.categories?.length === 0));
  }, [brands, singleForm?.category]);

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(catalogProducts) ? catalogProducts : [];
    if (!searchTerm) return list;
    const s = searchTerm.toLowerCase();
    return list.filter(p => 
      (p.name?.toLowerCase() || '').includes(s) || 
      (p.sku?.toLowerCase() || '').includes(s)
    );
  }, [catalogProducts, searchTerm]);

  // --- 7. Callbacks & Business Logic ---
  const handleEdit = useCallback((product) => {
    if (!product) return;
    setEditingId(product._id);
    const categorySlug = product.category?.slug || product.category || '';
    const brandId = product.brand?._id || product.brand || '';
    setSingleForm({
      name: product.name || '',
      sku: product.sku || '',
      brand: brandId,
      category: categorySlug,
      size: product.commonSpecs?.size || '',
      pattern: product.commonSpecs?.pattern || '',
      ply: product.variants?.[0]?.ply || 'STD',
      designModel: product.variants?.[0]?.designModel || 'DEF',
      retailPrice: product.variants?.[0]?.pricing?.retail || product.variants?.[0]?.price || '',
      wholesalePrice: product.variants?.[0]?.pricing?.wholesale || ''
    });
    setExistingMedia(product.media || []);
    setNewFiles([]);
    setActiveTab('single');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setSingleForm({ name: '', sku: '', brand: '', category: '', size: '', pattern: '', ply: 'STD', designModel: 'DEF', retailPrice: '', wholesalePrice: '' });
    setExistingMedia([]);
    setNewFiles([]);
    setSingleSuccess('');
    setSingleError('');
  }, []);

  const backToList = useCallback(() => {
    cancelEdit();
    setActiveTab('list');
  }, [cancelEdit]);

  const uploadBulk = useMutation({
    mutationFn: (products) => api.post('/admin/catalog/products/bulk-upload', { products }),
    onSuccess: (res) => {
      setResult(res.data.data);
      setRows([]);
      setFileName('');
      queryClient.invalidateQueries(['products-list']);
    },
    onError: (err) => setError(err.response?.data?.message || 'Upload failed.'),
  });

  const parseFile = useCallback((file) => {
    setError(''); setResult(null); setRows([]);
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setError('Only CSV, XLSX, or XLS files are supported.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!raw.length) { setError('The file appears to be empty.'); return; }
      const normalized = raw.map((row) => {
        const out = {};
        for (const k of Object.keys(row)) out[k.trim().toLowerCase().replace(/\s+/g, '')] = row[k];
        return out;
      });
      const mapped = normalized.map((r) => ({
        sku:            r.sku         || r['product_code'] || '',
        name:           r.name        || r['product_name'] || '',
        brand:          r.brand       || r['brand_name']   || '',
        category:       r.category    || r['cat']          || '',
        size:           r.size        || r['tyre_size']    || '',
        pattern:        r.pattern     || '',
        ply:            r.ply         || r['pr']           || '',
        designModel:    r.designmodel || r['design']       || r['model'] || '',
        retailPrice:    r.retailprice || r['retail_price'] || r['mrp']   || 0,
        wholesalePrice: r.wholesaleprice || r['wholesale_price'] || r['dealer_price'] || 0,
        stock:          r.stock       || 0,
        image:          r.catimg2 || r['catimg1:1'] || r['1:1image'] || r.catimg2square || '',
      }));
      const valid = mapped.filter((r) => r.sku && r.name);
      if (!valid.length) { setError('No valid rows found.'); return; }
      setRows(valid);
    };
    reader.readAsBinaryString(file);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    parseFile(e.dataTransfer.files[0]);
  }, [parseFile]);

  const handleImageDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/'));

    // BUG-022 fix: size guard was checking dropped files vs newFiles BEFORE adding them,
    // so multi-drop could bypass the 3MB limit. Now checks total accumulated size.
    const droppedSize   = validFiles.reduce((acc, f) => acc + f.size, 0);
    const existingSize  = newFiles.reduce((acc, f) => acc + f.size, 0);
    const existingMediaSize = 0; // existing media are already uploaded, don't count

    if (droppedSize + existingSize > 3 * 1024 * 1024) {
      setSingleError(`Total new images cannot exceed 3MB. Please compress your images.`);
      return;
    }

    if (validFiles.length) {
      setNewFiles(prev => [...prev, ...validFiles]);
      setSingleError('');
    }
  }, [newFiles]);

  const submitSingleProduct = async (e) => {
    e.preventDefault();
    setSingleError(''); setSingleSuccess('');
    
    try {
      setIsUploadingImage(true);
      let newUrls = [];

      if (newFiles.length > 0) {
        try {
          // Convert all files to Base64 to avoid Multipart/form-data issues on Vercel
          const base64Images = await Promise.all(newFiles.map(file => {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve(reader.result);
              reader.onerror = error => reject(error);
            });
          }));

          const uploadRes = await api.post('/admin/catalog/upload', { images: base64Images });
          newUrls = uploadRes.data.data.urls || (uploadRes.data.data.url ? [uploadRes.data.data.url] : []);
        } catch (uploadErr) {
          if (editingId && existingMedia.length > 0) {
            const detail = uploadErr.response?.data?.message || uploadErr.message || 'Cloudinary error';
            setSingleError(`⚠️ Image upload failed (${detail}). Saving with existing image(s) only.`);
          } else {
            throw new Error(uploadErr.response?.data?.message || 'Failed to upload images to Cloudinary.');
          }
        }
      }

      const finalMedia = [...existingMedia, ...newUrls];
      if (finalMedia.length === 0) return setSingleError('Please upload at least one image.');

      const payload = {
        name: singleForm.name,
        sku: singleForm.sku,
        brand: singleForm.brand,
        category: singleForm.category,
        media: finalMedia,
        commonSpecs: { size: singleForm.size, pattern: singleForm.pattern },
        variants: [{
          sku: `${singleForm.sku}-${singleForm.ply}-${singleForm.designModel}`,
          ply: singleForm.ply,
          designModel: singleForm.designModel,
          pricing: { retail: +singleForm.retailPrice, wholesale: +singleForm.wholesalePrice },
          inventory: { stock: 0 }
        }]
      };

      if (editingId) {
        await api.patch(`/admin/catalog/products/${editingId}`, payload);
        setSingleSuccess(`✅ Product "${singleForm.name}" updated successfully!`);
      } else {
        await api.post('/admin/catalog/products', payload);
        setSingleSuccess(`✅ Product "${singleForm.name}" created successfully!`);
        cancelEdit();
      }
      
      queryClient.invalidateQueries(['products-list']);
      queryClient.invalidateQueries(['products']);
    } catch (err) {
      setSingleError(err.response?.data?.message || err.message || 'Failed to save product.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // BUG-023 fix: URL.createObjectURL called inline in JSX creates a new object URL
  // on every render and never revokes them — memory leak. Use useMemo + cleanup.
  const newFilePreviewUrls = useMemo(() => newFiles.map(f => URL.createObjectURL(f)), [newFiles]);
  useEffect(() => {
    return () => { newFilePreviewUrls.forEach(url => URL.revokeObjectURL(url)); };
  }, [newFilePreviewUrls]);

  useEffect(() => {
    const stored = sessionStorage.getItem('btg_edit_product');
    if (stored) {
      sessionStorage.removeItem('btg_edit_product');
      try {
        const product = JSON.parse(stored);
        if (product) setTimeout(() => handleEdit(product), 300);
      } catch (e) { console.error('Failed to parse stored product', e); }
    }
  }, [handleEdit]);

  return (
    <div className="admin-section">
      <div className="admin-section-header catalog-header-flex">
        <h2 className="admin-section-title">Catalog Manager</h2>
        {editingId && (
          <button 
            className="btn-secondary" 
            onClick={backToList}
          >
            <ArrowLeft size={16} /> Back to Product List
          </button>
        )}
      </div>
      
      <div className="crm-tabs" style={{ marginBottom: '20px' }}>
        <button className={`crm-tab ${activeTab === 'single' ? 'active' : ''}`} onClick={() => setActiveTab('single')}>
          {editingId ? 'Edit Product' : 'Add Single Product'}
        </button>
        <button className={`crm-tab ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>All Products</button>
        <button className={`crm-tab ${activeTab === 'bulk' ? 'active' : ''}`} onClick={() => setActiveTab('bulk')}>Bulk CSV Upload</button>
      </div>

      {activeTab === 'single' && (
        <div className="single-upload-form">
          <form onSubmit={submitSingleProduct} className="campaign-form">
            <div className="form-row">
              <div className="form-field"><label>Product Name*</label><input type="text" required value={singleForm.name} onChange={e=>setSingleForm({...singleForm, name: e.target.value})} /></div>
              <div className="form-field"><label>Master SKU*</label><input type="text" required value={singleForm.sku} onChange={e=>setSingleForm({...singleForm, sku: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Brand*</label>
                <select required value={singleForm.brand} onChange={e=>setSingleForm({...singleForm, brand: e.target.value})}>
                  <option value="">Select Brand</option>
                  {filteredBrands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                {singleForm.category && <small style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{filteredBrands.length} brands available for this category</small>}
              </div>
              <div className="form-field">
                <label>Category*</label>
                <select required value={singleForm.category} onChange={e => {
                  const newCat = e.target.value;
                  const currentBrand = brands?.find(b => b._id === singleForm.brand);
                  const brandStillValid = currentBrand?.categories?.includes(newCat);
                  setSingleForm(prev => ({
                    ...prev,
                    category: newCat,
                    brand: brandStillValid ? prev.brand : ''
                  }));
                }}>
                  <option value="">Select Category</option>
                  {(CATEGORIES || []).map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-field"><label>Size</label><input type="text" value={singleForm.size} onChange={e=>setSingleForm({...singleForm, size: e.target.value})} /></div>
              <div className="form-field"><label>Pattern</label><input type="text" value={singleForm.pattern} onChange={e=>setSingleForm({...singleForm, pattern: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-field"><label>Retail Price* (৳)</label><input type="number" required value={singleForm.retailPrice} onChange={e=>setSingleForm({...singleForm, retailPrice: e.target.value})} /></div>
              <div className="form-field"><label>Wholesale Price* (৳)</label><input type="number" required value={singleForm.wholesalePrice} onChange={e=>setSingleForm({...singleForm, wholesalePrice: e.target.value})} /></div>
            </div>


            
            <div className="form-field" style={{ marginTop: '1rem' }}>
              <label>Images (Cloudinary Dynamic Sync)*</label>
              <div 
                className={`drop-zone ${(existingMedia.length > 0 || newFiles.length > 0) ? 'has-file' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleImageDrop}
                onClick={(e) => {
                   if(!e.target.closest('.remove-img-btn')) imageInputRef.current.click();
                }}
              >
                <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageDrop} />
                {(existingMedia.length > 0 || newFiles.length > 0) ? (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '10px' }}>
                    {existingMedia.map((url, i) => (
                      <div key={'ex'+i} style={{ position: 'relative' }}>
                        <img src={url} alt="Preview" style={{ height: '80px', borderRadius: '8px', objectFit: 'contain' }} />
                        <button type="button" className="remove-img-btn" onClick={(e) => { e.stopPropagation(); setExistingMedia(prev => prev.filter((_, idx) => idx !== i)); }} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: '12px' }}>&times;</button>
                      </div>
                    ))}
                    {newFiles.map((file, i) => (
                      <div key={'new'+i} style={{ position: 'relative' }}>
                        <img src={newFilePreviewUrls[i]} alt="Preview" style={{ height: '80px', borderRadius: '8px', objectFit: 'contain', border: '2px dashed var(--color-primary)' }} />
                        <button type="button" className="remove-img-btn" onClick={(e) => { e.stopPropagation(); setNewFiles(prev => prev.filter((_, idx) => idx !== i)); }} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: '12px' }}>&times;</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <ImagePlus size={36} color="var(--color-text-muted)" />
                    <p className="drop-zone-label">Drag & Drop Images Here</p>
                    <p className="drop-zone-sub">Total max 3MB for all images combined.</p>
                  </>
                )}
              </div>
            </div>

            {singleError && <div className="upload-error"><AlertCircle size={16}/> {singleError}</div>}
            {singleSuccess && <div className="upload-result"><CheckCircle2 size={16}/> {singleSuccess}</div>}

            <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-markup" disabled={isUploadingImage} style={{ flex: 1 }}>
                {isUploadingImage ? 'Processing...' : (editingId ? 'Update Product' : 'Create Product')}
              </button>
              {editingId && (
                <button type="button" className="btn-secondary" onClick={backToList}>Cancel</button>
              )}
            </div>
          </form>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="catalog-list-section">
          <div className="list-filters" style={{ marginBottom: '15px' }}>
            <input 
              type="text" 
              className="admin-search-input" 
              placeholder="Search by SKU or Name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}
            />
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th className="hide-mobile">SKU</th>
                  <th>Product Name</th>
                  <th className="hide-mobile">Brand</th>
                  <th className="hide-mobile">Category</th>
                  <th>Retail / Wholesale</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center' }}>Loading products...</td></tr>
                ) : filteredProducts?.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center' }}>No products found.</td></tr>
                ) : filteredProducts?.map(p => {
                  const catSlug = p.category?.slug || p.category || '—';
                  const catName = p.category?.name || catSlug;
                  const brandName = p.brand?.name || p.brand || '—';
                  const retail = p.variants?.[0]?.pricing?.retail ?? p.variants?.[0]?.price ?? '—';
                  const wholesale = p.variants?.[0]?.pricing?.wholesale ?? '—';
                  return (
                    <tr key={p._id}>
                      <td><img src={p.media?.[0]} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px' }} onError={e => { e.target.style.opacity='0.3'; }} /></td>
                      <td className="hide-mobile"><code style={{ fontSize: '12px' }}>{p.sku}</code></td>
                      <td style={{ maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</td>
                      <td className="hide-mobile" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{brandName}</td>
                      <td className="hide-mobile"><span className="badge-cat">{catSlug}</span></td>
                      <td>৳{retail} / ৳{wholesale}</td>
                      <td>
                        <button className="btn-edit-tiny" onClick={() => handleEdit(p)}>Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination-wrap" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
              <button 
                className="btn-secondary" 
                disabled={page <= 1} 
                onClick={() => { setPage(prev => prev - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                style={{ padding: '8px 16px' }}
              >
                Previous
              </button>
              <span style={{ fontWeight: '500' }}>Page {page} of {totalPages} ({totalProducts} total)</span>
              <button 
                className="btn-secondary" 
                disabled={page >= totalPages} 
                onClick={() => { setPage(prev => prev + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                style={{ padding: '8px 16px' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="bulk-upload-section">
          <p className="admin-sub-desc">Upload master inventory CSV/Excel. Columns: <code>sku, name, size, pattern, ply, designModel, retailPrice, wholesalePrice, stock, image</code></p>
          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''} ${rows.length ? 'has-file' : ''}`}
            onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)} onClick={() => !rows.length && fileInputRef.current.click()}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={(e) => parseFile(e.target.files[0])} />
            {rows.length ? (
              <div className="drop-zone-success">
                <FileSpreadsheet size={36} color="var(--color-success)" />
                <p className="drop-zone-filename">{fileName}</p>
                <p className="drop-zone-count">{rows.length} valid products parsed</p>
                <button className="drop-zone-clear" onClick={(e) => { e.stopPropagation(); setRows([]); setFileName(''); setResult(null); }}><X size={14} /> Clear</button>
              </div>
            ) : (
              <>
                <Upload size={36} color="var(--color-text-muted)" />
                <p className="drop-zone-label">Drop your CSV / Excel file here</p>
                <p className="drop-zone-sub">or click to browse</p>
              </>
            )}
          </div>
          {error && <div className="upload-error"><AlertCircle size={16} /> {error}</div>}
          {result && <div className="upload-result"><CheckCircle2 size={16} /><span>Done! <strong>{result.inserted}</strong> new, <strong>{result.updated}</strong> updated.</span></div>}
          {rows.length > 0 && (
            <div className="upload-actions">
              <button className="btn-preview" onClick={() => setPreview(!preview)}><Eye size={14} /> {preview ? 'Hide' : 'Preview'}</button>
              <button className="btn-markup" onClick={() => uploadBulk.mutate(rows)} disabled={uploadBulk.isPending}>
                {uploadBulk.isPending ? 'Uploading...' : `🚀 Upload ${rows.length} Products`}
              </button>
            </div>
          )}
          {preview && rows.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table catalog-preview-table">
                <thead><tr>{EXPECTED_COLS.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>{rows.slice(0, 20).map((r, i) => <tr key={i}>{EXPECTED_COLS.map((c) => <td key={c}>{r[c] || '—'}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CatalogManager;
