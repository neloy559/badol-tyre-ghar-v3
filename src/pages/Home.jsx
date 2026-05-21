import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Truck, ShieldCheck, Grid3x3 } from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/molecules/ProductCard';
import { useAnalytics } from '../hooks/useAnalytics';
import { useEffect } from 'react';
import SEO from '../components/SEO';
import BannerSlider from '../components/organisms/BannerSlider';
import { useAuth } from '../context/AuthContext';
import './Home.css';


const fetchFeatured = async () =>
  (await api.get('/products', { params: { limit: 12, page: 1 } })).data.data;

const fetchByCategory = async (categorySlug) =>
  (await api.get('/products', { params: { category: categorySlug, limit: 6 } })).data.data;

import { CATEGORIES, getCategoryLogo } from '../utils/constants';

const TRUST = [
  { icon: <Truck size={16} />,        text: 'Nationwide Delivery' },
  { icon: <ShieldCheck size={16} />,  text: 'Verified B2B Pricing' },
  { icon: <Grid3x3 size={16} />,      text: '500+ Products' },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['featured'], queryFn: fetchFeatured });
  const { data: brandingData } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => (await api.get('/branding')).data?.data
  });

  const products = data?.products || [];
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView('Bangladesh\'s #1 Tyre Wholesale Network');
  }, []);

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
              {isAuthenticated && (
                <a href="/catalog.pdf" download className="btn-hero-primary">
                  ডাউনলোড ক্যাটালগ <ArrowRight size={15} />
                </a>
              )}
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

