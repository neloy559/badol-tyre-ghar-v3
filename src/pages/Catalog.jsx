import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, PackageOpen, Loader2, Download } from 'lucide-react';
import { authApi } from '../services/api';
import ProductCard from '../components/molecules/ProductCard';
import FilterSidebar from '../components/organisms/FilterSidebar';
import { pdf } from '@react-pdf/renderer';
import CatalogDocument from '../components/pdf/CatalogDocument';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { getCachedPdf, logPdfDownload } from '../hooks/usePdfCache';
import './Catalog.css';

const LIMIT = 24;

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [pdfLoading, setPdfLoading] = useState(false);
  const sentinelRef = useRef(null);
  const { user, isAuthenticated } = useAuth();
  const isDealer = isAuthenticated && (user?.role === 'dealer' || user?.role === 'admin' || user?.role === 'editor');

  const category = searchParams.get('category');
  const pdfName = category
    ? category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Catalog'
    : 'All Products Catalog';

  const handleGeneratePDF = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      // 1. Check device cache first
      const slug = category || 'all';
      const cached = await getCachedPdf(slug);
      if (cached) {
        const url = URL.createObjectURL(cached.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BadolTyreGhar_${pdfName.replace(/\s+/g, '')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        logPdfDownload(slug, cached.versionHash, true);
        return;
      }

      // 2. Generate fresh
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      params.set('limit', '500');
      const res = await authApi.get('/catalog', { params });
      const prods = res.data?.data?.products || [];

      if (prods.length === 0) {
        alert('No products found.');
        return;
      }

      const blob = await pdf(
        <CatalogDocument
          products={prods}
          categoryName={category ? category.replace(/-/g, ' ') : 'All Products'}
          whatsapp={import.meta.env.VITE_WHATSAPP_NUMBER || ''}
        />
      ).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BadolTyreGhar_${pdfName.replace(/\s+/g, '')}_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      logPdfDownload(slug, null, false);
    } catch (err) {
      console.error('PDF error:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Lock body scroll when sidebar is open (Mobile) ───────────
  useEffect(() => {
    if (isSidebarOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSidebarOpen]);

  // ── Sync search param with debounce ──────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (searchInput === currentSearch) return;

      const params = new URLSearchParams(searchParams);
      if (searchInput) params.set('search', searchInput);
      else params.delete('search');
      params.delete('page'); // Reset - infinite scroll handles paging
      setSearchParams(params);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync local input with URL params (e.g. when filters are cleared externally)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchInput) setSearchInput(urlSearch);
  }, [searchParams]);

  // ── Build filter params (strip 'page' – we manage it internally) ──
  const filterKey = (() => {
    const p = new URLSearchParams(searchParams);
    p.delete('page');
    return p.toString();
  })();

  // ── Infinite Query ────────────────────────────────────────────
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['products-infinite', filterKey],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams(searchParams);
      params.delete('page');
      params.set('page', pageParam);
      params.set('limit', LIMIT);
      const res = await authApi.get('/catalog', { params });
      return res.data.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.total || 0;
      const loaded = allPages.flatMap(p => p.products || []).length;
      return loaded < total ? allPages.length + 1 : undefined;
    },
  });

  const products = data?.pages?.flatMap(p => p.products || []) ?? [];
  const total    = data?.pages?.[0]?.total ?? 0;

  // ── IntersectionObserver Sentinel ────────────────────────────
  const handleObserver = useCallback((entries) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '200px', // Trigger 200px before the sentinel is in view
      threshold: 0,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <div className="btg-catalog-page">
      <SEO
        title="Product Catalog"
        description="Browse our extensive catalog of high-quality tyres, tubes, and automotive accessories. Filter by brand, category, and size to find exactly what you need."
      />
      <div className="btg-catalog__header">
        <div className="btg-catalog__header-content">
          <h1 className="btg-catalog__title">Product Catalog</h1>
          <p className="btg-catalog__subtitle">Explore our premium range of tires and automotive parts</p>
        </div>

        <div className="btg-catalog__toolbar">
          <div className="btg-catalog__search-wrap">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search by name, size, or SKU..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          
          {isDealer && (
            <button
              onClick={handleGeneratePDF}
              className="btg-catalog__download-btn"
              title={`Download ${pdfName}`}
              disabled={pdfLoading}
            >
              {pdfLoading
                ? <><Loader2 size={18} className="spin" /><span className="download-text">Generating...</span></>
                : <><Download size={18} /><span className="download-text">{category ? `${pdfName} PDF` : 'Download PDF'}</span></>
              }
            </button>
          )}

          <button
            className="btg-catalog__mobile-filter"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <SlidersHorizontal size={20} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="btg-catalog__backdrop"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="btg-catalog__layout">
        <div className={`btg-catalog__sidebar-wrap ${isSidebarOpen ? 'open' : ''}`}>
          <FilterSidebar onClose={() => setIsSidebarOpen(false)} />
        </div>

        <div className="btg-catalog__main">
          <div className="btg-catalog__results-info">
            <span>Found <strong>{total}</strong> products</span>
          </div>

          {isLoading ? (
            <div className="btg-catalog__grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="btg-skeleton-card" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="btg-catalog__grid">
                {products.map(product => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Skeleton cards while loading next page */}
              {isFetchingNextPage && (
                <div className="btg-catalog__grid btg-catalog__grid--next">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="btg-skeleton-card" />
                  ))}
                </div>
              )}

              {/* Infinite scroll trigger sentinel */}
              <div ref={sentinelRef} className="btg-catalog__sentinel" />

              {/* End of list message */}
              {!hasNextPage && products.length > 0 && (
                <div className="btg-catalog__end-message">
                  <span>সব পণ্য দেখা শেষ · {products.length} টি পণ্য</span>
                </div>
              )}
            </>
          ) : (
            <div className="btg-catalog__empty">
              <PackageOpen size={64} opacity={0.2} />
              <h2>No products found</h2>
              <p>Try adjusting your filters or search terms.</p>
              <button onClick={() => setSearchParams({})}>Clear All Filters</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Catalog;
