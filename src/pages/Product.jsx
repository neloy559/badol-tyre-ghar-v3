import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, CheckCircle, MessageCircle, ChevronLeft, ChevronRight, MapPin, Wrench, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useAnalytics } from '../hooks/useAnalytics';
import api from '../services/api';
import SEO from '../components/SEO';
import './Product.css';

import { getCategoryLogo, STOCK_LABEL } from '../utils/constants';
import { getCloudinaryUrl, CLOUDINARY_PRESETS } from '../utils/cloudinary';

import ProductCard from '../components/molecules/ProductCard';
import DealerTierBadge from '../components/ui/DealerTierBadge';

const WhatsAppLogo = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);


export default function Product() {
  const { slug }       = useParams();
  const navigate       = useNavigate();
  const { user } = useAuth();
  const isDealer = user?.role === 'dealer';
  const { addToCart: addItem } = useCart();
  const queryClient    = useQueryClient();
  const { trackPageView, logEvent } = useAnalytics();
  const [selectedSku, setSelectedSku]       = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [confirmModal, setConfirmModal]     = useState(false);
  const [added, setAdded] = useState(false);


  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn:  async () => (await api.get(`/products/${slug}`)).data.data,
  });

  // ── More from Category ───────────────────────────────────────
  const { data: moreInCategory } = useQuery({
    queryKey: ['products', 'category', product?.category?.slug],
    queryFn: async () => {
      const res = await api.get(`/products?category=${product.category.slug}&limit=5`);
      return res.data.data.products.filter(p => p.slug !== slug).slice(0, 4);
    },
    enabled: !!product?.category?.slug,
  });

  // ── Recommended (Other Categories) ───────────────────────────
  const { data: recommended } = useQuery({
    queryKey: ['products', 'recommended'],
    queryFn: async () => {
      const res = await api.get('/products?limit=4'); // Standard discovery
      return res.data.data.products.filter(p => p.category?.slug !== product?.category?.slug);
    },
    enabled: !!product,
  });

  // ── Image Navigation ─────────────────────────────────────────
  // BUG-004 fix: auto-rotation was broken because nextImage closed over activeImage,
  // so every rotation changed activeImage → new nextImage ref → interval reset.
  // Fix: use a ref for the current index so nextImage is stable.
  const activeIndexRef = useRef(0);

  const nextImage = useCallback(() => {
    if (!product?.media?.length) return;
    activeIndexRef.current = (activeIndexRef.current + 1) % product.media.length;
    setActiveImage(product.media[activeIndexRef.current]);
  }, [product?.media]);

  const prevImage = useCallback(() => {
    if (!product?.media?.length) return;
    activeIndexRef.current = (activeIndexRef.current - 1 + product.media.length) % product.media.length;
    setActiveImage(product.media[activeIndexRef.current]);
  }, [product?.media]);

  // ── Side Effects ─────────────────────────────────────────────
  useEffect(() => {
    if (product) {
      trackPageView(product.name);
      if (product.media?.length > 0) setActiveImage(product.media[0]);
    }
  }, [product]);

  // Auto-rotation logic
  useEffect(() => {
    if (product?.media?.length > 1) {
      const timer = setInterval(nextImage, 4000); // 4 seconds
      return () => clearInterval(timer);
    }
  }, [product?.media, nextImage]);

  const submitInquiry = useMutation({
    mutationFn: (payload) => api.post('/cart/submit', payload),
    onSuccess: () => setConfirmModal(false),
  });

  if (isLoading) return <div className="product-detail-skeleton" />;
  if (isError)   return <p className="product-detail-error">Product not found.</p>;

  const variant = selectedSku
    ? product.variants.find((v) => v.sku === selectedSku)
    : product.variants?.[0];

  const stock = variant ? STOCK_LABEL[variant.stockLabel] : null;

  const currentMainImage = activeImage || product.media?.[0] || getCategoryLogo(product.category?.slug);

  const formatPhone = (raw) => {
    if (!raw) return '—';
    const clean = raw.replace(/\D/g, '');
    const main = clean.length > 11 ? clean.slice(-11) : clean;
    return `${main.slice(0, 5)}-${main.slice(5)}`;
  };

  const handleAddToCart = () => {
    addItem(product, variant, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const buildWhatsAppMsg = () => {
    // No price in message — customer asks, owner replies manually
    const catSlug = product.category?.slug || '';
    const cs = product.categorySpecs || {};

    // Build category-specific key specs for the message
    const specLines = [];
    if (catSlug.includes('tyre') || catSlug.includes('tube') || catSlug.includes('flap')) {
      if (product.commonSpecs?.size) specLines.push(`Size: ${product.commonSpecs.size}`);
      if (product.commonSpecs?.pattern) specLines.push(`Pattern: ${product.commonSpecs.pattern}`);
      if (variant?.ply || cs.plyRating) specLines.push(`PLY: ${variant?.ply || cs.plyRating}`);
      if (cs.rimSize) specLines.push(`Rim: ${cs.rimSize}`);
      if (cs.vehicleType) specLines.push(`Vehicle: ${cs.vehicleType}`);
    } else if (catSlug.includes('sealant')) {
      if (cs.volume) specLines.push(`Volume: ${cs.volume}`);
      if (cs.formulaType) specLines.push(`Formula: ${cs.formulaType}`);
      if (cs.compatibleWith) specLines.push(`Compatible: ${cs.compatibleWith}`);
    } else if (catSlug.includes('patch')) {
      if (product.commonSpecs?.size) specLines.push(`Size: ${product.commonSpecs.size}`);
      if (cs.patchType) specLines.push(`Type: ${cs.patchType}`);
    } else if (catSlug.includes('gadget')) {
      if (cs.gadgetType) specLines.push(`Type: ${cs.gadgetType}`);
      if (cs.material) specLines.push(`Material: ${cs.material}`);
    } else {
      if (product.commonSpecs?.size) specLines.push(`Size: ${product.commonSpecs.size}`);
      if (variant?.ply) specLines.push(`PLY: ${variant.ply}`);
    }

    const lines = [
      `*Badol Tyre Ghar — Product Inquiry*`,
      `Product: ${product.name}`,
      ...specLines,
      variant?.designModel ? `Model: ${variant.designModel}` : '',
      ``,
      `দয়া করে এই পণ্যের দাম ও প্রাপ্যতা জানাবেন। ধন্যবাদ।`,
    ].filter(Boolean).join('\n');
    return `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines)}`;
  };

  // BUG-005 fix: dedup by SKU not designModel — undefined designModel caused all
  // variants without a model to collapse into one, silently dropping the rest.
  // BUG-006 fix: active chip now compares against selectedSku OR first variant's sku.
  const uniqueVariants = [];
  const seenSkus = new Set();
  product.variants?.forEach(v => {
    if (v.sku && !seenSkus.has(v.sku)) {
      seenSkus.add(v.sku);
      uniqueVariants.push(v);
    }
  });
  const activeVariantSku = selectedSku || product.variants?.[0]?.sku;

  return (
    <div className="product-page-root">
      <SEO 
        title={product.name}
        description={`${product.name} - ${product.brand?.name}. ${product.commonSpecs?.size} ${product.commonSpecs?.pattern}. Available at Badol Tyre Ghar.`}
        image={currentMainImage}
        url={`/catalog/${product.slug}`}
      />
      {/* Breadcrumbs */}
      <div className="product-breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/catalog">Catalog</Link>
        <span>/</span>
        <Link to={`/catalog?category=${product.category?.slug}`}>{product.category?.name}</Link>
        <span>/</span>
        <span className="current">{product.name}</span>
      </div>

      <div className="product-detail">

      {/* Image Gallery */}
      <div className="product-gallery">
        <div className="product-gallery-main-wrapper" style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <picture>
            {currentMainImage && !currentMainImage.includes('category-logos') && (
              <source srcSet={getCloudinaryUrl(currentMainImage, CLOUDINARY_PRESETS.HERO)} type="image/webp" />
            )}
            <img
              src={currentMainImage}
              alt={product.name}
              className={`product-gallery-main ${!product.media?.length ? 'fallback-logo' : ''}`}
              onError={(e) => { 
                e.target.onerror = null;
                e.target.src = getCategoryLogo(product.category?.slug);
                e.target.style.objectFit = 'contain';
                e.target.style.padding = '2rem';
                e.target.style.opacity = '0.5';
              }}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: product.media?.length ? 'cover' : 'contain',
                padding: product.media?.length ? '0' : '2rem'
              }}
            />
          </picture>

          {/* Navigation Controls */}
          {product.media?.length > 1 && (
            <>
              <button className="gallery-nav-btn prev" onClick={prevImage} aria-label="Previous image">
                <ChevronLeft size={24} />
              </button>
              <button className="gallery-nav-btn next" onClick={nextImage} aria-label="Next image">
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
        <div className="product-gallery-thumbs">
          {product.media?.length > 1 && product.media.map((url, i) => (
            <div 
              key={i} 
              className={`product-gallery-thumb-wrap ${activeImage === url ? 'active' : ''}`}
              onClick={() => setActiveImage(url)}
            >
              <picture>
                <source srcSet={getCloudinaryUrl(url, CLOUDINARY_PRESETS.THUMB)} type="image/webp" />
                <img 
                  src={url} 
                  alt={`${product.name} thumbnail ${i+1}`} 
                  className="product-gallery-thumb" 
                  onError={(e) => {
                    e.target.parentElement.parentElement.style.display = 'none';
                  }}
                />
              </picture>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="product-panel">
        <div className="product-panel-meta">
          <span className="product-panel-brand">{product.brand?.name}</span>
          {product.campaign && (
            <span className="product-offer-badge">{product.campaign.badgeText}</span>
          )}
        </div>

        <h1 className="product-panel-name">{product.name}</h1>
        <p className="product-panel-size">{product.commonSpecs?.size} · {product.commonSpecs?.pattern}</p>

        {stock && <span className={`product-stock-tag ${stock.cls}`}>{stock.text}</span>}

        {/* Variant Selector */}
        {uniqueVariants.length > 1 && (
          <div className="product-variants">
            <p className="product-variants-label">Select Brand / Variant</p>
            <div className="product-variants-grid">
              {uniqueVariants.map((v) => (
                <button
                  key={v.sku}
                  className={`variant-chip ${activeVariantSku === v.sku ? 'active' : ''}`}
                  onClick={() => setSelectedSku(v.sku)}
                >
                  {v.ply && <span>{v.ply} Ply</span>}
                  {v.designModel && <span>{v.designModel}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="product-pricing">
          {product.showPrice === false ? (
            <span className="product-price-final">Call for Price</span>
          ) : (
            <>
              {variant?.originalPrice && (
                <span className="product-price-original">৳ {variant.originalPrice.toLocaleString()}</span>
              )}
              <span className="product-price-final">৳ {variant?.price?.toLocaleString() || 'Call for Price'}</span>
              {!user && <p className="product-price-note">Login as B2B dealer for wholesale pricing</p>}
            </>
          )}
        </div>

        {/* Dealer Tier Price Block */}
        {isDealer && product.tierPrice && (
          <div className="product-tier-price-block">
            <DealerTierBadge tier={product.tierPrice.tier} />
            <p className="product-tier-price">Your price: ৳{product.tierPrice.adjustedPrice.toLocaleString()}</p>
            {product.tierPrice.discountPercent > 0 && (
              <p className="product-tier-discount-note">{product.tierPrice.discountPercent}% dealer discount applied</p>
            )}
          </div>
        )}

        {/* Quick Highlights (Daraz Style) */}
        <div className="product-highlights">
          <div className="highlight-item">
             <CheckCircle size={14} className="highlight-icon" />
             <span>Size: <strong>{product.commonSpecs?.size || '—'}</strong></span>
          </div>
          {product.commonSpecs?.pattern && (
            <div className="highlight-item">
               <CheckCircle size={14} className="highlight-icon" />
               <span>Pattern: <strong>{product.commonSpecs.pattern}</strong></span>
            </div>
          )}
          {variant?.ply && (
            <div className="highlight-item">
               <CheckCircle size={14} className="highlight-icon" />
               <span>PLY Rating: <strong>{variant.ply}</strong></span>
            </div>
          )}
          {product.brand?.origin && (
            <div className="highlight-item">
               <CheckCircle size={14} className="highlight-icon" />
               <span>Origin: <strong>{product.brand.origin}</strong></span>
            </div>
          )}
        </div>

        {/* Store & Service Info */}
        <div className="product-trust-box">
          <div className="trust-item">
            <MapPin size={18} className="trust-icon" />
            <div>
              <strong>Visit Our Outlets:</strong> <a href="https://maps.app.goo.gl/KmoKqGPqqMJZsao67" target="_blank" rel="noreferrer" style={{color: 'inherit', textDecoration: 'underline'}}>Shapla Chattar · Station Road · Thikadarpara, Rangpur</a>
            </div>
          </div>
          <div className="trust-item">
            <Wrench size={18} className="trust-icon" />
            <div>
              <strong>Expert Service:</strong> Expert fitting & technical consultation at shop
            </div>
          </div>
          <div className="trust-item">
            <ShieldCheck size={18} className="trust-icon" />
            <div>
              <strong>100% Original:</strong> Genuine products guaranteed. Call: <a href={`tel:+${import.meta.env.VITE_WHATSAPP_NUMBER}`}>{formatPhone(import.meta.env.VITE_WHATSAPP_NUMBER)}</a>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="product-actions">
          <button
            className="btn-add-quote"
            onClick={handleAddToCart}
            disabled={variant?.stockLabel === 'out_of_stock'}
          >
            <ShoppingBag size={18} />
            {added ? '✅ কোটেশনে যোগ হয়েছে!' : 'কার্টে যোগ করুন'}
          </button>

          {/* BUG FIX #6: Only show the confirmation modal for logged-in users.
              Guests get a plain WhatsApp link — attempting /cart/submit as a guest
              throws a 401 and breaks the inquiry tracking silently. */}
          <a
            href={buildWhatsAppMsg()}
            target="_blank"
            rel="noreferrer"
            className="btn-whatsapp"
            onClick={() => {
              logEvent('whatsapp_conversion_attempt', { productId: product._id, sku: variant?.sku });
              if (user) setTimeout(() => setConfirmModal(true), 1500);
            }}
          >
            <WhatsAppLogo size={18} /> অর্ডার করুন
          </a>
        </div>

        {/* ── Specifications (Amazon-style grouped) ── */}
        <CategorySpecsSection product={product} variant={variant} />

        {/* Related Products */}
        {product.relatedProducts?.length > 0 && (
          <div className="product-related">
            <p className="product-related-label">Often bought with</p>
            <div className="product-related-grid">
              {product.relatedProducts.map((r) => (
                <Link key={r._id} to={`/catalog/${r.slug}`} className="related-chip">
                  <picture>
                    {r.media?.[0] && <source srcSet={getCloudinaryUrl(r.media[0], { width: 150, square: true })} type="image/webp" />}
                    <img 
                      src={r.media?.[0] || getCategoryLogo(r.category?.slug)} 
                      alt={r.name} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getCategoryLogo(r.category?.slug);
                      }}
                    />
                  </picture>
                  <span>{r.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div> {/* closes product-panel */}
    </div> {/* closes product-detail */}

    {/* Related Products Discovery Sections */}
    <div className="product-discovery-area">
      {moreInCategory?.length > 0 && (
        <section className="related-section">
          <div className="related-section-header">
            <h3>More in {product.category?.name}</h3>
            <Link to={`/catalog?category=${product.category?.slug}`} className="view-all-link">View All</Link>
          </div>
          <div className="related-grid">
            {moreInCategory.map(p => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      {recommended?.length > 0 && (
        <section className="related-section">
          <div className="related-section-header">
            <h3>Explore Other Categories</h3>
            <Link to="/catalog" className="view-all-link">View Catalog</Link>
          </div>
          <div className="related-grid">
            {recommended.map(p => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>

      {/* Conversion Validation Modal */}
      {confirmModal && (
        <div className="confirm-modal-overlay" onClick={() => setConfirmModal(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <CheckCircle size={36} color="var(--color-success)" />
            <h2>Did you send the inquiry?</h2>
            <p>Confirm so we can track your request and respond faster.</p>
            <div className="confirm-modal-actions">
              <button 
                className="btn-confirm-yes" 
                onClick={() => submitInquiry.mutate({ productId: product._id, variantSku: variant?.sku })}
              >
                Yes, I sent it
              </button>
              <button className="btn-confirm-no" onClick={() => setConfirmModal(false)}>
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


/**
 * CategorySpecsSection — Amazon-style grouped specifications.
 * Each category shows ONLY its relevant fields.
 * KEY RULE: Tubes and Flaps do NOT have PLY Rating — they are pure rubber with no structural plies.
 * PLY Rating applies to Tyres only.
 */
function CategorySpecsSection({ product, variant }) {
  const catSlug = product.category?.slug || '';
  const cs      = product.categorySpecs || {};
  const custom  = product.customSpecs   || [];
  const groups  = [];

  if (catSlug === 'tyres') {
    // Tyres: PLY Rating APPLIES here
    const physical = [
      ['Size',       product.commonSpecs?.size],
      ['Pattern',    product.commonSpecs?.pattern || cs.pattern],
      ['PLY Rating', variant?.ply || cs.plyRating],
      ['Rim Size',   product.commonSpecs?.rim || cs.rimSize],
      ['Origin',     product.commonSpecs?.origin],
    ].filter(([, v]) => v);
    const compat = [
      ['Vehicle Type', cs.vehicleType],
      ['Segment',      product.segment],
      ['Packing',      product.packingSize],
    ].filter(([, v]) => v);
    if (physical.length) groups.push({ title: 'Physical Specifications', rows: physical });
    if (compat.length)   groups.push({ title: 'Compatibility',           rows: compat });

  } else if (catSlug === 'tubes') {
    // Tubes: NO PLY Rating — pure butyl/natural rubber, no structural plies
    const physical = [
      ['Size',      product.commonSpecs?.size],
      ['Valve Type', cs.valveType],
      ['Material',   cs.tubeMaterial],
      ['Origin',     product.commonSpecs?.origin],
    ].filter(([, v]) => v);
    const compat = [
      ['Rim Size',     cs.rimSize || product.commonSpecs?.rim],
      ['Vehicle Type', cs.vehicleType],
      ['Packing',      product.packingSize],
    ].filter(([, v]) => v);
    if (physical.length) groups.push({ title: 'Physical Specifications', rows: physical });
    if (compat.length)   groups.push({ title: 'Compatibility',           rows: compat });

  } else if (catSlug === 'flaps') {
    // Flaps: NO PLY Rating — rubber/plastic strip, no structural plies
    const physical = [
      ['Size',     product.commonSpecs?.size],
      ['Material', cs.flapMaterial],
      ['Origin',   product.commonSpecs?.origin],
    ].filter(([, v]) => v);
    const compat = [
      ['Rim Size',     cs.rimSize || product.commonSpecs?.rim],
      ['Vehicle Type', cs.vehicleType],
      ['Packing',      product.packingSize],
    ].filter(([, v]) => v);
    if (physical.length) groups.push({ title: 'Physical Specifications', rows: physical });
    if (compat.length)   groups.push({ title: 'Compatibility',           rows: compat });

  } else if (catSlug === 'tyre-sealants') {
    const rows = [
      ['Volume',          cs.volume],
      ['Formula Type',    cs.formulaType],
      ['Compatible With', cs.compatibleWith],
      ['Application',     cs.application],
      ['Segment',         product.segment],
      ['Packing',         product.packingSize],
    ].filter(([, v]) => v);
    if (rows.length) groups.push({ title: 'Product Specifications', rows });

  } else if (catSlug === 'patches') {
    const rows = [
      ['Size',            product.commonSpecs?.size],
      ['Patch Type',      cs.patchType],
      ['Compatible With', cs.compatibleWith],
      ['Segment',         product.segment],
      ['Packing',         product.packingSize],
    ].filter(([, v]) => v);
    if (rows.length) groups.push({ title: 'Product Specifications', rows });

  } else if (catSlug === 'gadgets') {
    const rows = [
      ['Type',            cs.gadgetType],
      ['Material',        cs.material],
      ['Compatible With', cs.compatibleWith],
      ['Segment',         product.segment],
      ['Packing',         product.packingSize],
    ].filter(([, v]) => v);
    if (rows.length) groups.push({ title: 'Product Specifications', rows });

  } else {
    // Generic fallback
    const rows = [
      ['Size',    product.commonSpecs?.size],
      ['Pattern', product.commonSpecs?.pattern],
      ['Rim',     product.commonSpecs?.rim],
      ['Origin',  product.commonSpecs?.origin],
      ['Segment', product.segment],
      ['Packing', product.packingSize],
    ].filter(([, v]) => v);
    if (rows.length) groups.push({ title: 'Specifications', rows });
  }

  // Custom specs always in their own group
  if (custom.length > 0) {
    groups.push({ title: 'Additional Details', rows: custom.map(s => [s.key, s.value]) });
  }

  if (groups.length === 0) return null;

  return (
    <div className="product-spec-groups">
      {groups.map((group) => (
        <div key={group.title} className="product-spec-group">
          <h3 className="spec-group-title">{group.title}</h3>
          <div className="product-specs">
            {group.rows.map(([k, v]) => (
              <div key={k} className="product-spec-row">
                <span className="spec-key">{k}</span>
                <span className="spec-val">{v}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
