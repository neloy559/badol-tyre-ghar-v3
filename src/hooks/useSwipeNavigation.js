import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * useSwipeNavigation
 * Detects horizontal swipe gestures on the main content area and
 * navigates between the 4 bottom-nav tabs.
 *
 * Rules (industry standard):
 * - Min 50px horizontal delta to trigger
 * - Horizontal delta must be > vertical delta (prevents scroll conflicts)
 * - Velocity check: must complete swipe within 400ms
 * - Only fires on mobile (touch events)
 */

// The 4 swipeable tab routes in order
const TAB_ROUTES = ['/', '/catalog', '/cart', '/profile'];

export const useSwipeNavigation = (elementRef) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const touchStart = useRef(null);

  const getCurrentTabIndex = useCallback(() => {
    const path = location.pathname;
    // Exact match first, then prefix match for nested routes
    const exact = TAB_ROUTES.indexOf(path);
    if (exact !== -1) return exact;
    // /catalog/* → index 1, /profile/* → index 3
    if (path.startsWith('/catalog')) return 1;
    if (path.startsWith('/profile')) return 3;
    if (path.startsWith('/cart'))    return 2;
    return 0;
  }, [location.pathname]);

  useEffect(() => {
    const el = elementRef?.current;
    if (!el) return;

    const onTouchStart = (e) => {
      const t = e.touches[0];
      touchStart.current = {
        x: t.clientX,
        y: t.clientY,
        time: Date.now(),
      };
    };

    const onTouchEnd = (e) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      const dt = Date.now() - touchStart.current.time;
      touchStart.current = null;

      // Ignore: too slow, too short, or more vertical than horizontal
      if (dt > 400) return;
      if (Math.abs(dx) < 50) return;
      if (Math.abs(dy) > Math.abs(dx)) return;

      const currentIndex = getCurrentTabIndex();

      if (dx < 0) {
        // Swipe LEFT → go to next tab
        const next = TAB_ROUTES[currentIndex + 1];
        if (next) navigate(next);
      } else {
        // Swipe RIGHT → go to previous tab
        const prev = TAB_ROUTES[currentIndex - 1];
        if (prev) navigate(prev);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [elementRef, getCurrentTabIndex, navigate]);

  return { getCurrentTabIndex };
};

export { TAB_ROUTES };
