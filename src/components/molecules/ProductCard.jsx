import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Heart, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { getCloudinaryUrl, getBlurUrl, CLOUDINARY_PRESETS } from '../../utils/cloudinary';
import { getCategoryLogo } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const { 
    name, 
    slug, 
    brand, 
    media, 
    variants, 
    campaign, 
    showPrice,
    category,
    commonSpecs
  } = product;

  const { user, isAuthenticated } = useAuth();
  const isDealer = isAuthenticated && user?.role === 'dealer';

  const queryClient = useQueryClient();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Get active variant data
  const activeVariant = variants?.[0] || {};
  const price = activeVariant.price;
  const originalPrice = activeVariant.originalPrice;
  const stock = activeVariant.stock || 0;

  // Build the optimized image URLs
  const imageUrl = media?.[0] ? getCloudinaryUrl(media[0], CLOUDINARY_PRESETS.CARD) : null;
  const blurUrl  = media?.[0] ? getBlurUrl(media[0]) : null;
  const fallback = getCategoryLogo(category?.slug);

  // ── Prefetch product detail on hover/touch ────────────────────
  const handlePrefetch = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['product', slug],
      queryFn: async () => (await api.get(`/catalog/${slug}`)).data?.data,
      staleTime: 1000 * 60 * 5, // Don't re-prefetch if fetched in last 5 min
    });
  }, [queryClient, slug]);

  return (
    <article
      className="btg-pcard"
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      {/* Badges & Wishlist */}
      <div className="btg-pcard__top-actions">
        {campaign && (
          <span className="btg-pcard__badge">{campaign.badgeText || 'OFFER'}</span>
        )}
        <button className="btg-pcard__wishlist" title="Add to Wishlist">
          <Heart size={18} />
        </button>
      </div>
      
      <Link to={`/catalog/${slug}`} className="btg-pcard__image-link">
        <div className="btg-pcard__image-wrap">
          {imageUrl ? (
            <div className="btg-pcard__blur-wrap">
              {/* Blur placeholder - always visible until main loads */}
              {blurUrl && !imgLoaded && !imgError && (
                <img
                  src={blurUrl}
                  alt=""
                  aria-hidden="true"
                  className="btg-pcard__img-blur"
                />
              )}
              {/* Full resolution image */}
              <img
                src={imageUrl}
                alt={name}
                className={`btg-pcard__img-full ${imgLoaded ? 'loaded' : ''}`}
                onLoad={() => setImgLoaded(true)}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = fallback;
                  setImgLoaded(true);
                  setImgError(true);
                }}
              />
            </div>
          ) : (
            <div className="btg-pcard__placeholder">BTG</div>
          )}
        </div>
      </Link>

      <div className="btg-pcard__content">
        <div className="btg-pcard__meta">
          <span className="btg-pcard__category">{category?.name || 'Automotive'}</span>
          <div className={`btg-pcard__stock ${stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
            {stock > 0 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {stock > 0 ? 'In Stock' : 'Out of Stock'}
          </div>
        </div>

        <Link to={`/catalog/${slug}`} className="btg-pcard__name-link">
          <h3 className="btg-pcard__name">{name}</h3>
        </Link>

        {/* Technical Spec Matrix */}
        <div className="btg-pcard__specs">
          {commonSpecs?.size && (
            <div className="btg-pcard__spec-item">
              <span>Size:</span> <strong>{commonSpecs.size}</strong>
            </div>
          )}
          {activeVariant.ply && (
            <div className="btg-pcard__spec-item">
              <span>PLY:</span> <strong>{activeVariant.ply}</strong>
            </div>
          )}
        </div>
        
        <div className="btg-pcard__footer">
          <div className="btg-pcard__pricing">
            {showPrice === false ? (
              <p className="btg-pcard__price call-for-price">Call for Price</p>
            ) : isDealer && product.tierPrice?.adjustedPrice != null ? (
              <>
                <p className="btg-pcard__price">৳ {product.tierPrice.adjustedPrice.toLocaleString()}</p>
                {product.tierPrice.discountPercent > 0 && (
                  <p className="btg-pcard__mrp" style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                    {product.tierPrice.discountPercent}% dealer discount
                  </p>
                )}
              </>
            ) : activeVariant.price ? (
              <>
                <p className="btg-pcard__price">৳ {price.toLocaleString()}</p>
                {originalPrice && (
                  <p className="btg-pcard__mrp">৳ {originalPrice.toLocaleString()}</p>
                )}
              </>
            ) : (
              <p className="btg-pcard__price call-for-price">Call for Price</p>
            )}
          </div>
          
          <Link to={`/catalog/${slug}`} className="btg-pcard__cta">
            অর্ডার করুন
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
