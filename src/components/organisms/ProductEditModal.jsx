import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ImagePlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { CATEGORIES } from '../../utils/constants';
import './ProductEditModal.css';

const ProductEditModal = ({ product, isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const imageInputRef = useRef();

  // --- Form State ---
  const [form, setForm] = useState({
    name: '', sku: '', brand: '', category: '',
    size: '', pattern: '', ply: 'STD', designModel: 'DEF',
    retailPrice: '', wholesalePrice: ''
  });
  const [existingMedia, setExistingMedia] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // --- Fetch Brands ---
  const { data: brandsData } = useQuery({ 
    queryKey: ['brands'], 
    queryFn: async () => (await api.get('/products/brands')).data?.data || [] 
  });
  const brands = Array.isArray(brandsData) ? brandsData : [];

  // --- Filter Brands by Category ---
  const filteredBrands = useMemo(() => {
    if (!brands.length) return [];
    const cat = form.category;
    if (!cat) return brands.filter(b => b.isActive !== false);
    return brands.filter(b => b.isActive !== false && (b.categories?.includes(cat) || b.categories?.length === 0));
  }, [brands, form.category]);

  // --- Initialize Form if Editing ---
  useEffect(() => {
    if (product && isOpen) {
      const categorySlug = product.category?.slug || product.category || '';
      const brandId = product.brand?._id || product.brand || '';
      setForm({
        name: product.name || '',
        sku: product.sku || '',
        brand: brandId,
        category: categorySlug,
        size: product.commonSpecs?.size || '',
        pattern: product.commonSpecs?.pattern || '',
        ply: product.variants?.[0]?.ply || 'STD',
        designModel: product.variants?.[0]?.designModel || 'DEF',
        retailPrice: product.variants?.[0]?.pricing?.retail ?? product.variants?.[0]?.price ?? '',
        wholesalePrice: product.variants?.[0]?.pricing?.wholesale ?? ''
      });
      setExistingMedia(product.media || []);
      setNewFiles([]);
      setError('');
      setSuccess('');
    }
  }, [product, isOpen]);

  const handleImageSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/'));

    const totalDroppedSize = validFiles.reduce((acc, f) => acc + f.size, 0);
    const existingNewFilesSize = newFiles.reduce((acc, f) => acc + f.size, 0);

    if (totalDroppedSize + existingNewFilesSize > 3 * 1024 * 1024) {
       setError(`Total size of all images combined cannot exceed 3MB.`);
       return;
    }

    if (validFiles.length) {
      setNewFiles(prev => [...prev, ...validFiles]);
      setError(''); 
    }
  }, [newFiles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    try {
      setIsSaving(true);
      let newUrls = [];

      if (newFiles.length > 0) {
        const base64Images = await Promise.all(newFiles.map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = err => reject(err);
          });
        }));
        const uploadRes = await api.post('/admin/catalog/upload', { images: base64Images });
        newUrls = uploadRes.data.data.urls || (uploadRes.data.data.url ? [uploadRes.data.data.url] : []);
      }

      const finalMedia = [...existingMedia, ...newUrls];
      if (finalMedia.length === 0) throw new Error('Please upload at least one image.');

      const payload = {
        name: form.name,
        sku: form.sku,
        brand: form.brand,
        category: form.category,
        media: finalMedia,
        commonSpecs: { size: form.size, pattern: form.pattern },
        variants: [{
          sku: `${form.sku}-${form.ply}-${form.designModel}`,
          ply: form.ply,
          designModel: form.designModel,
          pricing: { retail: +form.retailPrice, wholesale: +form.wholesalePrice },
          inventory: { stock: 0 }
        }]
      };

      await api.patch(`/admin/catalog/products/${product._id}`, payload);
      setSuccess('✅ Product updated successfully!');
      
      queryClient.invalidateQueries({ queryKey: ['products-list'] });
      queryClient.invalidateQueries({ queryKey: ['products-customisation'] });
      
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="btg-modal-overlay" onClick={onClose}>
      <div className="btg-edit-modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h3>Edit Product: {product?.sku}</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-field"><label>Product Name*</label><input type="text" required value={form.name} onChange={e=>setForm({...form, name: e.target.value})} /></div>
            <div className="form-field"><label>Master SKU*</label><input type="text" required value={form.sku} onChange={e=>setForm({...form, sku: e.target.value})} /></div>
            
            <div className="form-field">
              <label>Brand*</label>
              <select required value={form.brand} onChange={e=>setForm({...form, brand: e.target.value})}>
                <option value="">Select Brand</option>
                {filteredBrands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Category*</label>
              <select required value={form.category} onChange={e => setForm({...form, category: e.target.value, brand: ''})}>
                <option value="">Select Category</option>
                {(CATEGORIES || []).map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
              </select>
            </div>

            <div className="form-field"><label>Size</label><input type="text" value={form.size} onChange={e=>setForm({...form, size: e.target.value})} /></div>
            <div className="form-field"><label>Pattern</label><input type="text" value={form.pattern} onChange={e=>setForm({...form, pattern: e.target.value})} /></div>
            
            <div className="form-field"><label>Retail Price*</label><input type="number" required value={form.retailPrice} onChange={e=>setForm({...form, retailPrice: e.target.value})} /></div>
            <div className="form-field"><label>Wholesale Price*</label><input type="number" required value={form.wholesalePrice} onChange={e=>setForm({...form, wholesalePrice: e.target.value})} /></div>
          </div>



          <div className="image-section">
            <label>Product Images (Cloudinary Sync)</label>
            <div 
              className="modal-drop-zone" 
              onClick={() => imageInputRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files);
                handleImageSelect({ target: { files } });
              }}
            >
              <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageSelect} />
              <div className="preview-strip">
                {existingMedia.map((url, i) => (
                  <div key={'ex'+i} className="img-preview">
                    <img src={url} alt="" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); setExistingMedia(prev => prev.filter((_, idx) => idx !== i)); }}>&times;</button>
                  </div>
                ))}
                {newFiles.map((file, i) => (
                  <div key={'new'+i} className="img-preview is-new">
                    <img src={URL.createObjectURL(file)} alt="" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); setNewFiles(prev => prev.filter((_, idx) => idx !== i)); }}>&times;</button>
                  </div>
                ))}
                <div className="add-more"><ImagePlus size={20} /></div>
              </div>
            </div>
          </div>

          {error && <div className="modal-alert error"><AlertCircle size={16}/> {error}</div>}
          {success && <div className="modal-alert success"><CheckCircle2 size={16}/> {success}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSaving}>Cancel</button>
            <button type="submit" className="btn-save" disabled={isSaving}>
              {isSaving ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductEditModal;
