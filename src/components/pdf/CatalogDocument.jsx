import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const BTG_RED    = '#CC0000';
const BTG_DARK   = '#111111';
const BTG_GREY   = '#666666';
const BTG_LIGHT  = '#F5F5F5';
const BTG_BORDER = '#EEEEEE';

/**
 * Fetch an image URL and convert to base64 data URI.
 * This bypasses CORS — @react-pdf/renderer cannot load external URLs directly.
 * Returns null on any failure so the card shows a placeholder instead of crashing.
 */
const toBase64 = async (url) => {
  if (!url) return null;
  try {
    // Build a Cloudinary URL with small size + JPEG format
    let fetchUrl = url;
    if (url.includes('cloudinary.com')) {
      const idx = url.indexOf('/upload/');
      if (idx !== -1) {
        const base = url.substring(0, idx + 8);
        const rest = url.substring(idx + 8);
        // Strip existing transforms if present (contain commas before first slash)
        const cleanPath = /^[^/]+,[^/]+\//.test(rest) ? rest.replace(/^[^/]+\//, '') : rest;
        fetchUrl = `${base}f_jpg,c_pad,b_white,w_120,q_50/${cleanPath}`;
      }
    }
    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/**
 * Pre-fetch all product images as base64 before rendering the PDF.
 * Called from the parent component before passing products to CatalogDocument.
 */
export const prefetchImages = async (products) => {
  const results = await Promise.all(
    products.map(async (p) => {
      const imgBase64 = await toBase64(p.media?.[0]);
      return { ...p, _pdfImg: imgBase64 };
    })
  );
  return results;
};

// ── Category-specific brand chips ─────────────────────────────
const getBrandChips = (categoryName) => {
  const cat = (categoryName || '').toLowerCase();
  if (cat.includes('tube') || cat.includes('tyre') || cat.includes('flap')) {
    return ['Hussain', 'MTF', 'Zess'];
  }
  if (cat.includes('sealant')) {
    return ['Arson', 'MRF', 'NS Best', 'Total', 'Omni'];
  }
  if (cat.includes('patch')) {
    return ['Omni', 'Elephant', 'CT', 'Big Stone'];
  }
  if (cat.includes('gadget')) {
    return ['Dunlop', 'Sun'];
  }
  return ['Hussain', 'MTF', 'Zess', 'Arson', 'Omni'];
};

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Cover page
  coverPage: {
    backgroundColor: BTG_RED,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverTop: {
    flex: 1,
    width: '100%',
    backgroundColor: BTG_RED,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  coverLogo: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: '#fff',
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  coverCategory: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 6,
    fontFamily: 'Helvetica',
  },
  coverTagline: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    fontFamily: 'Helvetica-Oblique',
    marginBottom: 32,
  },
  coverDivider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginBottom: 32,
  },
  coverBottom: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coverBottomText: { fontSize: 9, color: 'rgba(255,255,255,0.8)' },
  coverDate: { fontSize: 9, color: 'rgba(255,255,255,0.6)', textAlign: 'right' },

  // Product pages
  page: { padding: 28, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica' },
  header: {
    marginBottom: 16, paddingBottom: 10,
    borderBottomWidth: 2, borderBottomColor: BTG_RED,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  headerTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BTG_RED },
  headerSub:   { fontSize: 9, color: BTG_GREY, marginTop: 2 },
  headerRight: { fontSize: 8, color: BTG_GREY, textAlign: 'right' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  card: {
    width: '23%', marginBottom: 7,
    borderWidth: 1, borderColor: BTG_BORDER,
    borderRadius: 4, overflow: 'hidden',
    backgroundColor: BTG_LIGHT,
  },
  imgBox:         { width: '100%', height: 68, backgroundColor: '#F0F0F0' },
  img:            { width: '100%', height: 68, objectFit: 'contain' },
  imgPlaceholder: { width: '100%', height: 68, backgroundColor: '#E8E8E8' },
  cardBody:  { padding: 5 },
  productName: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BTG_DARK, marginBottom: 2, lineHeight: 1.3 },
  brand:       { fontSize: 6.5, color: '#888', marginBottom: 2 },
  specs:       { fontSize: 6.5, color: BTG_GREY, lineHeight: 1.3 },

  // Footer
  footer: {
    position: 'absolute', bottom: 14, left: 28, right: 28,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: BTG_BORDER, paddingTop: 5,
  },
  footerText: { fontSize: 7, color: '#AAA' },
  pageNum:    { fontSize: 7, color: '#AAA' },

  // About page
  aboutPage: { padding: 36, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica', flex: 1 },
  aboutHeader: { borderBottomWidth: 2, borderBottomColor: BTG_RED, paddingBottom: 10, marginBottom: 20 },
  aboutTitle:   { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BTG_RED, marginBottom: 3 },
  aboutTagline: { fontSize: 10, color: BTG_GREY, fontFamily: 'Helvetica-Oblique' },
  aboutBody:    { fontSize: 9.5, color: BTG_DARK, lineHeight: 1.7, marginBottom: 14 },
  aboutBold:    { fontFamily: 'Helvetica-Bold' },
  brandsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  brandChip: {
    backgroundColor: BTG_LIGHT, borderWidth: 1, borderColor: BTG_BORDER,
    borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3,
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: BTG_DARK,
  },
  contactBox: {
    backgroundColor: BTG_LIGHT, borderRadius: 6, padding: 14,
    borderLeftWidth: 3, borderLeftColor: BTG_RED,
  },
  contactTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BTG_RED, marginBottom: 8 },
  contactRow:   { flexDirection: 'row', marginBottom: 5, alignItems: 'flex-start' },
  contactLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BTG_DARK, width: 70 },
  contactValue: { fontSize: 8.5, color: BTG_GREY, flex: 1 },

  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#CCC' },
});

// ── Cover Page ────────────────────────────────────────────────
const CoverPage = ({ categoryName, dateStr, logoBase64 }) => (
  <Page size="A4" style={styles.coverPage}>
    <View style={styles.coverTop}>
      {logoBase64 ? (
        <Image src={logoBase64} style={styles.coverLogo} />
      ) : (
        <View style={[styles.coverLogo, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', color: BTG_RED }}>BTG</Text>
        </View>
      )}
      <Text style={styles.coverTitle}>Badol Tyre Ghar</Text>
      <Text style={styles.coverCategory}>{categoryName} — Product Catalog</Text>
      <Text style={styles.coverTagline}>Premium Quality at Wholesale Rates</Text>
      <View style={styles.coverDivider} />
      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
        Official Dealers: Hussain · MTF · Zess · Arson · MRF · Omni
      </Text>
    </View>
    <View style={styles.coverBottom}>
      <Text style={styles.coverBottomText}>
        Thikadarpara Mor, Station Road, Shapla Chattar, Rangpur
      </Text>
      <Text style={styles.coverDate}>{dateStr}</Text>
    </View>
  </Page>
);

// ── About Us Back Page ────────────────────────────────────────
const AboutPage = ({ categoryName }) => (
  <Page size="A4" style={styles.aboutPage}>
    <View style={styles.aboutHeader}>
      <Text style={styles.aboutTitle}>Badol Tyre Ghar — Our Story</Text>
      <Text style={styles.aboutTagline}>Decades of trust, quality, and service.</Text>
    </View>
    <Text style={styles.aboutBody}>
      Badol Tyre Ghar is the most trusted name in tyres and automotive accessories in Rangpur.
      From a single shop at Thikadarpara Mor, Station Road, Shapla Chattar, we have grown into
      the region's leading wholesale destination for tubes, tyres, patches, sealants, and repair tools.
    </Text>
    <Text style={styles.aboutBody}>
      Founded by <Text style={styles.aboutBold}>MD. Mostaq Sharker Badol</Text> — a man who has
      lived and breathed this market since his childhood. He was among the first in the region to
      establish an official dealership with <Text style={styles.aboutBold}>Force</Text> (now
      rebranded as <Text style={styles.aboutBold}>Hussain</Text>, a sister concern of Apex
      International) — at a time when corporate partnerships in this trade were rare.
    </Text>
    <Text style={styles.aboutBody}>We are now official dealers for:</Text>
    <View style={styles.brandsRow}>
      {getBrandChips(categoryName).map(b => (
        <Text key={b} style={styles.brandChip}>{b}</Text>
      ))}
    </View>
    <Text style={styles.aboutBody}>
      Today, <Text style={styles.aboutBold}>MD. Faiaz Sharker Neloy</Text> — the founder's only
      son — carries this legacy forward, combining decades of business wisdom with a modern digital
      vision. This catalog is a commitment to serve the next generation of dealers with the same
      integrity, now at the speed of technology.
    </Text>
    <View style={styles.contactBox}>
      <Text style={styles.contactTitle}>Contact Us</Text>
      <View style={styles.contactRow}>
        <Text style={styles.contactLabel}>Address</Text>
        <Text style={styles.contactValue}>Thikadarpara Mor, Station Road, Shapla Chattar, Rangpur</Text>
      </View>
      <View style={styles.contactRow}>
        <Text style={styles.contactLabel}>WhatsApp</Text>
        <Text style={styles.contactValue}>+880 1647-794452</Text>
      </View>
      <View style={styles.contactRow}>
        <Text style={styles.contactLabel}>Website</Text>
        <Text style={styles.contactValue}>badol-tyre-ghar.vercel.app</Text>
      </View>
    </View>
  </Page>
);

// ── Main Document ─────────────────────────────────────────────
const CatalogDocument = ({
  products = [],
  categoryName = 'All Products',
  logoBase64 = null,
}) => {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <Document
      title={`Badol Tyre Ghar — ${categoryName} Catalog`}
      author="Badol Tyre Ghar"
      subject={`${categoryName} Product Catalog`}
      creator="BTG V3"
    >
      {/* ── Page 1: Cover ── */}
      <CoverPage categoryName={categoryName} dateStr={dateStr} logoBase64={logoBase64} />

      {/* ── Product Pages ── */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.headerTitle}>Badol Tyre Ghar</Text>
            <Text style={styles.headerSub}>{categoryName} — Product Catalog</Text>
          </View>
          <Text style={styles.headerRight}>{dateStr}{'\n'}badol-tyre-ghar.vercel.app</Text>
        </View>

        {products.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No products found.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {products.map((p) => {
              const variant = p.variants?.[0];
              const size    = p.commonSpecs?.size || '';
              const ply     = variant?.ply || '';
              const brand   = p.brand?.name || '';
              // Use pre-fetched base64 image (_pdfImg) — bypasses CORS
              const imgSrc  = p._pdfImg || null;

              return (
                <View key={p._id} style={styles.card} wrap={false}>
                  <View style={styles.imgBox}>
                    {imgSrc ? (
                      <Image src={imgSrc} style={styles.img} />
                    ) : (
                      <View style={styles.imgPlaceholder} />
                    )}
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                    {brand ? <Text style={styles.brand}>{brand}</Text> : null}
                    <Text style={styles.specs}>
                      {[size, ply].filter(Boolean).join(' · ') || '—'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Badol Tyre Ghar · Shapla Chattar, Rangpur</Text>
          <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* ── Last Page: About Us ── */}
      <AboutPage categoryName={categoryName} />
    </Document>
  );
};

export default CatalogDocument;
