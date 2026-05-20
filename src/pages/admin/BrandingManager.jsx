import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image as ImageIcon, Plus, Trash2, Save, MoveUp, MoveDown, 
  ExternalLink, Check, AlertCircle, Info, UploadCloud
} from 'lucide-react';
import api from '../../services/api';
import './BrandingManager.css';

export default function BrandingManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('banners'); // 'banners' or 'config'
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch Data ───────────────────────────────────────────────
  const { data: banners, isLoading: loadingBanners } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => (await api.get('/branding/admin/banners')).data.data
  });

  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => (await api.get('/branding/admin/config')).data.data
  });

  // ── Mutations ────────────────────────────────────────────────
  const updateConfig = useMutation({
    mutationFn: (payload) => api.patch('/branding/admin/config', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['branding']);
      showToast('Settings updated successfully!');
    },
    onError: (err) => showToast(err.response?.data?.message || 'Update failed', 'error')
  });

  const createBanner = useMutation({
    mutationFn: (payload) => api.post('/branding/admin/banners', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-banners']);
      showToast('Banner created!');
    }
  });

  const updateBanner = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/branding/admin/banners/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-banners']);
      showToast('Banner updated!');
    }
  });

  const deleteBanner = useMutation({
    mutationFn: (id) => api.delete(`/branding/admin/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-banners']);
      showToast('Banner deleted.');
    }
  });

  // ── Helpers ──────────────────────────────────────────────────
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      updateConfig.mutate({ logo: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleAddBanner = () => {
    createBanner.mutate({
      title: 'New Promotional Banner',
      subtext: 'Special offer description',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1200',
      link: '/catalog',
      order: banners?.length || 0,
      isActive: false
    });
  };

  if (loadingBanners || loadingConfig) return <div className="admin-loading">Loading Branding Settings...</div>;

  return (
    <div className="branding-manager">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`admin-toast ${toast.type === 'error' ? 'error' : 'success'}`}
          >
            {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="branding-header">
        <div>
          <h1 className="admin-page-title">Branding & Visuals</h1>
          <p className="admin-page-sub">Manage your site logo, banners, and global presence</p>
        </div>
        <div className="branding-tabs">
          <button className={`tab-btn ${activeTab === 'banners' ? 'active' : ''}`} onClick={() => setActiveTab('banners')}>Banners</button>
          <button className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>Site Settings</button>
        </div>
      </div>

      {activeTab === 'banners' ? (
        <div className="banners-section">
          <div className="section-actions">
            <button className="btn-add" onClick={handleAddBanner}>
              <Plus size={18} /> Add New Banner
            </button>
          </div>

          <div className="banners-grid">
            {banners?.map((banner, index) => (
              <div key={banner._id} className={`banner-item-card ${!banner.isActive ? 'disabled' : ''}`}>
                <div className="banner-preview">
                  <img src={banner.image} alt={banner.title} />
                  <div className="banner-badge">{banner.isActive ? 'Active' : 'Draft'}</div>
                </div>
                <div className="banner-fields">
                  <input 
                    type="text" 
                    defaultValue={banner.title} 
                    onBlur={(e) => updateBanner.mutate({ id: banner._id, payload: { title: e.target.value } })}
                    placeholder="Main Headline"
                  />
                  <input 
                    type="text" 
                    defaultValue={banner.subtext} 
                    onBlur={(e) => updateBanner.mutate({ id: banner._id, payload: { subtext: e.target.value } })}
                    placeholder="Subtext"
                  />
                  <div className="input-group">
                    <input 
                      type="text" 
                      defaultValue={banner.link} 
                      onBlur={(e) => updateBanner.mutate({ id: banner._id, payload: { link: e.target.value } })}
                      placeholder="Link URL"
                    />
                    <button className={`toggle-btn ${banner.isActive ? 'active' : ''}`} onClick={() => updateBanner.mutate({ id: banner._id, payload: { isActive: !banner.isActive } })}>
                      {banner.isActive ? <Check size={16} /> : <AlertCircle size={16} />}
                    </button>
                  </div>
                  <div className="banner-card-actions">
                    <div className="order-controls">
                       <button onClick={() => updateBanner.mutate({ id: banner._id, payload: { order: banner.order - 1 } })}><MoveUp size={14}/></button>
                       <button onClick={() => updateBanner.mutate({ id: banner._id, payload: { order: banner.order + 1 } })}><MoveDown size={14}/></button>
                    </div>
                    <button className="btn-delete" onClick={() => confirm('Delete banner?') && deleteBanner.mutate(banner._id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="config-section">
           <div className="config-grid">
              <div className="config-card logo-card">
                 <h3>Site Logo</h3>
                 <div className="logo-preview-box">
                    <img src={config?.logo || '/assets/branding/logo.jpeg'} alt="Site Logo" />
                 </div>
                 <label className="logo-upload-btn">
                    <UploadCloud size={18} /> Upload New Logo
                    <input type="file" hidden onChange={handleLogoUpload} accept="image/*" />
                 </label>
                 <p className="helper-text"><Info size={12}/> Transparent PNG recommended (min 400px width)</p>
              </div>

              <div className="config-card info-card">
                 <h3>Basic Branding</h3>
                 <div className="form-group">
                    <label>Business Name</label>
                    <input 
                      type="text" 
                      defaultValue={config?.branding?.name} 
                      onBlur={(e) => updateConfig.mutate({ 'branding.name': e.target.value })}
                    />
                 </div>
                 <div className="form-group">
                    <label>Marketing Slogan</label>
                    <input 
                      type="text" 
                      defaultValue={config?.branding?.slogan} 
                      onBlur={(e) => updateConfig.mutate({ 'branding.slogan': e.target.value })}
                    />
                 </div>
              </div>

              <div className="config-card contact-card">
                 <h3>Contact Overrides</h3>
                 <div className="form-group">
                    <label>WhatsApp Support</label>
                    <input 
                      type="text" 
                      defaultValue={config?.contact?.whatsapp} 
                      onBlur={(e) => updateConfig.mutate({ 'contact.whatsapp': e.target.value })}
                    />
                 </div>
                 <div className="form-group">
                    <label>Public Address</label>
                    <textarea 
                      defaultValue={config?.contact?.address} 
                      onBlur={(e) => updateConfig.mutate({ 'contact.address': e.target.value })}
                    />
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
