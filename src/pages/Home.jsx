import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Truck, ShieldCheck, Grid3x3, Download } from 'lucide-react';
import api, { authApi } from '../services/api';
import ProductCard from '../components/molecules/ProductCard';
import { useAnalytics } from '../hooks/useAnalytics';
import { useEffect, useState } from 'react';
import SEO from '../components/SEO';
import BannerSlider from '../components/organisms/BannerSlider';
import { useAuth } from '../context/AuthContext';
import { pdf } from '@react-pdf/renderer';
import CatalogDocument from '../components/pdf/CatalogDocument';
import { usePdfCache, getCachedPdf, logPdfDownload } from '../hooks/usePdfCache';
// BUG-001 fix: import must be at top of file, not after component declarations
import { CATEGORIES, getCategoryLogo } from '../utils/constants';
import './Home.css';

const fetchFeatured = async () =>
  (await api.get('/products', { params: { limit: 12, page: 1 } })).data.data;

const fetchByCategory = async (categorySlug) =>
  (await api.get('/products', { params: { category: categorySlug, limit: 6 } })).data.data;

const TRUST = [
  { icon: <Truck size={16} />,        text: 'Nationwide Delivery' },
  { icon: <ShieldCheck size={16} />,  text: 'Verified B2B Pricing' },
  { icon: <Grid3x3 size={16} />,      text: '500+ Products' },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const isDealer = isAuthenticated && (user?.role === 'dealer' || user?.role === 'admin' || user?.role === 'editor');
  const { data, isLoading } = useQuery({ queryKey: ['featured'], queryFn: fetchFeatured });
  const { data: brandingData } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => (await api.get('/branding')).data?.data
  });

  const products = data?.products || [];
  const { trackPageView } = useAnalytics();
  const [downloadingSlug, setDownloadingSlug] = useState(null);
  const whatsapp = brandingData?.config?.contact?.whatsapp || import.meta.env.VITE_WHATSAPP_NUMBER || '';

  // Pre-fetch PDFs on WiFi for dealers
  usePdfCache(isDealer);

  useEffect(() => {
    trackPageView('Bangladesh\'s #1 Tyre Wholesale Network');
  }, []);

  const handleCategoryPDF = async (e, slug, label) => {
    e.preventDefault();
    e.stopPropagation();
    if (downloadingSlug) return;
    setDownloadingSlug(slug);
    try {
      // 1. Check device cache first
      const cached = await getCachedPdf(slug);
      if (cached) {
        const url = URL.createObjectURL(cached.blob);
        const a = document.createElement('a');
        a.href = url;
        // Bug fix: always include date for consistent naming
        a.download = `BadolTyreGhar_${label.replace(/\s+/g, '')}_${new Date().toISOString().slice(0,10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        logPdfDownload(slug, cached.versionHash, true);
        return;
      }

      // 2. Generate fresh
      const params = new URLSearchParams({ category: slug, limit: '500' });
      const res = await authApi.get('/catalog', { params });
      const prods = res.data?.data?.products || [];

      const blob = await pdf(
        <CatalogDocument products={prods} categoryName={label} whatsapp={whatsapp} />
      ).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BadolTyreGhar_${label.replace(/\s+/g, '')}_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      logPdfDownload(slug, null, false);
    } catch (err) {
      console.error('PDF error:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setDownloadingSlug(null);
    }
  };

  return (
    <div className="home-root">
      <SEO 
        title="Wholesale Tyres & Tubes" 
        description="Bangladesh's leading wholesale B2B platform for premium tyres, tubes, and flaps. View our catalog and verified pricing." 
      />

      {/* Hero / Banners */}
      {brandingData?.banners?.length > 0 ? (
        <BannerSlider banners={brandingData.banners} />
      ) : (
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-left">
              <h1 className="hero-headline">
                {brandingData?.config?.branding?.slogan || 'PREMIUM QUALITY AT WHOLESALE RATES'}
              </h1>
              <p className="hero-subtext">{brandingData?.config?.branding?.name || 'Badol Tyre Ghar'}</p>
              <div className="hero-info-box">
                <span className="hero-info-label">➤ For More Info:</span>
                <a href={`tel:+${import.meta.env.VITE_WHATSAPP_NUMBER}`} className="hero-info-phone">
                  {import.meta.env.VITE_WHATSAPP_NUMBER}
                </a>
              </div>
              <p className="hero-tagline">PREMIUM · PERFORMANCE · TRUSTED</p>
              {/* BUG-002/003 fix: removed broken /catalog.pdf link (404) and
                  duplicate btn-hero-primary that stacked for logged-in users */}
              <Link to="/catalog" className="btn-hero-primary">
                Browse Catalog <ArrowRight size={15} />
              </Link>
            </div>
            <div className="hero-right">
              <div className="hero-visual">
                <img src="https://i.ibb.co/q3d02v7G/1.jpg" alt="Product 1" className="hero-img img-1" />
                <img src="https://i.ibb.co/wNKpZbS6/2.jpg" alt="Product 2" className="hero-img img-2" />
                <img src="https://i.ibb.co/JR787JRT/1.jpg" alt="Product 3" className="hero-img img-3" />
                <div className="hero-badge">
                  <span>BTG</span>
                  <small>SINCE 1998</small>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}



      {/* Trust Strip */}
      <div className="trust-strip">
        <div className="trust-strip-inner">
          {TRUST.map(({ icon, text }) => (
            <div key={text} className="trust-item">
              <span className="trust-item-icon">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Categories */}
      <div className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">Top Categories</h2>
          <Link to="/catalog" className="home-view-all">See All <ArrowRight size={14} /></Link>
        </div>
        <div className="category-grid">
          {CATEGORIES.map(({ label, slug }) => (
            <Link key={slug} to={`/catalog?category=${slug}`} className="category-card">
              <img src={getCategoryLogo(slug)} alt={label} className="category-card-img" loading="lazy" />
              <p className="category-card-label">{label}</p>
              {isDealer && (
                <button
                  className={`category-pdf-btn ${downloadingSlug === slug ? 'loading' : ''}`}
                  onClick={(e) => handleCategoryPDF(e, slug, label)}
                  title={`Download ${label} PDF`}
                  disabled={!!downloadingSlug}
                >
                  {downloadingSlug === slug
                    ? <span className="pdf-spinner" />
                    : <><Download size={11} /> PDF</>
                  }
                </button>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Hot Deals — Featured Products */}
      <div className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">🔥 Hot Deals</h2>
          <Link to="/catalog" className="home-view-all">View All <ArrowRight size={14} /></Link>
        </div>
        <div className="home-product-grid">
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="product-card-skeleton" />
              ))
            : products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))
          }
        </div>
        <Link to="/catalog" className="btn-view-more">View More</Link>
      </div>

      {/* Category-Specific Sections */}
      <CategorySection 
        title="🛡️ Tyre Sealants" 
        slug="tyre-sealants" 
        fetchFn={fetchByCategory} 
      />

      <CategorySection 
        title="🩹 Premium Patches" 
        slug="patches" 
        fetchFn={fetchByCategory} 
      />

      <CategorySection 
        title="⚙️ Professional Gadgets" 
        slug="gadgets" 
        fetchFn={fetchByCategory} 
      />

      {/* CTA */}
      <section className="home-cta">
        <h2>Ready to order at wholesale prices?</h2>
        <p>Register and apply for B2B dealer verification to unlock exclusive pricing.</p>
        <Link to="/login" className="btn-cta">Get Started <ArrowRight size={16} /></Link>
      </section>

    </div>
  );
}

function CategorySection({ title, slug, fetchFn }) {
  const { data, isLoading } = useQuery({ 
    queryKey: ['home-cat', slug], 
    queryFn: () => fetchFn(slug) 
  });
  
  const products = data?.products || [];

  if (!isLoading && products.length === 0) return null;

  return (
    <div className="home-section">
      <div className="home-section-header">
        <h2 className="home-section-title">{title}</h2>
        <Link to={`/catalog?category=${slug}`} className="home-view-all">
          See All <ArrowRight size={14} />
        </Link>
      </div>
        <div className="home-product-grid">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="product-card-skeleton" />
              ))
            : products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))
          }
        </div>
    </div>
  );
}

