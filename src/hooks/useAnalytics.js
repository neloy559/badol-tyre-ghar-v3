import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

export const useAnalytics = () => {
  const location = useLocation();

  const logEvent = async (action, meta = {}) => {
    try {
      await api.post('/analytics/log', {
        action,
        path: location.pathname + location.search,
        meta
      });
    } catch (_) { /* silent fail */ }
  };

  const trackPageView = (title) => {
    if (title) document.title = `${title} | Badol Tyre Ghar`;
    logEvent('page_view', { title });
  };

  return { trackPageView, logEvent };
};
