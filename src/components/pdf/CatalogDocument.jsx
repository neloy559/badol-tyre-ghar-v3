import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const BTG_RED   = '#CC0000';
const BTG_DARK  = '#111111';
const BTG_GREY  = '#666666';
const BTG_LIGHT = '#F5F5F5';
const BTG_BORDER = '#EEEEEE';

const getPdfImageUrl = (url) => {
  if (!url) return null;
  if (url.includes('cloudinary.com')) {
    const idx = url.indexOf('/upload/');
    if (idx === -1) return url;
    const base = url.substring(0, idx + 8);
    const path = url.substring(idx + 8).replace(/^[^/]+\//, '');
    return `${base}f_jpg,c_pad,b_white,w_200,q_70/${path}`;
  }
  return url;
};

const formatPrice = (variant) => {
  if (!variant) return 'Call for Price';
  const price = variant.pricing?.retail || variant.pricing?.wholesale || variant.price;
  if (!price) return 'Call for Price';
  return `BDT ${Number(price).toLocaleString('en-IN')}`;
};

const styles = StyleSheet.create({
  // ── Page ──────────────────────────────────────────────────
  page: {
    padding: 28,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  // ── Cover Header ──────────────────────────────────────────
  header: {
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: BTG_RED,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: BTG_RED },
  headerSub:   { fontSize: 9,  color: BTG_GREY, marginTop: 2 },
  headerRight: { fontSize: 8,  color: BTG_GREY, textAlign: 'right' },
  // ── Product Grid ──────────────────────────────────────────
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  card: {
    width: '23%',
    marginBottom: 7,
    borderWidth: 1,
    borderColor: BTG_BORDER,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: BTG_LIGHT,
  },
  imgBox:      { width: '100%', height: 68, backgroundColor: '#F0F0F0' },
  img:         { width: '100%', height: 68, objectFit: 'contain' },
  imgPlaceholder: { width: '100%', height: 68, backgroundColor: '#E8E8E8' },
  cardBody:    { padding: 5 },
  productName: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BTG_DARK, marginBottom: 2, lineHeight: 1.3 },
  brand:       { fontSize: 6.5, color: '#888', marginBottom: 2 },
  specs:       { fontSize: 6.5, color: BTG_GREY, marginBottom: 3, lineHeight: 1.3 },
  price:       { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BTG_RED },
  // ── Footer (fixed on every page) ──────────────────────────
  footer: {
    position: 'absolute',
    bottom: 14, left: 28, right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BTG_BORDER,
    paddingTop: 5,
  },
  footerText: { fontSize: 7, color: '#AAA' },
  pageNum:    { fontSize: 7, color: '#AAA' },
  // ── About Us Back Page ────────────────────────────────────
  aboutPage: {
    padding: 36,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    flex: 1,
  },
  aboutHeader: {
    borderBottomWidth: 2,
    borderBottomColor: BTG_RED,
    paddingBottom: 10,
    marginBottom: 20,
  },
  aboutTitle:    { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BTG_RED, marginBottom: 3 },
  aboutTagline:  { fontSize: 10, color: BTG_GREY, fontFamily: 'Helvetica-Oblique' },
  aboutBody:     { fontSize: 9.5, color: BTG_DARK, lineHeight: 1.7, marginBottom: 14 },
  aboutBold:     { fontFamily: 'Helvetica-Bold' },
  brandsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  brandChip: {
    backgroundColor: BTG_LIGHT,
    borderWidth: 1,
    borderColor: BTG_BORDER,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BTG_DARK,
  },
  contactBox: {
    backgroundColor: BTG_LIGHT,
    borderRadius: 6,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: BTG_RED,
  },
  contactTitle:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BTG_RED, marginBottom: 8 },
  contactRow:    { flexDirection: 'row', marginBottom: 5, alignItems: 'flex-start' },
  contactLabel:  { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BTG_DARK, width: 70 },
  contactValue:  { fontSize: 8.5, color: BTG_GREY, flex: 1 },
  // ── Empty state ───────────────────────────────────────────
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#CCC' },
});

// ── About Us Back Page Component ──────────────────────────────
// NOTE: @react-pdf/renderer uses Helvetica which has NO Bengali Unicode support.
// All text in the PDF must be in English/Latin characters only.
const AboutPage = ({ whatsapp }) => (
  <Page size="A4" style={styles.aboutPage}>
    <View style={styles.aboutHeader}>
      <Text style={styles.aboutTitle}>Badol Tyre Ghar — Our Story</Text>
      <Text style={styles.aboutTagline}>Decades of trust, quality, and service.</Text>
    </View>

    <Text style={styles.aboutBody}>
      Badol Tyre Ghar is the most trusted name in tyres and automotive accessories in Rangpur. From a single shop at Thikadarpara Mor, Station Road, Shapla Chattar, we have grown into the region's leading wholesale destination for tubes, tyres, patches, sealants, and repair tools.
    </Text>

    <Text style={styles.aboutBody}>
      Founded by{' '}
      <Text style={styles.aboutBold}>MD. Mostaq Sharker Badol</Text>
      {' '}— a man who has lived and breathed this market since his childhood. He was among the first in the region to establish an official dealership with{' '}
      <Text style={styles.aboutBold}>Force</Text>
      {' '}(now rebranded as{' '}
      <Text style={styles.aboutBold}>Hussain</Text>
      {', a sister concern of Apex International) — at a time when corporate partnerships in this trade were rare.'}
    </Text>

    <Text style={styles.aboutBody}>
      We are now official dealers for:
    </Text>

    <View style={styles.brandsRow}>
      {['Hussain', 'MTF', 'Zess', 'MRF', 'Tourino', 'Rupsha'].map(b => (
        <Text key={b} style={styles.brandChip}>{b}</Text>
      ))}
    </View>

    <Text style={styles.aboutBody}>
      Today,{' '}
      <Text style={styles.aboutBold}>MD. Faiaz Sharker Neloy</Text>
      {" — the founder's only son — carries this legacy forward, combining decades of business wisdom with a modern digital vision. This catalog is a commitment to serve the next generation of dealers with the same integrity, now at the speed of technology."}
    </Text>

    <View style={styles.contactBox}>
      <Text style={styles.contactTitle}>Contact Us</Text>
      <View style={styles.contactRow}>
        <Text style={styles.contactLabel}>Address</Text>
        <Text style={styles.contactValue}>Thikadarpara Mor, Station Road, Shapla Chattar, Rangpur</Text>
      </View>
      <View style={styles.contactRow}>
        <Text style={styles.contactLabel}>WhatsApp</Text>
        <Text style={styles.contactValue}>+{whatsapp || '880XXXXXXXXXX'}</Text>
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
  whatsapp = '',
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
      {/* ── Product Pages ── */}
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.headerTitle}>Badol Tyre Ghar</Text>
            <Text style={styles.headerSub}>{categoryName} — Product Catalog</Text>
          </View>
          <Text style={styles.headerRight}>
            {dateStr}{'\n'}badol-tyre-ghar.vercel.app
          </Text>
        </View>

        {/* Grid */}
        {products.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No products found.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {products.map((p) => {
              const imageUrl = getPdfImageUrl(p.media?.[0]);
              const variant  = p.variants?.[0];
              const size     = p.commonSpecs?.size || '';
              const ply      = variant?.ply || '';
              const brand    = p.brand?.name || '';

              return (
                <View key={p._id} style={styles.card} wrap={false}>
                  <View style={styles.imgBox}>
                    {imageUrl ? (
                      <Image
                        src={{ uri: imageUrl, method: 'GET', headers: {}, body: '' }}
                        style={styles.img}
                        cache={true}
                      />
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
                    <Text style={styles.price}>{formatPrice(variant)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Badol Tyre Ghar · Shapla Chattar, Rangpur
          </Text>
          <Text
            style={styles.pageNum}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>

      {/* ── About Us Back Page ── */}
      <AboutPage whatsapp={whatsapp} />
    </Document>
  );
};

export default CatalogDocument;
