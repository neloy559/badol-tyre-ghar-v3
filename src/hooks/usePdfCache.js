import { useEffect, useCallback } from 'react';
import api from '../services/api';

const CACHE_NAME = 'btg-pdf-cache-v1';
const MANIFEST_KEY = 'btg_pdf_manifest';

/**
 * Detects if the user is on WiFi.
 * Falls back to true if the Network Information API is not available.
 */
const isOnWifi = () => {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return true; // assume WiFi if API not available
  return conn.type === 'wifi' || conn.effectiveType === '4g';
};

/**
 * Gets the network type string for analytics logging.
 */
export const getNetworkType = () => {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return 'unknown';
  if (conn.type === 'wifi') return 'wifi';
  if (conn.type === 'cellular') return 'cellular';
  return conn.effectiveType || 'unknown';
};

/**
 * Fetches the PDF manifest from the server.
 * Returns array of { categorySlug, pdfUrl, versionHash, generatedAt }
 */
const fetchManifest = async () => {
  try {
    const res = await api.get('/catalog/pdf-manifest');
    return res.data?.data || [];
  } catch {
    return [];
  }
};

/**
 * Gets the locally stored manifest from localStorage.
 */
const getLocalManifest = () => {
  try {
    return JSON.parse(localStorage.getItem(MANIFEST_KEY) || '[]');
  } catch {
    return [];
  }
};

/**
 * Saves manifest to localStorage.
 */
const saveLocalManifest = (manifest) => {
  localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
};

/**
 * Checks if a PDF is cached and still valid (hash matches).
 */
export const getCachedPdf = async (categorySlug) => {
  if (!('caches' in window)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const localManifest = getLocalManifest();
    const entry = localManifest.find(m => m.categorySlug === categorySlug);
    if (!entry?.pdfUrl) return null;

    const cached = await cache.match(entry.pdfUrl);
    if (!cached) return null;

    return { blob: await cached.blob(), versionHash: entry.versionHash, fromCache: true };
  } catch {
    return null;
  }
};

/**
 * usePdfCache — pre-fetches all PDFs on WiFi after B2B dealer login.
 * Checks version hash before downloading — only re-fetches if content changed.
 */
export const usePdfCache = (isDealer) => {

  const prefetchAll = useCallback(async () => {
    if (!isDealer) return;
    if (!isOnWifi()) return;
    if (!('caches' in window)) return;

    const serverManifest = await fetchManifest();
    if (!serverManifest.length) return;

    const localManifest  = getLocalManifest();
    const cache          = await caches.open(CACHE_NAME);

    const updated = await Promise.all(
      serverManifest.map(async (entry) => {
        const local = localManifest.find(m => m.categorySlug === entry.categorySlug);

        // Skip if hash matches — already have the latest version
        if (local?.versionHash === entry.versionHash) {
          return local;
        }

        // Hash changed or not cached — fetch and cache silently
        try {
          const response = await fetch(entry.pdfUrl);
          if (response.ok) {
            await cache.put(entry.pdfUrl, response.clone());
            console.log(`[BTG PDF Cache] Updated: ${entry.categorySlug} (${entry.versionHash})`);
          }
        } catch (err) {
          console.warn(`[BTG PDF Cache] Failed to cache ${entry.categorySlug}:`, err);
        }

        return entry;
      })
    );

    saveLocalManifest(updated);
  }, [isDealer]);

  // Run on mount when dealer is logged in
  useEffect(() => {
    prefetchAll();
  }, [prefetchAll]);

  return { prefetchAll };
};

/**
 * Logs a PDF download to the backend (fire-and-forget).
 */
export const logPdfDownload = (categorySlug, versionHash, fromCache) => {
  const networkType = getNetworkType();
  api.post('/catalog/pdf-download-log', {
    categorySlug,
    versionHash,
    networkType,
    fromCache,
  }).catch(() => {}); // never block the download
};
