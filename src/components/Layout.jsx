import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Grid3x3, ShoppingBag, User, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../services/api';
import FloatingCart from './organisms/FloatingCart';
import { useSwipeNavigation, TAB_ROUTES } from '../hooks/useSwipeNavigation';
import './Layout.css';

const WhatsAppLogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export default function Layout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const { cartCount } = useCart();
  const [search, setSearch]           = useState('');
  const [isCartOpen, setIsCartOpen]   = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deferredPrompt, setDeferredPrompt]   = useState(null);
  const mainRef = useRef(null);

  // ── Swipe Navigation ─────────────────────────────────────────
  const { getCurrentTabIndex } = useSwipeNavigation(mainRef);
  const currentTabIndex = getCurrentTabIndex();

  // Track previous tab index for slide direction
  const prevTabIndex = useRef(currentTabIndex);
  const slideDirection = currentTabIndex >= prevTabIndex.current ? 1 : -1;
  useEffect(() => {
    prevTabIndex.current = currentTabIndex;
  }, [currentTabIndex]);
  
  // ── Smart Search Memory ──────────────────────────────────────
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('btg_recent_searches') || '[]');
    } catch { return []; }
  });

  // ── PWA Install Logic ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // ── Fetch Branding & Logo ───────────────────────────────────
  const { data: brandingData } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => (await api.get('/branding')).data?.data
  });
  const siteLogo = brandingData?.config?.logo || '/assets/branding/logo.jpeg';
  const siteName = brandingData?.config?.branding?.name || 'Badol Tyre Ghar';

  // ── Fetch Dynamic Categories for Navbar ──────────────────
  const { data: categoryData } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: async () => (await api.get('/catalog/categories')).data?.data
  });
  const categories = categoryData?.categories || [];

  const dynamicCategoryLinks = [
    ...categories.map(cat => ({ to: `/catalog?category=${cat.slug}`, label: cat.name })),
    { to: '/catalog', label: 'All Products' }
  ];

  // ── Live Search Suggestions ──────────────────────────────────
  useEffect(() => {
    if (search.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/catalog/search/suggestions?q=${encodeURIComponent(search)}`);
        setSuggestions(res.data.data);
      } catch (err) {
        console.error('Suggestions error:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSearch = (e, explicitTerm = null) => {
    if (e) e.preventDefault();
    const term = (explicitTerm || search).trim();
    
    if (term) {
      // Save to recent searches
      const updated = [term, ...recentSearches.filter(t => t !== term)].slice(0, 5);
      localStorage.setItem('btg_recent_searches', JSON.stringify(updated));
      setRecentSearches(updated);

      setShowSuggestions(false);
      navigate(`/catalog?search=${encodeURIComponent(term)}`);
    }
  };

  const navItems = [
    { to: '/',        icon: Home,        label: 'হোম' },
    { to: '/catalog', icon: Grid3x3,     label: 'ক্যাটালগ' },
    {
      href: `https://wa.me/${brandingData?.config?.contact?.whatsapp || import.meta.env.VITE_WHATSAPP_NUMBER || '8801647794452'}`,
      icon: WhatsAppLogo,
      label: 'WhatsApp',
      isExternal: true,
      isCenter: true,
    },
    { to: '/cart',    icon: ShoppingBag, label: 'কোটেশন', count: cartCount },
    { to: '/profile', icon: User,        label: 'অ্যাকাউন্ট' },
  ];

  return (
    <div className="layout-root">
      {/* ── Desktop Navbar ─────────────────────────── */}
      <header className="navbar-desktop">
        <div className="navbar-row-a">
          <NavLink to="/" className="navbar-brand">
            <img src={siteLogo} alt={`${siteName} Logo`} className="brand-logo" />
            <span className="brand-name">{siteName}</span>
          </NavLink>

          <form className="navbar-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search Product..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            <button type="submit" className="navbar-search-btn" aria-label="Search">
              <Search size={16} />
            </button>

            {showSuggestions && (
              <div className="search-suggestions">
                {search.length >= 2 ? (
                  suggestions.length > 0 ? (
                    suggestions.map((s) => (
                      <Link 
                        key={s._id} 
                        to={`/catalog/${s.slug}`} 
                        className="suggestion-item"
                        onClick={() => setShowSuggestions(false)}
                      >
                        <img 
                          src={s.media?.[0] || siteLogo} 
                          alt="" 
                          className="suggestion-img" 
                        />
                        <div className="suggestion-info">
                          <p className="suggestion-name">{s.name}</p>
                          <p className="suggestion-cat">{s.sku}</p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="suggestion-empty">No products found for "{search}"</div>
                  )
                ) : (
                  <div className="search-memory">
                    {recentSearches.length > 0 && (
                      <div className="memory-section">
                        <h4>Recent Searches</h4>
                        <div className="memory-pills">
                          {recentSearches.map(term => (
                            <span 
                              key={term} 
                              className="memory-pill" 
                              onMouseDown={() => {
                                setSearch(term);
                                handleSearch(null, term);
                              }}
                            >
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="memory-section">
                      <h4>Trending Categories</h4>
                      <div className="memory-pills">
                        <span className="memory-pill trending" onMouseDown={() => navigate('/catalog?category=tyres')}>🔥 Tyres</span>
                        <span className="memory-pill trending" onMouseDown={() => navigate('/catalog?category=tubes')}>🔥 Tubes</span>
                        <span className="memory-pill trending" onMouseDown={() => navigate('/catalog?category=tyre-sealants')}>🔥 Sealants</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>

          <div className="navbar-right">
            {user ? (
              <NavLink to="/profile" className="navbar-user-chip">
                <User size={13} />
                <span>{user.profile?.name || user.phone}</span>
              </NavLink>
            ) : (
              <NavLink to="/login" className="navbar-link">Login / Sign Up</NavLink>
            )}
            <button className="navbar-cart-btn" onClick={() => setIsCartOpen(true)}>
              <div className="cart-icon-wrap">
                <ShoppingBag size={18} />
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </div>
              <span>Quote List</span>
            </button>
          </div>
        </div>

        <div className="navbar-row-b">
          <nav className="navbar-row-b-inner">
            {dynamicCategoryLinks.map(({ to, label }) => (
              <Link key={to} to={to} className="nav-link">{label}</Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────── */}
      <main className="layout-main" ref={mainRef}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ x: slideDirection * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: slideDirection * -40, opacity: 0 }}
            transition={{
              x: { type: 'spring', stiffness: 380, damping: 38, mass: 0.8 },
              opacity: { duration: 0.15 },
            }}
            style={{ width: '100%' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <FloatingCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <img src={siteLogo} alt="Logo" className="footer-brand-logo" />
            <p className="footer-brand-name">{siteName}</p>
            <p className="footer-contact-text">
              {brandingData?.config?.branding?.footerText || "Bangladesh's trusted B2B tyre wholesale platform."}<br />
              📞 <a href={`tel:+${brandingData?.config?.contact?.whatsapp || import.meta.env.VITE_WHATSAPP_NUMBER}`} className="footer-link">
                {brandingData?.config?.contact?.whatsapp || import.meta.env.VITE_WHATSAPP_NUMBER}
              </a>
            </p>
          </div>

          <div>
            <p className="footer-col-heading">Useful Links</p>
            <div className="footer-links">
              <Link to="/shops"   className="footer-link">Contact Us</Link>
              <Link to="/catalog"  className="footer-link">Browse Catalog</Link>
              <Link to="/login"    className="footer-link">Dealer Login</Link>
              {deferredPrompt && (
                <button onClick={handleInstall} className="footer-install-btn">
                  📲 Install App (বাদল টায়ার ঘর)
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="footer-col-heading">Policy</p>
            <div className="footer-links">
              <Link to="/shops" className="footer-link">Terms &amp; Conditions</Link>
              <Link to="/shops" className="footer-link">Privacy Policy</Link>
              <Link to="/shops" className="footer-link">Return Policy</Link>
            </div>
          </div>

          <div>
            <p className="footer-col-heading">Stay Connected</p>
            <div className="footer-links">
              <a
                href={`https://wa.me/${brandingData?.config?.contact?.whatsapp || import.meta.env.VITE_WHATSAPP_NUMBER}`}
                target="_blank" rel="noreferrer"
                className="footer-link"
              >
                💬 WhatsApp
              </a>
              <a href={brandingData?.config?.social?.facebook || "https://facebook.com"} target="_blank" rel="noreferrer" className="footer-link">
                📘 Facebook
              </a>
            </div>
          </div>
        </div>
        <div className="footer-copyright">
          Copyright © {new Date().getFullYear()} Badol Tyre Ghar | All rights reserved.
        </div>
      </footer>

      {/* ── Mobile Bottom Navigation ──────────────────── */}
      <nav className="bottom-nav">
        {/*
          5 items total. WhatsApp (index 2) is NOT a tab — it's a center FAB.
          The 4 route tabs sit at visual slots 0,1,3,4 (each 20% wide).
          Indicator maps: tabIndex 0→0%, 1→20%, 2→60%, 3→80%
        */}
        <div
          className="bottom-nav-indicator"
          style={{
            transform: `translateX(${
              currentTabIndex <= 1
                ? currentTabIndex * 100
                : (currentTabIndex + 1) * 100
            }%)`
          }}
        />
        {navItems.map((item) => {
          const Icon = item.icon;

          // Center WhatsApp elevated FAB
          if (item.isCenter) {
            return (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="bottom-nav-item center-action"
                aria-label="Contact on WhatsApp"
              >
                <Icon size={26} />
              </a>
            );
          }

          // Cart (onClick)
          if (item.onClick) {
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className="bottom-nav-item"
              >
                <div className="nav-icon-wrap">
                  <Icon size={20} strokeWidth={1.8} />
                  {item.count > 0 && <span className="nav-badge">{item.count}</span>}
                </div>
                <span>{item.label}</span>
              </button>
            );
          }

          // Regular route tabs
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
            >
              <div className="nav-icon-wrap">
                <Icon size={20} strokeWidth={1.8} />
              </div>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
