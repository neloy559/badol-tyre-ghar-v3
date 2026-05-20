import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Filter, ChevronRight, X, Layers, Box, Check, Banknote } from 'lucide-react';
import api from '../../services/api';
import './FilterSidebar.css';

const FilterSidebar = ({ onClose }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Fetch Data ───────────────────────────────────────────────
  const { data: categoryData } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: async () => (await api.get('/catalog/categories')).data.data,
  });

  const categories = categoryData?.categories || [];
  const isPricingVisible = categoryData?.config?.isPricingVisible;

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/products/brands')).data.data,
  });

  // ── Handlers ─────────────────────────────────────────────────
  const currentCategory = searchParams.get('category') || '';
  const selectedBrands = searchParams.get('brand')?.split(',') || [];
  
  // Local state for price inputs to avoid lag
  const [minPrice, setMinPrice] = React.useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = React.useState(searchParams.get('maxPrice') || '');

  const handleCategorySelect = (slug) => {
    const params = new URLSearchParams(searchParams);
    if (slug === currentCategory) params.delete('category');
    else params.set('category', slug);
    params.set('page', '1');
    setSearchParams(params);
    if (onClose) onClose();
  };

  const handlePriceApply = () => {
    const params = new URLSearchParams(searchParams);
    if (minPrice) params.set('minPrice', minPrice);
    else params.delete('minPrice');
    
    if (maxPrice) params.set('maxPrice', maxPrice);
    else params.delete('maxPrice');
    
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleBrandToggle = (slug) => {
    const params = new URLSearchParams(searchParams);
    let newBrands = [...selectedBrands];
    
    if (newBrands.includes(slug)) {
      newBrands = newBrands.filter(b => b !== slug);
    } else {
      newBrands.push(slug);
    }

    if (newBrands.length > 0) params.set('brand', newBrands.join(','));
    else params.delete('brand');
    
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
    setMinPrice('');
    setMaxPrice('');
    if (onClose) onClose();
  };

  // ── Render Helpers ───────────────────────────────────────────
  const renderCategoryItem = (cat, depth = 0) => {
    const isActive = currentCategory === cat.slug;
    return (
      <div key={cat._id} className="btg-filter__cat-item-wrap">
        <button 
          className={`btg-filter__cat-item depth-${depth} ${isActive ? 'active' : ''}`}
          onClick={() => handleCategorySelect(cat.slug)}
        >
          <div className="btg-filter__cat-name-wrap">
            <span className="btg-filter__cat-name">{cat.name}</span>
            {cat.productCount > 0 && (
              <span className="btg-filter__cat-count">{cat.productCount}</span>
            )}
          </div>
          {cat.children?.length > 0 && <ChevronRight size={14} className="chevron" />}
        </button>
        {cat.children?.length > 0 && (
          <div className="btg-filter__cat-children">
            {cat.children.map(child => renderCategoryItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const [isCategoriesOpen, setIsCategoriesOpen] = React.useState(true);
  const [isBrandsOpen, setIsBrandsOpen] = React.useState(false);
  const [isPriceOpen, setIsPriceOpen] = React.useState(true);

  return (
    <aside className="btg-filter-sidebar">
      {/* Mobile Header */}
      <div className="btg-filter__mobile-header">
        <h3>Filters</h3>
        <button className="btg-filter__close" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      <div className="btg-filter__header">
        <div className="btg-filter__title">
          <Filter size={18} /> <span>Filters</span>
        </div>
        {(currentCategory || selectedBrands.length > 0 || minPrice || maxPrice) && (
          <button className="btg-filter__clear" onClick={clearFilters}>
            Clear All
          </button>
        )}
      </div>

      {/* Categories */}
      <div className={`btg-filter__section ${isCategoriesOpen ? 'open' : ''}`}>
        <button 
          className="btg-filter__section-header" 
          onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
        >
          <div className="btg-filter__section-title"><Layers size={16} /> Categories</div>
          <ChevronRight size={16} className={`section-chevron ${isCategoriesOpen ? 'open' : ''}`} />
        </button>
        
        {isCategoriesOpen && (
          <div className="btg-filter__category-list">
            {categories?.map(cat => renderCategoryItem(cat))}
          </div>
        )}
      </div>

      {/* Price Range Filter (Conditional) */}
      {isPricingVisible && (
        <div className={`btg-filter__section ${isPriceOpen ? 'open' : ''}`}>
          <button 
            className="btg-filter__section-header" 
            onClick={() => setIsPriceOpen(!isPriceOpen)}
          >
            <div className="btg-filter__section-title"><Banknote size={16} /> Price Range</div>
            <ChevronRight size={16} className={`section-chevron ${isPriceOpen ? 'open' : ''}`} />
          </button>
          
          {isPriceOpen && (
            <div className="btg-filter__price-range">
              <div className="btg-filter__price-inputs">
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="btg-filter__price-input"
                />
                <span className="separator">-</span>
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="btg-filter__price-input"
                />
              </div>
              <button className="btg-filter__price-apply" onClick={handlePriceApply}>
                Apply Range
              </button>
            </div>
          )}
        </div>
      )}

      {/* Brands */}
      <div className={`btg-filter__section ${isBrandsOpen ? 'open' : ''}`}>
        <button 
          className="btg-filter__section-header" 
          onClick={() => setIsBrandsOpen(!isBrandsOpen)}
        >
          <div className="btg-filter__section-title"><Box size={16} /> Brands</div>
          <ChevronRight size={16} className={`section-chevron ${isBrandsOpen ? 'open' : ''}`} />
        </button>

        {isBrandsOpen && (
          <div className="btg-filter__brand-list">
            {brands?.map(brand => (
              <button 
                key={brand._id}
                className={`btg-filter__brand-item ${selectedBrands.includes(brand.slug) ? 'active' : ''}`}
                onClick={() => handleBrandToggle(brand.slug)}
              >
                <div className="checkbox">
                  {selectedBrands.includes(brand.slug) && <Check size={12} />}
                </div>
                <span>{brand.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default FilterSidebar;
